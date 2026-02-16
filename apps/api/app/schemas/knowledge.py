import uuid
from datetime import datetime

from pydantic import BaseModel


class KnowledgeDocumentCreate(BaseModel):
    title: str
    content: str
    doc_type: str


class KnowledgeDocumentResponse(BaseModel):
    id: uuid.UUID
    tenant_id: str
    title: str
    content: str
    doc_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
