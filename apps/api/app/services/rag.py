"""RAG (Retrieval-Augmented Generation) service."""

import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.knowledge_document import KnowledgeDocument


# --- Text chunking ---

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    length_function=len,
    separators=["\n\n", "\n", ". ", " ", ""],
)


def chunk_text(text_content: str) -> list[str]:
    """Split text into chunks for embedding."""
    return _splitter.split_text(text_content)


# --- Embedding helpers ---


async def _get_embeddings(texts: list[str]) -> list[list[float]]:
    """Get embeddings from the configured provider."""
    if settings.app_env == "production":
        from langchain_aws import BedrockEmbeddings

        embedder = BedrockEmbeddings(
            model_id="amazon.titan-embed-text-v2:0",
            region_name=settings.aws_region,
        )
    else:
        from langchain_openai import OpenAIEmbeddings

        embedder = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=settings.openai_api_key,
        )
    return await embedder.aembed_documents(texts)


async def _get_query_embedding(query: str) -> list[float]:
    """Get embedding for a single query."""
    result = await _get_embeddings([query])
    return result[0]


# --- RAG Service ---


class RAGService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest_document(
        self,
        tenant_id: str,
        title: str,
        content: str,
        doc_type: str,
    ) -> list[KnowledgeDocument]:
        """Chunk, embed, and store a document."""
        chunks = chunk_text(content)
        if not chunks:
            return []

        embeddings = await _get_embeddings(chunks)

        documents = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            doc = KnowledgeDocument(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                title=title,
                content=chunk,
                doc_type=doc_type,
                chunk_index=i,
                embedding=embedding,
            )
            self.db.add(doc)
            documents.append(doc)

        await self.db.flush()
        return documents

    async def search(
        self,
        tenant_id: str,
        query: str,
        top_k: int = 5,
        threshold: float = 0.78,
    ) -> list[dict]:
        """Retrieve relevant document chunks via cosine similarity."""
        query_embedding = await _get_query_embedding(query)

        result = await self.db.execute(
            text("""
                SELECT id, title, content, doc_type, chunk_index,
                       1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
                FROM knowledge_documents
                WHERE tenant_id = :tenant_id
                  AND embedding IS NOT NULL
                  AND (1 - (embedding <=> CAST(:query_embedding AS vector))) >= :threshold
                ORDER BY embedding <=> CAST(:query_embedding AS vector)
                LIMIT :top_k
            """),
            {
                "query_embedding": str(query_embedding),
                "tenant_id": tenant_id,
                "threshold": threshold,
                "top_k": top_k,
            },
        )

        rows = result.fetchall()
        return [
            {
                "id": str(row.id),
                "title": row.title,
                "content": row.content,
                "doc_type": row.doc_type,
                "chunk_index": row.chunk_index,
                "similarity": float(row.similarity),
            }
            for row in rows
        ]

    async def format_context(self, tenant_id: str, query: str) -> str:
        """Search and format results as context for the agent prompt."""
        results = await self.search(tenant_id, query)
        if not results:
            return "No specific information found in the knowledge base for this query."

        context_parts = []
        for r in results:
            context_parts.append(
                f"[{r['doc_type'].upper()}: {r['title']}]\n{r['content']}"
            )
        return "\n\n---\n\n".join(context_parts)

    async def delete_document_chunks(self, tenant_id: str, title: str) -> int:
        """Delete all chunks for a document by title."""
        result = await self.db.execute(
            text("""
                DELETE FROM knowledge_documents
                WHERE tenant_id = :tenant_id AND title = :title
            """),
            {"tenant_id": tenant_id, "title": title},
        )
        await self.db.flush()
        return result.rowcount
