"""Lead creation tool for the LangGraph agent."""

from langchain_core.tools import tool

from app.database import async_session_factory
from app.services.lead_service import LeadService


@tool
async def create_lead(
    tenant_id: str,
    intent: str,
    summary: str,
    urgency: int = 2,
    conversation_id: str | None = None,
) -> str:
    """Create a lead from a patient conversation. Call this after the first meaningful interaction.

    Args:
        tenant_id: The tenant identifier for the spa.
        intent: One of: appointment, pricing, treatment_info, complaint, general, emergency.
        summary: A one-sentence summary of what the patient wants.
        urgency: 1-5 scale (1=low, 5=critical).
        conversation_id: The conversation ID to link this lead to.

    Returns:
        The created lead ID.
    """
    async with async_session_factory() as db:
        service = LeadService(db)
        lead = await service.create_lead(
            tenant_id=tenant_id,
            source="web_chat",
            intent=intent,
            summary=summary,
            urgency=urgency,
            conversation_id=conversation_id,
        )
        await db.commit()
        return str(lead.id)
