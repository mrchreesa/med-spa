"""Staff notification service."""

import logging

logger = logging.getLogger(__name__)


class InAppNotifier:
    """In-app notification stub. Writes to log for pilot; Sprint 2 adds email/SMS."""

    async def notify_escalation(
        self,
        tenant_id: str,
        escalation_id: str,
        reason: str,
    ) -> None:
        """Notify staff of a new escalation (in-app for pilot)."""
        logger.info(
            "escalation_notification",
            extra={
                "tenant_id": tenant_id,
                "escalation_id": escalation_id,
                "reason": reason,
                "channel": "in_app",
            },
        )

    async def notify_new_lead(
        self,
        tenant_id: str,
        lead_id: str,
        intent: str,
    ) -> None:
        """Notify staff of a new lead capture (in-app for pilot)."""
        logger.info(
            "lead_notification",
            extra={
                "tenant_id": tenant_id,
                "lead_id": lead_id,
                "intent": intent,
                "channel": "in_app",
            },
        )
