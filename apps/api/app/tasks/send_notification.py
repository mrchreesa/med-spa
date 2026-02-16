"""Celery task for sending staff notifications."""

from app.tasks.celery_app import celery_app


@celery_app.task(name="send_notification")
def send_notification(notification_type: str, entity_id: str) -> dict[str, str]:
    """Send a notification to staff members.

    Only entity IDs in payload -- fetch details from DB at execution time.
    """
    # TODO: Implement
    return {"status": "sent", "type": notification_type}
