"""Dashboard analytics endpoints."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.deps import DbSession, TenantId
from app.models.conversation import Conversation
from app.models.escalation import Escalation, EscalationStatus
from app.models.lead import Lead, LeadStatus

router = APIRouter()


@router.get("/analytics/dashboard")
async def get_dashboard_metrics(
    db: DbSession,
    tenant_id: TenantId,
    days: int = Query(default=30, ge=1, le=365),
) -> dict:
    """Get dashboard analytics metrics for the given time range."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total leads in period
    total_leads_result = await db.execute(
        select(func.count(Lead.id)).where(
            Lead.tenant_id == tenant_id,
            Lead.created_at >= since,
        )
    )
    total_leads = total_leads_result.scalar() or 0

    # Leads today
    leads_today_result = await db.execute(
        select(func.count(Lead.id)).where(
            Lead.tenant_id == tenant_id,
            Lead.created_at >= today_start,
        )
    )
    leads_today = leads_today_result.scalar() or 0

    # Leads by status
    leads_by_status_result = await db.execute(
        select(Lead.status, func.count(Lead.id))
        .where(Lead.tenant_id == tenant_id, Lead.created_at >= since)
        .group_by(Lead.status)
    )
    leads_by_status = {str(row[0].value): row[1] for row in leads_by_status_result.all()}

    # Leads by source
    leads_by_source_result = await db.execute(
        select(Lead.source, func.count(Lead.id))
        .where(Lead.tenant_id == tenant_id, Lead.created_at >= since)
        .group_by(Lead.source)
    )
    leads_by_source = {str(row[0].value): row[1] for row in leads_by_source_result.all()}

    # Active conversations (any in period)
    conversations_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.tenant_id == tenant_id,
            Conversation.created_at >= since,
        )
    )
    total_conversations = conversations_result.scalar() or 0

    # Pending escalations
    pending_escalations_result = await db.execute(
        select(func.count(Escalation.id)).where(
            Escalation.tenant_id == tenant_id,
            Escalation.status == EscalationStatus.PENDING,
        )
    )
    pending_escalations = pending_escalations_result.scalar() or 0

    # Total escalations in period
    total_escalations_result = await db.execute(
        select(func.count(Escalation.id)).where(
            Escalation.tenant_id == tenant_id,
            Escalation.created_at >= since,
        )
    )
    total_escalations = total_escalations_result.scalar() or 0

    # Escalation rate
    escalation_rate = (
        round(total_escalations / total_conversations * 100, 1)
        if total_conversations > 0
        else 0.0
    )

    # Conversion rate (booked / total leads)
    booked_count = leads_by_status.get("booked", 0)
    conversion_rate = (
        round(booked_count / total_leads * 100, 1) if total_leads > 0 else 0.0
    )

    return {
        "period_days": days,
        "total_leads": total_leads,
        "leads_today": leads_today,
        "leads_by_status": leads_by_status,
        "leads_by_source": leads_by_source,
        "total_conversations": total_conversations,
        "pending_escalations": pending_escalations,
        "total_escalations": total_escalations,
        "escalation_rate": escalation_rate,
        "conversion_rate": conversion_rate,
    }
