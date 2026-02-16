"""Lead management service."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead, LeadIntent, LeadSource, LeadStatus


class LeadService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_lead(
        self,
        tenant_id: str,
        source: str,
        intent: str | None = None,
        summary: str | None = None,
        urgency: int = 2,
        name: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        conversation_id: str | None = None,
    ) -> Lead:
        """Create a new lead from conversation data."""
        lead = Lead(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            source=LeadSource(source),
            status=LeadStatus.NEW,
            intent=LeadIntent(intent) if intent else None,
            summary=summary,
            urgency=urgency,
            name=name,
            phone=phone,
            email=email,
            extra_data={"conversation_id": conversation_id} if conversation_id else None,
        )
        self.db.add(lead)
        await self.db.flush()
        return lead

    async def update_lead(
        self,
        tenant_id: str,
        lead_id: str,
        intent: str | None = None,
        summary: str | None = None,
        urgency: int | None = None,
        status: str | None = None,
        name: str | None = None,
        phone: str | None = None,
        email: str | None = None,
    ) -> Lead | None:
        """Update an existing lead."""
        uid = uuid.UUID(lead_id)
        result = await self.db.execute(
            select(Lead).where(Lead.id == uid, Lead.tenant_id == tenant_id)
        )
        lead = result.scalar_one_or_none()
        if not lead:
            return None

        if intent is not None:
            lead.intent = LeadIntent(intent)
        if summary is not None:
            lead.summary = summary
        if urgency is not None:
            lead.urgency = urgency
        if status is not None:
            lead.status = LeadStatus(status)
        if name is not None:
            lead.name = name
        if phone is not None:
            lead.phone = phone
        if email is not None:
            lead.email = email

        await self.db.flush()
        return lead

    async def get_lead(self, tenant_id: str, lead_id: str) -> Lead | None:
        """Get a lead by ID."""
        uid = uuid.UUID(lead_id)
        result = await self.db.execute(
            select(Lead).where(Lead.id == uid, Lead.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def list_leads(
        self,
        tenant_id: str,
        status: str | None = None,
        source: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Lead]:
        """Query leads with optional filters."""
        query = (
            select(Lead)
            .where(Lead.tenant_id == tenant_id)
            .order_by(Lead.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status:
            query = query.where(Lead.status == LeadStatus(status))
        if source:
            query = query.where(Lead.source == LeadSource(source))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_leads(
        self,
        tenant_id: str,
        status: str | None = None,
        source: str | None = None,
    ) -> int:
        """Count leads with optional filters (for pagination)."""
        query = select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id)
        if status:
            query = query.where(Lead.status == LeadStatus(status))
        if source:
            query = query.where(Lead.source == LeadSource(source))
        result = await self.db.execute(query)
        return result.scalar_one()
