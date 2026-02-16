from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.models.base import TenantModel


class KnowledgeDocument(TenantModel):
    __tablename__ = "knowledge_documents"

    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    doc_type: Mapped[str] = mapped_column(String, nullable=False)  # faq, treatment_menu, sop
    chunk_index: Mapped[int | None] = mapped_column(default=None)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
