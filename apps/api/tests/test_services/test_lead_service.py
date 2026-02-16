"""Tests for lead service."""

import pytest

from app.models.lead import LeadIntent, LeadSource, LeadStatus
from app.services.lead_service import LeadService


@pytest.mark.asyncio
async def test_create_lead(db, tenant_id):
    service = LeadService(db)
    lead = await service.create_lead(
        tenant_id=tenant_id,
        source="web_chat",
        intent="appointment",
        summary="Wants Botox consultation",
        urgency=3,
    )
    assert lead.id is not None
    assert lead.tenant_id == tenant_id
    assert lead.source == LeadSource.WEB_CHAT
    assert lead.status == LeadStatus.NEW
    assert lead.intent == LeadIntent.APPOINTMENT
    assert lead.urgency == 3


@pytest.mark.asyncio
async def test_create_lead_with_contact_info(db, tenant_id):
    service = LeadService(db)
    lead = await service.create_lead(
        tenant_id=tenant_id,
        source="phone",
        name="Jane Doe",
        phone="555-1234",
        email="jane@example.com",
    )
    assert lead.name == "Jane Doe"
    assert lead.phone == "555-1234"
    assert lead.email == "jane@example.com"


@pytest.mark.asyncio
async def test_create_lead_with_conversation_id(db, tenant_id):
    service = LeadService(db)
    lead = await service.create_lead(
        tenant_id=tenant_id,
        source="web_chat",
        conversation_id="conv-123",
    )
    assert lead.extra_data == {"conversation_id": "conv-123"}


@pytest.mark.asyncio
async def test_update_lead(db, tenant_id, lead):
    service = LeadService(db)
    updated = await service.update_lead(
        tenant_id=tenant_id,
        lead_id=str(lead.id),
        status="contacted",
        summary="Updated summary",
        urgency=4,
    )
    assert updated is not None
    assert updated.status == LeadStatus.CONTACTED
    assert updated.summary == "Updated summary"
    assert updated.urgency == 4


@pytest.mark.asyncio
async def test_update_lead_not_found(db, tenant_id):
    service = LeadService(db)
    result = await service.update_lead(
        tenant_id=tenant_id,
        lead_id="00000000-0000-0000-0000-000000000000",
        status="contacted",
    )
    assert result is None


@pytest.mark.asyncio
async def test_get_lead(db, tenant_id, lead):
    service = LeadService(db)
    found = await service.get_lead(tenant_id=tenant_id, lead_id=str(lead.id))
    assert found is not None
    assert found.id == lead.id


@pytest.mark.asyncio
async def test_list_leads(db, tenant_id, lead):
    service = LeadService(db)
    leads = await service.list_leads(tenant_id=tenant_id)
    assert len(leads) == 1
    assert leads[0].id == lead.id


@pytest.mark.asyncio
async def test_list_leads_with_status_filter(db, tenant_id, lead):
    service = LeadService(db)
    leads = await service.list_leads(tenant_id=tenant_id, status="new")
    assert len(leads) == 1

    leads = await service.list_leads(tenant_id=tenant_id, status="booked")
    assert len(leads) == 0


@pytest.mark.asyncio
async def test_list_leads_pagination(db, tenant_id, lead):
    service = LeadService(db)
    leads = await service.list_leads(tenant_id=tenant_id, limit=1, offset=0)
    assert len(leads) == 1

    leads = await service.list_leads(tenant_id=tenant_id, limit=1, offset=1)
    assert len(leads) == 0
