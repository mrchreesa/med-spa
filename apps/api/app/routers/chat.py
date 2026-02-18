"""Chat endpoint with SSE streaming."""

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select

from app.database import async_session_factory
from app.models.conversation import Channel, Conversation
from app.models.tenant import Tenant
from app.schemas.chat import ChatRequest
from app.services.langfuse_client import get_langfuse
from app.services.metrics_collector import MetricsCollector, _metrics_ctx
from app.utils.pii import mask_pii

chat_limiter = Limiter(key_func=get_remote_address)

logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_tenant(tenant_id: str) -> Tenant | None:
    """Look up tenant by clerk_org_id or UUID."""
    async with async_session_factory() as db:
        # Try as clerk_org_id first
        result = await db.execute(
            select(Tenant).where(Tenant.clerk_org_id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if tenant:
            return tenant

        # Try as UUID
        try:
            uid = uuid.UUID(tenant_id)
            result = await db.execute(select(Tenant).where(Tenant.id == uid))
            return result.scalar_one_or_none()
        except ValueError:
            return None


async def _get_or_create_conversation(
    tenant_id: str, conversation_id: str | None
) -> tuple[str, list[dict]]:
    """Get existing conversation or create a new one. Returns (id, transcript)."""
    async with async_session_factory() as db:
        if conversation_id:
            try:
                uid = uuid.UUID(conversation_id)
                result = await db.execute(
                    select(Conversation).where(
                        Conversation.id == uid,
                        Conversation.tenant_id == tenant_id,
                    )
                )
                conv = result.scalar_one_or_none()
                if conv:
                    return str(conv.id), conv.transcript or []
            except ValueError:
                pass

        # Create new conversation
        conv = Conversation(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            channel=Channel.WEB_CHAT,
            transcript=[],
        )
        db.add(conv)
        await db.commit()
        return str(conv.id), []


async def _save_transcript(
    conversation_id: str, transcript: list[dict], lead_id: str | None = None
) -> None:
    """Persist the updated transcript to the conversation."""
    async with async_session_factory() as db:
        uid = uuid.UUID(conversation_id)
        result = await db.execute(
            select(Conversation).where(Conversation.id == uid)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.transcript = transcript
            if lead_id:
                conv.lead_id = uuid.UUID(lead_id)
            await db.commit()


@router.post("/chat")
@chat_limiter.limit("20/minute")
async def create_chat(request: Request, body: ChatRequest) -> StreamingResponse:
    """Create a new chat session with streaming response."""
    # Determine tenant_id: from body (embed widget) or from auth state (dashboard)
    tenant_id = body.tenant_id or getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    # Look up tenant for spa name
    tenant = await _get_tenant(tenant_id)
    spa_name = tenant.name if tenant else "our med spa"

    # Get or create conversation
    conversation_id, transcript = await _get_or_create_conversation(
        tenant_id, body.conversation_id
    )

    # Add user message to transcript
    transcript.append({"role": "user", "content": body.message})

    async def generate():
        from app.agent.graph import build_concierge_graph

        # Set up metrics collector
        collector = MetricsCollector(tenant_id, conversation_id)
        token = _metrics_ctx.set(collector)
        collector.start_run()

        # Set up Langfuse trace if enabled
        langfuse = get_langfuse()
        if langfuse:
            try:
                trace = langfuse.trace(
                    name=f"chat-{conversation_id}",
                    user_id=tenant_id,
                    input=mask_pii(body.message),
                )
                collector.set_langfuse_trace_id(trace.id)
            except Exception:
                logger.debug("Failed to create Langfuse trace", exc_info=True)

        graph = build_concierge_graph()

        initial_state = {
            "messages": transcript,
            "tenant_id": tenant_id,
            "spa_name": spa_name,
            "lead_id": None,
            "conversation_id": conversation_id,
            "should_escalate": False,
            "escalation_reason": None,
            "intent": None,
            "context": "",
            "response": "",
        }

        try:
            # Run the graph (non-streaming for now)
            result = await graph.ainvoke(initial_state)

            response_text = result.get("response", "")
            lead_id = result.get("lead_id")
            was_escalated = result.get("should_escalate", False)
            intent = result.get("intent")

            # Stream the response token by token
            words = response_text.split(" ")
            for i, word in enumerate(words):
                token_str = word if i == 0 else " " + word
                yield f"data: {json.dumps({'type': 'token', 'content': token_str})}\n\n"

            # Add assistant response to transcript
            transcript.append({"role": "assistant", "content": response_text})

            # Save updated transcript
            await _save_transcript(conversation_id, transcript, lead_id)

            # Flush metrics (non-blocking)
            try:
                async with async_session_factory() as metrics_db:
                    await collector.flush(
                        metrics_db,
                        final_node="escalate" if was_escalated else "create_lead",
                        was_escalated=was_escalated,
                        intent_detected=intent,
                        lead_created=lead_id is not None,
                    )
            except Exception:
                logger.exception("Failed to flush metrics")

            # Update Langfuse trace with output
            if langfuse and collector._langfuse_trace_id:
                try:
                    langfuse.trace(
                        id=collector._langfuse_trace_id,
                        output=mask_pii(response_text),
                        metadata={
                            "was_escalated": was_escalated,
                            "intent": intent,
                            "lead_created": lead_id is not None,
                            "total_tokens": collector._total_tokens,
                        },
                    )
                    langfuse.flush()
                except Exception:
                    logger.debug("Failed to finalize Langfuse trace", exc_info=True)

            # Send done event with metadata
            done_data = {
                "type": "done",
                "conversation_id": conversation_id,
                "lead_id": lead_id,
                "escalated": was_escalated,
            }
            yield f"data: {json.dumps(done_data)}\n\n"

        except Exception:
            logger.exception("Chat generation failed")
            error_msg = (
                "I apologize, but I'm having trouble responding right now. "
                "Please try again or contact the spa directly for assistance."
            )
            yield f"data: {json.dumps({'type': 'token', 'content': error_msg})}\n\n"
            yield f"data: {json.dumps({'type': 'error', 'conversation_id': conversation_id})}\n\n"
        finally:
            _metrics_ctx.reset(token)

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/chat/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: ChatRequest,
    request: Request,
) -> StreamingResponse:
    """Send a message in an existing conversation."""
    # Reuse the main chat handler with the conversation_id
    body.conversation_id = conversation_id
    return await create_chat(request, body)
