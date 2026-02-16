import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.escalation import EscalationReason, EscalationStatus


class EscalationCreate(BaseModel):
    conversation_id: uuid.UUID
    reason: EscalationReason
    notes: str | None = None


class EscalationUpdate(BaseModel):
    status: EscalationStatus | None = None
    notes: str | None = None
    assigned_to: str | None = None


class EscalationResponse(BaseModel):
    id: uuid.UUID
    tenant_id: str
    conversation_id: uuid.UUID
    reason: EscalationReason
    status: EscalationStatus
    notes: str | None
    assigned_to: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedEscalationResponse(BaseModel):
    items: list[EscalationResponse]
    total_count: int
