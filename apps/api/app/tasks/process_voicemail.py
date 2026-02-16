"""Celery task for processing voicemail transcripts."""

from app.tasks.celery_app import celery_app


@celery_app.task(name="process_voicemail")
def process_voicemail(conversation_id: str) -> dict[str, str]:
    """Process a voicemail transcript.

    Pipeline:
    1. Fetch transcript from DB by conversation_id (NOT passed in payload)
    2. Classify intent using Claude Sonnet
    3. Generate summary using Claude Haiku
    4. Create/update lead record
    5. Notify staff
    6. Auto-reply SMS to patient
    """
    # TODO: Implement
    return {"status": "processed", "conversation_id": conversation_id}
