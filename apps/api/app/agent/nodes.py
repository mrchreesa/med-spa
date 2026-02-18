"""LangGraph node implementations."""

import logging
import re
import time

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.agent.instrumented_llm import instrumented_ainvoke
from app.agent.prompts.system import CONCIERGE_SYSTEM_PROMPT
from app.config import settings
from app.services.metrics_collector import get_collector

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
    """Get the fast LLM instance (gpt-4o-mini)."""
    return ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        max_tokens=1024,
    )


def _get_smart_llm():
    """Get the smarter LLM for classification tasks (gpt-4o)."""
    return ChatOpenAI(
        model="gpt-4o",
        api_key=settings.openai_api_key,
        max_tokens=256,
    )


async def search_knowledge_node(state: dict) -> dict:
    """Retrieve relevant knowledge base content for the user's query."""
    from app.database import async_session_factory
    from app.services.rag import RAGService

    collector = get_collector()
    if collector:
        collector.start_node("search_knowledge")

    messages = state.get("messages", [])
    if not messages:
        if collector:
            collector.end_node("search_knowledge")
        return {"context": "No query provided."}

    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "")
            break

    if not last_user_msg:
        if collector:
            collector.end_node("search_knowledge")
        return {"context": "No user message found."}

    tenant_id = state.get("tenant_id", "")
    if not tenant_id:
        if collector:
            collector.end_node("search_knowledge")
        return {"context": "No tenant context available."}

    async with async_session_factory() as db:
        rag = RAGService(db)
        context, rag_stats = await rag.search_with_stats(tenant_id, last_user_msg)

        if collector and rag_stats:
            collector.record_rag_retrieval(
                query_text=last_user_msg,
                chunks_returned=rag_stats["chunks_returned"],
                chunks_above_threshold=rag_stats["chunks_above_threshold"],
                avg_similarity=rag_stats.get("avg_similarity"),
                max_similarity=rag_stats.get("max_similarity"),
                min_similarity=rag_stats.get("min_similarity"),
                threshold_used=rag_stats.get("threshold_used", 0.78),
                embedding_latency_ms=rag_stats.get("embedding_latency_ms", 0),
                search_latency_ms=rag_stats.get("search_latency_ms", 0),
                total_latency_ms=rag_stats.get("total_latency_ms", 0),
            )

    if collector:
        collector.end_node("search_knowledge")

    return {"context": context}


async def generate_response_node(state: dict) -> dict:
    """Generate the AI response using RAG context and conversation history."""
    collector = get_collector()
    if collector:
        collector.start_node("generate_response")

    spa_name = state.get("spa_name", "our med spa")
    context = state.get("context", "No information available.")
    messages = state.get("messages", [])

    system_prompt = CONCIERGE_SYSTEM_PROMPT.format(
        spa_name=spa_name,
        context=context,
    )

    llm_messages = [SystemMessage(content=system_prompt)]
    for msg in messages:
        if msg["role"] == "user":
            llm_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            from langchain_core.messages import AIMessage
            llm_messages.append(AIMessage(content=msg["content"]))

    llm = _get_llm()
    response = await instrumented_ainvoke(llm, llm_messages, "generate_response")
    response_text = response.content

    if collector:
        collector.end_node("generate_response")

    return {"response": response_text}


async def check_escalation_node(state: dict) -> dict:
    """Check if the conversation requires escalation."""
    collector = get_collector()
    if collector:
        collector.start_node("check_escalation")

    escalation_start = time.perf_counter()
    messages = state.get("messages", [])
    if not messages:
        if collector:
            collector.end_node("check_escalation")
        return {"should_escalate": False, "escalation_reason": None}

    last_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "")
            break

    if not last_user_msg:
        if collector:
            collector.end_node("check_escalation")
        return {"should_escalate": False, "escalation_reason": None}

    # Layer 1: Keyword/pattern matching (fast, deterministic)
    pattern_checks = [
        (_EMERGENCY_PATTERNS, "emergency", "emergency"),
        (_COMPLAINT_PATTERNS, "complaint", "complaint"),
        (_HUMAN_REQUEST_PATTERNS, "patient_request", "human_request"),
        (_MEDICAL_ADVICE_PATTERNS, "medical_question", "medical_advice"),
    ]

    for pattern, reason, pattern_name in pattern_checks:
        match = pattern.search(last_user_msg)
        if match:
            latency = int((time.perf_counter() - escalation_start) * 1000)
            if collector:
                collector.record_escalation_decision(
                    detection_method="regex",
                    should_escalate=True,
                    pattern_matched=pattern_name,
                    escalation_reason=reason,
                    latency_ms=latency,
                )
                collector.end_node("check_escalation")
            return {"should_escalate": True, "escalation_reason": reason}

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
        result = await instrumented_ainvoke(
            llm, [HumanMessage(content=classification_prompt)], "check_escalation"
        )
        classification = result.content.strip().upper()

        latency = int((time.perf_counter() - escalation_start) * 1000)

        if classification == "MEDICAL":
            if collector:
                collector.record_escalation_decision(
                    detection_method="llm",
                    should_escalate=True,
                    llm_classification="MEDICAL",
                    escalation_reason="medical_question",
                    latency_ms=latency,
                )
                collector.end_node("check_escalation")
            return {"should_escalate": True, "escalation_reason": "medical_question"}
        elif classification == "ESCALATE":
            if collector:
                collector.record_escalation_decision(
                    detection_method="llm",
                    should_escalate=True,
                    llm_classification="ESCALATE",
                    escalation_reason="ai_unsure",
                    latency_ms=latency,
                )
                collector.end_node("check_escalation")
            return {"should_escalate": True, "escalation_reason": "ai_unsure"}
        else:
            if collector:
                collector.record_escalation_decision(
                    detection_method="llm",
                    should_escalate=False,
                    llm_classification=classification,
                    latency_ms=latency,
                )
    except Exception:
        logger.exception("LLM escalation classification failed")

    if collector:
        collector.end_node("check_escalation")

    return {"should_escalate": False, "escalation_reason": None}


async def escalate_node(state: dict) -> dict:
    """Handle escalation -- create record and return safe response."""
    from app.database import async_session_factory
    from app.services.notification import InAppNotifier

    collector = get_collector()
    if collector:
        collector.start_node("escalate")

    reason = state.get("escalation_reason", "ai_unsure")
    conversation_id = state.get("conversation_id")
    tenant_id = state.get("tenant_id", "")

    safe_response = _ESCALATION_RESPONSES.get(reason, _ESCALATION_RESPONSES["ai_unsure"])

    if conversation_id and tenant_id:
        try:
            import uuid

            from app.models.escalation import Escalation, EscalationReason, EscalationStatus

            reason_enum = EscalationReason(reason)

            async with async_session_factory() as db:
                escalation = Escalation(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    conversation_id=uuid.UUID(conversation_id),
                    reason=reason_enum,
                    status=EscalationStatus.PENDING,
                    notes=(
                        "Auto-escalated during chat."
                        f" Last user message triggered {reason} detection."
                    ),
                )
                db.add(escalation)
                await db.commit()

                notifier = InAppNotifier()
                await notifier.notify_escalation(
                    tenant_id=tenant_id,
                    escalation_id=str(escalation.id),
                    reason=reason,
                )
        except Exception:
            logger.exception("Failed to create escalation record")

    if collector:
        collector.end_node("escalate")

    return {"response": safe_response, "should_escalate": True}


async def create_lead_node(state: dict) -> dict:
    """Create or update a lead from the conversation."""
    from app.database import async_session_factory
    from app.services.lead_service import LeadService

    collector = get_collector()
    if collector:
        collector.start_node("create_lead")

    tenant_id = state.get("tenant_id", "")
    conversation_id = state.get("conversation_id")
    lead_id = state.get("lead_id")
    messages = state.get("messages", [])

    if not tenant_id or not messages:
        if collector:
            collector.end_node("create_lead")
        return {}

    user_messages = [m for m in messages if m.get("role") == "user"]
    if not user_messages:
        if collector:
            collector.end_node("create_lead")
        return {}

    last_msg = user_messages[-1].get("content", "")
    if len(last_msg.strip()) < 10:
        if collector:
            collector.end_node("create_lead")
        return {}

    try:
        llm = _get_llm()
        classify_prompt = (
            "Analyze this patient message from a med spa chat and respond in exactly this format:\n"
            "INTENT: <one of: appointment, pricing, treatment_info,"
            " complaint, general, emergency>\n"
            "URGENCY: <1-5 where 1=low, 5=critical>\n"
            "SUMMARY: <one sentence summary of what the patient wants>\n\n"
            f"Patient message: {last_msg}"
        )
        result = await instrumented_ainvoke(
            llm, [HumanMessage(content=classify_prompt)], "create_lead"
        )
        text = result.content

        intent = "general"
        urgency = 2
        summary = last_msg[:100]

        for line in text.strip().split("\n"):
            line = line.strip()
            if line.upper().startswith("INTENT:"):
                intent_val = line.split(":", 1)[1].strip().lower()
                valid = ("appointment", "pricing", "treatment_info",
                         "complaint", "general", "emergency")
                if intent_val in valid:
                    intent = intent_val
            elif line.upper().startswith("URGENCY:"):
                import contextlib

                with contextlib.suppress(ValueError, IndexError):
                    urgency = min(
                        5, max(1, int(line.split(":", 1)[1].strip()[0]))
                    )
            elif line.upper().startswith("SUMMARY:"):
                summary = line.split(":", 1)[1].strip()

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
                if collector:
                    collector.end_node("create_lead")
                return {"lead_id": str(lead.id), "intent": intent}
    except Exception:
        logger.exception("Failed to create/update lead")

    if collector:
        collector.end_node("create_lead")

    return {}
