"""Metrics collector for agent run instrumentation.

Uses contextvars to make the collector accessible from any node
without modifying ConciergeState (avoids LangGraph serialization issues).
"""

import contextvars
import logging
import time
import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.metrics import (
    AgentRunMetric,
    EscalationDecisionMetric,
    LLMCallMetric,
    RAGRetrievalMetric,
)

logger = logging.getLogger(__name__)

_metrics_ctx: contextvars.ContextVar["MetricsCollector | None"] = contextvars.ContextVar(
    "_metrics_ctx", default=None
)


def get_collector() -> "MetricsCollector | None":
    return _metrics_ctx.get()


class MetricsCollector:
    """Accumulates metrics during a single agent run, flushes to DB in one batch."""

    def __init__(self, tenant_id: str, conversation_id: str | None = None):
        self.run_id = uuid.uuid4()
        self.tenant_id = tenant_id
        self.conversation_id = uuid.UUID(conversation_id) if conversation_id else None

        self._run_start: float = 0
        self._node_starts: dict[str, float] = {}
        self._node_durations: dict[str, int] = {}
        self._node_sequence: list[str] = []

        self._llm_calls: list[dict] = []
        self._rag_retrievals: list[dict] = []
        self._escalation_decisions: list[dict] = []

        self._total_tokens: int = 0
        self._total_cost: Decimal = Decimal("0")
        self._error: bool = False
        self._langfuse_trace_id: str | None = None

    def start_run(self) -> None:
        self._run_start = time.perf_counter()

    def start_node(self, name: str) -> None:
        self._node_starts[name] = time.perf_counter()
        self._node_sequence.append(name)

    def end_node(self, name: str) -> None:
        start = self._node_starts.pop(name, None)
        if start is not None:
            self._node_durations[name] = int((time.perf_counter() - start) * 1000)

    def record_llm_call(
        self,
        node_name: str,
        model: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
        cost_usd: Decimal = Decimal("0"),
        latency_ms: int = 0,
        success: bool = True,
        error_type: str | None = None,
        error_message: str | None = None,
    ) -> None:
        self._llm_calls.append({
            "node_name": node_name,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost_usd": cost_usd,
            "latency_ms": latency_ms,
            "success": success,
            "error_type": error_type,
            "error_message": error_message,
        })
        self._total_tokens += total_tokens
        self._total_cost += cost_usd
        if not success:
            self._error = True

    def record_rag_retrieval(
        self,
        query_text: str,
        chunks_returned: int = 0,
        chunks_above_threshold: int = 0,
        avg_similarity: float | None = None,
        max_similarity: float | None = None,
        min_similarity: float | None = None,
        threshold_used: float = 0.78,
        embedding_latency_ms: int = 0,
        search_latency_ms: int = 0,
        total_latency_ms: int = 0,
    ) -> None:
        self._rag_retrievals.append({
            "query_text": query_text[:512],
            "chunks_returned": chunks_returned,
            "chunks_above_threshold": chunks_above_threshold,
            "avg_similarity": Decimal(str(avg_similarity)) if avg_similarity is not None else None,
            "max_similarity": Decimal(str(max_similarity)) if max_similarity is not None else None,
            "min_similarity": Decimal(str(min_similarity)) if min_similarity is not None else None,
            "threshold_used": Decimal(str(threshold_used)),
            "embedding_latency_ms": embedding_latency_ms,
            "search_latency_ms": search_latency_ms,
            "total_latency_ms": total_latency_ms,
        })

    def record_escalation_decision(
        self,
        detection_method: str,
        should_escalate: bool,
        pattern_matched: str | None = None,
        llm_classification: str | None = None,
        escalation_reason: str | None = None,
        confidence: float | None = None,
        latency_ms: int = 0,
    ) -> None:
        self._escalation_decisions.append({
            "detection_method": detection_method,
            "should_escalate": should_escalate,
            "pattern_matched": pattern_matched,
            "llm_classification": llm_classification,
            "escalation_reason": escalation_reason,
            "confidence": Decimal(str(confidence)) if confidence is not None else None,
            "latency_ms": latency_ms,
        })

    def set_langfuse_trace_id(self, trace_id: str) -> None:
        self._langfuse_trace_id = trace_id

    async def flush(
        self,
        db: AsyncSession,
        final_node: str | None = None,
        was_escalated: bool = False,
        intent_detected: str | None = None,
        lead_created: bool = False,
    ) -> None:
        """Batch-insert all collected metrics in one transaction."""
        try:
            total_duration_ms = (
                int((time.perf_counter() - self._run_start) * 1000) if self._run_start else 0
            )

            # Agent run metric
            run = AgentRunMetric(
                id=self.run_id,
                tenant_id=self.tenant_id,
                conversation_id=self.conversation_id,
                total_duration_ms=total_duration_ms,
                node_sequence=">".join(self._node_sequence),
                node_durations=self._node_durations,
                tools_invoked=[c["node_name"] for c in self._llm_calls],
                final_node=final_node or (self._node_sequence[-1] if self._node_sequence else None),
                was_escalated=was_escalated,
                intent_detected=intent_detected,
                lead_created=lead_created,
                total_tokens=self._total_tokens,
                total_cost_usd=self._total_cost,
                error=self._error,
                langfuse_trace_id=self._langfuse_trace_id,
            )
            db.add(run)

            # LLM call metrics
            for call in self._llm_calls:
                db.add(LLMCallMetric(
                    tenant_id=self.tenant_id,
                    conversation_id=self.conversation_id,
                    agent_run_id=self.run_id,
                    langfuse_trace_id=self._langfuse_trace_id,
                    **call,
                ))

            # RAG retrieval metrics
            for retrieval in self._rag_retrievals:
                db.add(RAGRetrievalMetric(
                    tenant_id=self.tenant_id,
                    agent_run_id=self.run_id,
                    **retrieval,
                ))

            # Escalation decision metrics
            for decision in self._escalation_decisions:
                db.add(EscalationDecisionMetric(
                    tenant_id=self.tenant_id,
                    agent_run_id=self.run_id,
                    conversation_id=self.conversation_id,
                    **decision,
                ))

            await db.commit()
        except Exception:
            logger.exception("Failed to flush metrics for run %s", self.run_id)
            await db.rollback()
