import logging

from fastapi import APIRouter, HTTPException, Request
from twilio.request_validator import RequestValidator

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _validate_twilio_signature(request: Request, form_data: dict) -> None:
    """Validate Twilio webhook signature using auth token."""
    if not settings.twilio_auth_token:
        logger.warning("twilio_auth_token not set — skipping signature validation")
        return

    signature = request.headers.get("X-Twilio-Signature", "")
    if not signature:
        raise HTTPException(status_code=403, detail="Missing Twilio signature")

    validator = RequestValidator(settings.twilio_auth_token)
    url = str(request.url)
    if not validator.validate(url, form_data, signature):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")


@router.post("/twilio")
async def twilio_webhook(request: Request) -> dict[str, str]:
    """Handle Twilio SMS events."""
    form = await request.form()
    form_data = dict(form)

    _validate_twilio_signature(request, form_data)

    logger.info(
        "twilio_webhook_received",
        extra={"from": form_data.get("From"), "to": form_data.get("To")},
    )

    # TODO: Route inbound SMS to agent or create lead

    return {"status": "received"}
