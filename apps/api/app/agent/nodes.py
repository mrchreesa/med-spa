"""LangGraph node implementations."""

import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.agent.prompts.system import CONCIERGE_SYSTEM_PROMPT
from app.config import settings

logger = logging.getLogger(__name__)

# Escalation keyword patterns (fast, deterministic first-pass)
_EMERGENCY_PATTERNS = re.compile(
    r"(allergic reaction|can'?t breathe|difficulty breathing|severe swelling|"
    r"chest pain|call 911|emergency|anaphyla|heart attack|seizure|"
    r"severe bleeding|loss of consciousness)",
    re.IGNORECASE,
)

_MEDICAL_ADVICE_PATTERNS = re.compile(
    r"(is it safe to|should i|side effects? of|am i a (good )?candidate|"
    r"safe (during|while|if|for)|contraindication|interact(ion)? with|"
    r"pregnant|pregnancy|breastfeed|nursing|medical (condition|history)|"
    r"taking medication|blood thinner|autoimmune|infection|"
    r"drooping|eyelid|complication|adverse|reaction after|swelling after|"
    r"pain after|bruising (that|won'?t)|lump|hard|nodule)",
    re.IGNORECASE,
)

_HUMAN_REQUEST_PATTERNS = re.compile(
    r"(speak to (a |some)?(real )?(person|human|someone|staff|doctor|nurse|provider)|"
    r"talk to (a |some)?(real )?(person|human|someone|staff|doctor|nurse|provider)|"
    r"real (person|human)|human (please|help)|"
    r"connect me|transfer me|can i call|phone number)",
    re.IGNORECASE,
)

_COMPLAINT_PATTERNS = re.compile(
    r"(terrible experience|horrible|worst|never coming back|sue|lawyer|"
    r"report you|file a complaint|malpractice|ruined|damaged|botched)",
    re.IGNORECASE,
)

# Safe response templates for escalation
_ESCALATION_RESPONSES = {
    "emergency": (
        "I'm concerned about what you're describing. If you're experiencing a medical emergency, "
        "please call 911 immediately. For urgent but non-emergency concerns related to a recent "
        "treatment, please contact the spa directly so a licensed provider can assist you."
    ),
    "medical_question": (
        "That's a great question, and I want to make sure you get the most accurate answer. "
        "Medical questions like this are best answered by our licensed providers who can consider "
        "your individual health profile. I've flagged this for our team, and someone will follow "
        "up with you. In the meantime, is there anything else I can help with regarding our "
        "services, pricing, or scheduling?"
    ),
    "complaint": (
        "I'm truly sorry to hear about your experience. Your feedback is very important to us, "
        "and I want to make sure the right person addresses your concerns. I've escalated this "
        "to our team, and a staff member will reach out to you directly to resolve this. "
        "Is there anything specific you'd like me to note for them?"
    ),
    "patient_request": (
        "Absolutely, I'll make sure a team member gets back to you. I've noted your request "
        "and someone from our staff will be in touch. Is there a preferred time or way to "
        "reach you?"
    ),
    "ai_unsure": (
        "I want to make sure I give you accurate information, so I'm going to have one of our "
        "team members follow up with you on this. They'll be able to provide the detailed "
        "answer you need. Is there anything else I can help with in the meantime?"
    ),
}


def _get_llm():
    """Get the LLM instance based on environment."""
    if settings.app_env == "production":
        from langchain_aws import ChatBedrockConverse

        return ChatBedrockConverse(
            model=settings.bedrock_model_id_fast,
            region_name=settings.aws_region,
        )
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        max_tokens=1024,
    )


def _get_smart_llm():
    """Get the smarter LLM for classification tasks."""
    if settings.app_env == "production":
        from langchain_aws import ChatBedrockConverse

        return ChatBedrockConverse(
            model=settings.bedrock_model_id_smart,
            region_name=settings.aws_region,
        )
    return ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=256,
    )


async def search_knowledge_node(state: dict) -> dict:
    """Retrieve relevant knowledge base content for the user's query."""
    # Import here to avoid circular imports
    from app.database import async_session_factory
    from app.services.rag import RAGService

    messages = state.get("messages", [])
    if not messages:
        return {"context": "No query provided."}

    # Get the latest user message
    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "")
            break

    if not last_user_msg:
        return {"context": "No user message found."}

    tenant_id = state.get("tenant_id", "")
    if not tenant_id:
        return {"context": "No tenant context available."}

    async with async_session_factory() as db:
        rag = RAGService(db)
        context = await rag.format_context(tenant_id, last_user_msg)

    return {"context": context}


async def generate_response_node(state: dict) -> dict:
    """Generate the AI response using RAG context and conversation history."""
    spa_name = state.get("spa_name", "our med spa")
    context = state.get("context", "No information available.")
    messages = state.get("messages", [])

    system_prompt = CONCIERGE_SYSTEM_PROMPT.format(
        spa_name=spa_name,
        context=context,
    )

    # Build message list for LLM
    llm_messages = [SystemMessage(content=system_prompt)]
    for msg in messages:
        if msg["role"] == "user":
            llm_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            from langchain_core.messages import AIMessage

            llm_messages.append(AIMessage(content=msg["content"]))

    llm = _get_llm()
    response = await llm.ainvoke(llm_messages)
    response_text = response.content

    return {"response": response_text}


async def check_escalation_node(state: dict) -> dict:
    """Check if the conversation requires escalation."""
    messages = state.get("messages", [])
    if not messages:
        return {"should_escalate": False, "escalation_reason": None}

    # Get latest user message
    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "")
            break

    if not last_user_msg:
        return {"should_escalate": False, "escalation_reason": None}

    # Layer 1: Keyword/pattern matching (fast, deterministic)
    if _EMERGENCY_PATTERNS.search(last_user_msg):
        return {"should_escalate": True, "escalation_reason": "emergency"}

    if _COMPLAINT_PATTERNS.search(last_user_msg):
        return {"should_escalate": True, "escalation_reason": "complaint"}

    if _HUMAN_REQUEST_PATTERNS.search(last_user_msg):
        return {"should_escalate": True, "escalation_reason": "patient_request"}

    if _MEDICAL_ADVICE_PATTERNS.search(last_user_msg):
        return {"should_escalate": True, "escalation_reason": "medical_question"}

    # Layer 2: LLM classification for subtle cases
    try:
        llm = _get_llm()
        classification_prompt = (
            "You are a medical safety classifier for a med spa AI chatbot. "
            "Analyze the following patient message and classify it as one of:\n"
            "- SAFE: General inquiry about services, pricing, scheduling, etc.\n"
            "- MEDICAL: Patient is asking for medical advice, diagnosis, or "
            "describing symptoms that need professional attention.\n"
            "- ESCALATE: Patient needs human attention for other reasons.\n\n"
            f"Patient message: {last_user_msg}\n\n"
            "Respond with ONLY one word: SAFE, MEDICAL, or ESCALATE."
        )
        result = await llm.ainvoke([HumanMessage(content=classification_prompt)])
        classification = result.content.strip().upper()

        if classification == "MEDICAL":
            return {"should_escalate": True, "escalation_reason": "medical_question"}
        elif classification == "ESCALATE":
            return {"should_escalate": True, "escalation_reason": "ai_unsure"}
    except Exception:
        logger.exception("LLM escalation classification failed")

    return {"should_escalate": False, "escalation_reason": None}


async def escalate_node(state: dict) -> dict:
    """Handle escalation — create record and return safe response."""
    from app.database import async_session_factory
    from app.services.notification import InAppNotifier

    reason = state.get("escalation_reason", "ai_unsure")
    conversation_id = state.get("conversation_id")
    tenant_id = state.get("tenant_id", "")

    # Get the safe response template
    safe_response = _ESCALATION_RESPONSES.get(reason, _ESCALATION_RESPONSES["ai_unsure"])

    # Create escalation record if we have a conversation
    if conversation_id and tenant_id:
        try:
            from app.models.escalation import Escalation, EscalationReason, EscalationStatus
            import uuid

            reason_enum = EscalationReason(reason)

            async with async_session_factory() as db:
                escalation = Escalation(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    conversation_id=uuid.UUID(conversation_id),
                    reason=reason_enum,
                    status=EscalationStatus.PENDING,
                    notes=f"Auto-escalated during chat. Last user message triggered {reason} detection.",
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
        except Exception:
            logger.exception("Failed to create escalation record")

    # Override the generated response with the safe template
    return {"response": safe_response, "should_escalate": True}


async def create_lead_node(state: dict) -> dict:
    """Create or update a lead from the conversation."""
    from app.database import async_session_factory
    from app.services.lead_service import LeadService

    tenant_id = state.get("tenant_id", "")
    conversation_id = state.get("conversation_id")
    lead_id = state.get("lead_id")
    messages = state.get("messages", [])

    if not tenant_id or not messages:
        return {}

    # Only create lead on substantive interactions (not just "hi")
    user_messages = [m for m in messages if m.get("role") == "user"]
    if not user_messages:
        return {}

    last_msg = user_messages[-1].get("content", "")
    if len(last_msg.strip()) < 10:
        return {}

    # Use LLM to classify intent and generate summary
    try:
        llm = _get_llm()
        classify_prompt = (
            "Analyze this patient message from a med spa chat and respond in exactly this format:\n"
            "INTENT: <one of: appointment, pricing, treatment_info, complaint, general, emergency>\n"
            "URGENCY: <1-5 where 1=low, 5=critical>\n"
            "SUMMARY: <one sentence summary of what the patient wants>\n\n"
            f"Patient message: {last_msg}"
        )
        result = await llm.ainvoke([HumanMessage(content=classify_prompt)])
        text = result.content

        # Parse response
        intent = "general"
        urgency = 2
        summary = last_msg[:100]

        for line in text.strip().split("\n"):
            line = line.strip()
            if line.upper().startswith("INTENT:"):
                intent_val = line.split(":", 1)[1].strip().lower()
                if intent_val in ("appointment", "pricing", "treatment_info", "complaint", "general", "emergency"):
                    intent = intent_val
            elif line.upper().startswith("URGENCY:"):
                try:
                    urgency = min(5, max(1, int(line.split(":", 1)[1].strip()[0])))
                except (ValueError, IndexError):
                    pass
            elif line.upper().startswith("SUMMARY:"):
                summary = line.split(":", 1)[1].strip()

        # Create or update lead
        async with async_session_factory() as db:
            lead_service = LeadService(db)
            if lead_id:
                lead = await lead_service.update_lead(
                    tenant_id=tenant_id,
                    lead_id=lead_id,
                    intent=intent,
                    summary=summary,
                    urgency=urgency,
                )
            else:
                lead = await lead_service.create_lead(
                    tenant_id=tenant_id,
                    source="web_chat",
                    intent=intent,
                    summary=summary,
                    urgency=urgency,
                    conversation_id=conversation_id,
                )
            await db.commit()
            if lead:
                return {"lead_id": str(lead.id), "intent": intent}
    except Exception:
        logger.exception("Failed to create/update lead")

    return {}
