"""Celery task for knowledge base document ingestion."""

from app.tasks.celery_app import celery_app


@celery_app.task(name="document_ingestion")
def ingest_document(document_id: str) -> dict[str, str]:
    """Process and embed a knowledge base document.

    Pipeline:
    1. Fetch document from DB by ID
    2. Chunk text (512 tokens, 50-token overlap)
    3. Embed chunks via OpenAI text-embedding-3-small
    4. Store embeddings in pgvector
    """
    # TODO: Implement
    return {"status": "ingested", "document_id": document_id}
