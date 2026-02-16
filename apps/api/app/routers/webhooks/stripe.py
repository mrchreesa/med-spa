import logging

import stripe
from fastapi import APIRouter, HTTPException, Request

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/stripe")
async def stripe_webhook(request: Request) -> dict[str, str]:
    """Handle Stripe subscription events."""
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    if settings.stripe_webhook_secret:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.stripe_webhook_secret
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=403, detail="Invalid Stripe signature")
    else:
        logger.warning("stripe_webhook_secret not set — skipping signature validation")
        import json

        event = json.loads(payload)

    event_type = event.get("type") if isinstance(event, dict) else event.type
    logger.info("stripe_webhook_received", extra={"type": event_type})

    # TODO: Handle subscription.created, subscription.updated, subscription.deleted

    return {"status": "received"}
