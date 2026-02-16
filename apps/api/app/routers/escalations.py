"""Escalation management endpoints."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.deps import DbSession, TenantId
from app.models.escalation import Escalation, EscalationStatus
from app.schemas.escalation import (
    EscalationCreate,
    EscalationResponse,
    EscalationUpdate,
    PaginatedEscalationResponse,
)

router = APIRouter()


@router.get("/escalations", response_model=PaginatedEscalationResponse)
async def list_escalations(
    db: DbSession,
    tenant_id: TenantId,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> PaginatedEscalationResponse:
    """List escalations for the current tenant."""
    query = (
        select(Escalation)
        .where(Escalation.tenant_id == tenant_id)
        .order_by(Escalation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    count_query = select(func.count(Escalation.id)).where(
        Escalation.tenant_id == tenant_id
    )
    if status:
        query = query.where(Escalation.status == EscalationStatus(status))
        count_query = count_query.where(Escalation.status == EscalationStatus(status))

    result = await db.execute(query)
    escalations = result.scalars().all()

    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    return PaginatedEscalationResponse(
        items=[EscalationResponse.model_validate(e) for e in escalations],
        total_count=total,
    )


@router.post("/escalations", response_model=EscalationResponse)
async def create_escalation(
    body: EscalationCreate,
    db: DbSession,
    tenant_id: TenantId,
) -> EscalationResponse:
    """Create an escalation from a conversation."""
    escalation = Escalation(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        conversation_id=body.conversation_id,
        reason=body.reason,
        status=EscalationStatus.PENDING,
        notes=body.notes,
    )
    db.add(escalation)
    await db.commit()
    await db.refresh(escalation)
    return EscalationResponse.model_validate(escalation)


@router.patch("/escalations/{escalation_id}", response_model=EscalationResponse)
async def update_escalation(
    escalation_id: str,
    body: EscalationUpdate,
    db: DbSession,
    tenant_id: TenantId,
) -> EscalationResponse:
    """Update escalation status."""
    uid = uuid.UUID(escalation_id)
    result = await db.execute(
        select(Escalation).where(
            Escalation.id == uid,
            Escalation.tenant_id == tenant_id,
        )
    )
    escalation = result.scalar_one_or_none()
    if not escalation:
        raise HTTPException(status_code=404, detail="Escalation not found")

    if body.status is not None:
        escalation.status = body.status
    if body.notes is not None:
        escalation.notes = body.notes
    if body.assigned_to is not None:
        escalation.assigned_to = body.assigned_to

    await db.commit()
    await db.refresh(escalation)
    return EscalationResponse.model_validate(escalation)
