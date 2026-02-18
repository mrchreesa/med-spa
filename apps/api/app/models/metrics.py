"""Metrics models for Dev Health Dashboard.

These models store agent performance, LLM usage, RAG quality,
escalation decisions, and system events. They inherit from Base
(not TenantModel) because they don't need updated_at.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Index, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AgentRunMetric(Base):
    """One row per chat message (graph invocation)."""

    __tablename__ = "agent_run_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    total_duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    node_sequence: Mapped[str | None] = mapped_column(String, nullable=True)
    node_durations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tools_invoked: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    final_node: Mapped[str | None] = mapped_column(String(64), nullable=True)
    was_escalated: Mapped[bool] = mapped_column(Boolean, default=False)

    intent_detected: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lead_created: Mapped[bool] = mapped_column(Boolean, default=False)

    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)
    error: Mapped[bool] = mapped_column(Boolean, default=False)

    langfuse_trace_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_agent_run_created_at", "created_at", postgresql_using="btree"),
        Index("ix_agent_run_tenant_created", "tenant_id", "created_at"),
    )


class LLMCallMetric(Base):
    """One row per LLM call."""

    __tablename__ = "llm_call_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    node_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)

    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)

    cost_usd: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)

    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    langfuse_trace_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_llm_call_created_at", "created_at", postgresql_using="btree"),
        Index("ix_llm_call_tenant_created", "tenant_id", "created_at"),
        Index("ix_llm_call_model_created", "model", "created_at"),
        Index("ix_llm_call_agent_run", "agent_run_id"),
    )


class RAGRetrievalMetric(Base):
    """One row per RAG search."""

    __tablename__ = "rag_retrieval_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    query_text: Mapped[str | None] = mapped_column(String(512), nullable=True)
    chunks_returned: Mapped[int] = mapped_column(Integer, default=0)
    chunks_above_threshold: Mapped[int] = mapped_column(Integer, default=0)

    avg_similarity: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    max_similarity: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)
    min_similarity: Mapped[Decimal | None] = mapped_column(Numeric(5, 4), nullable=True)

    threshold_used: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0.7800"))
    threshold_violations: Mapped[int] = mapped_column(Integer, default=0)

    embedding_latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    search_latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    total_latency_ms: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_rag_retrieval_created_at", "created_at", postgresql_using="btree"),
        Index("ix_rag_retrieval_tenant_created", "tenant_id", "created_at"),
        Index("ix_rag_retrieval_agent_run", "agent_run_id"),
    )


class EscalationDecisionMetric(Base):
    """One row per escalation check."""

    __tablename__ = "escalation_decision_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    detection_method: Mapped[str] = mapped_column(String(16), nullable=False)  # "regex" or "llm"
    pattern_matched: Mapped[str | None] = mapped_column(String(64), nullable=True)
    llm_classification: Mapped[str | None] = mapped_column(String(32), nullable=True)
    escalation_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    should_escalate: Mapped[bool] = mapped_column(Boolean, default=False)
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(3, 2), nullable=True)

    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # for annotation

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_escalation_decision_created_at", "created_at", postgresql_using="btree"),
        Index("ix_escalation_decision_method_created", "detection_method", "created_at"),
        Index("ix_escalation_decision_agent_run", "agent_run_id"),
    )


class SystemEvent(Base):
    """System events: errors, rate limits, auth failures."""

    __tablename__ = "system_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)  # info/warning/error/critical
    source: Mapped[str] = mapped_column(String(128), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    stack_trace: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    tenant_id: Mapped[str | None] = mapped_column(String, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_system_event_created_at", "created_at", postgresql_using="btree"),
        Index("ix_system_event_type_created", "event_type", "created_at"),
        Index("ix_system_event_severity_created", "severity", "created_at"),
    )
