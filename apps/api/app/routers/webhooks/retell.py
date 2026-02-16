import logging

from fastapi import APIRouter, Request

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/retell")
async def retell_webhook(request: Request) -> dict[str, str]:
    """Handle Retell AI call events (voicemail transcripts, call status)."""
    body = await request.json()
    logger.info("retell_webhook_received", extra={"event_type": body.get("event")})

    # TODO: Validate Retell webhook signature
    # TODO: Route to Celery task for processing
    # event types: call_started, call_ended, voicemail_received, etc.

    return {"status": "received"}
