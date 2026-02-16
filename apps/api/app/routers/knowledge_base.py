"""Knowledge base document management endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlalchemy import select

from app.deps import DbSession, TenantId
from app.models.knowledge_document import KnowledgeDocument
from app.schemas.knowledge import KnowledgeDocumentResponse
from app.services.rag import RAGService

router = APIRouter()


@router.get("/knowledge-base", response_model=list[KnowledgeDocumentResponse])
async def list_documents(
    db: DbSession,
    tenant_id: TenantId,
) -> list[KnowledgeDocumentResponse]:
    """List knowledge base documents (grouped by title)."""
    # Get distinct documents by title (not individual chunks)
    result = await db.execute(
        select(KnowledgeDocument)
        .where(
            KnowledgeDocument.tenant_id == tenant_id,
            KnowledgeDocument.chunk_index == 0,
        )
        .order_by(KnowledgeDocument.created_at.desc())
    )
    docs = result.scalars().all()
    return [KnowledgeDocumentResponse.model_validate(d) for d in docs]


@router.post("/knowledge-base", response_model=KnowledgeDocumentResponse)
async def upload_document(
    db: DbSession,
    tenant_id: TenantId,
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_type: str = Form("faq"),
) -> KnowledgeDocumentResponse:
    """Upload and embed a knowledge base document (PDF or text)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File is required")

    # Read file content with size limit (10MB)
    max_size = 10 * 1024 * 1024
    raw_bytes = await file.read()
    if len(raw_bytes) > max_size:
        raise HTTPException(
            status_code=413, detail="File too large. Maximum size is 10MB."
        )

    if file.filename.lower().endswith(".pdf"):
        # Extract text from PDF
        try:
            from PyPDF2 import PdfReader
            import io

            reader = PdfReader(io.BytesIO(raw_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            content = "\n\n".join(pages)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to parse PDF: {e}"
            )
    else:
        # Plain text / markdown
        content = raw_bytes.decode("utf-8", errors="replace")

    if not content.strip():
        raise HTTPException(status_code=400, detail="Document is empty")

    # Chunk, embed, and store
    rag = RAGService(db)
    documents = await rag.ingest_document(
        tenant_id=tenant_id,
        title=title,
        content=content,
        doc_type=doc_type,
    )
    await db.commit()

    if not documents:
        raise HTTPException(status_code=400, detail="No content could be extracted")

    # Return the first chunk as the document representation
    return KnowledgeDocumentResponse.model_validate(documents[0])


@router.delete("/knowledge-base/{document_title}")
async def delete_document(
    document_title: str,
    db: DbSession,
    tenant_id: TenantId,
) -> dict[str, str]:
    """Delete all chunks of a knowledge base document by title."""
    rag = RAGService(db)
    count = await rag.delete_document_chunks(tenant_id, document_title)
    await db.commit()
    if count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "chunks_removed": str(count)}
