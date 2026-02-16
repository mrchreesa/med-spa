import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.conversation import Channel


class MessageCreate(BaseModel):
    content: str


class ConversationResponse(BaseModel):
    id: uuid.UUID
    tenant_id: str
    lead_id: uuid.UUID | None
    channel: Channel
    transcript: list[dict]
    summary: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedConversationResponse(BaseModel):
    items: list[ConversationResponse]
    total_count: int
