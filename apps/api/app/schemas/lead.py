import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.lead import LeadIntent, LeadSource, LeadStatus


class LeadCreate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    source: LeadSource
    intent: LeadIntent | None = None
    summary: str | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    status: LeadStatus | None = None
    intent: LeadIntent | None = None
    summary: str | None = None
    urgency: int | None = None


class LeadResponse(BaseModel):
    id: uuid.UUID
    tenant_id: str
    name: str | None
    phone: str | None
    email: str | None
    source: LeadSource
    status: LeadStatus
    intent: LeadIntent | None
    summary: str | None
    urgency: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedLeadResponse(BaseModel):
    items: list[LeadResponse]
    total_count: int
