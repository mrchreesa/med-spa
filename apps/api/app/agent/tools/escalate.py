"""Escalation tool for the LangGraph agent."""

import uuid

from langchain_core.tools import tool

from app.database import async_session_factory
from app.models.escalation import Escalation, EscalationReason, EscalationStatus
from app.services.notification import InAppNotifier


@tool
async def escalate_conversation(
    tenant_id: str,
    conversation_id: str,
    reason: str,
    notes: str | None = None,
) -> str:
    """Escalate a conversation to human staff.

    Args:
        tenant_id: The tenant identifier.
        conversation_id: The conversation to escalate.
        reason: One of: medical_question, complaint, emergency, ai_unsure, patient_request.
        notes: Optional notes about why the escalation was triggered.

    Returns:
        The created escalation ID.
    """
    async with async_session_factory() as db:
        escalation = Escalation(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            conversation_id=uuid.UUID(conversation_id),
            reason=EscalationReason(reason),
            status=EscalationStatus.PENDING,
            notes=notes,
        )
        db.add(escalation)
        await db.commit()

        # Send in-app notification
        notifier = InAppNotifier()
        await notifier.notify_escalation(
            tenant_id=tenant_id,
            escalation_id=str(escalation.id),
            reason=reason,
        )

        return str(escalation.id)
