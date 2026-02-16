"""Leads CRUD endpoints for the staff dashboard."""

from fastapi import APIRouter, HTTPException

from app.deps import DbSession, TenantId
from app.schemas.lead import LeadResponse, LeadUpdate, PaginatedLeadResponse
from app.services.lead_service import LeadService

router = APIRouter()


@router.get("/leads", response_model=PaginatedLeadResponse)
async def list_leads(
    db: DbSession,
    tenant_id: TenantId,
    status: str | None = None,
    source: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> PaginatedLeadResponse:
    """List leads for the current tenant."""
    service = LeadService(db)
    leads = await service.list_leads(
        tenant_id=tenant_id,
        status=status,
        source=source,
        limit=limit,
        offset=offset,
    )
    total = await service.count_leads(
        tenant_id=tenant_id,
        status=status,
        source=source,
    )
    return PaginatedLeadResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        total_count=total,
    )


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: DbSession, tenant_id: TenantId) -> LeadResponse:
    """Get a specific lead."""
    service = LeadService(db)
    lead = await service.get_lead(tenant_id=tenant_id, lead_id=lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse.model_validate(lead)


@router.patch("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str, body: LeadUpdate, db: DbSession, tenant_id: TenantId
) -> LeadResponse:
    """Update a lead's status or details."""
    service = LeadService(db)
    lead = await service.update_lead(
        tenant_id=tenant_id,
        lead_id=lead_id,
        status=body.status.value if body.status else None,
        intent=body.intent.value if body.intent else None,
        summary=body.summary,
        urgency=body.urgency,
        name=body.name,
        phone=body.phone,
        email=body.email,
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)
