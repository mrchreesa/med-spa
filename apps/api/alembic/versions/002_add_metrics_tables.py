"""Add metrics tables for Dev Health Dashboard

Revision ID: 002
Revises: 001
Create Date: 2026-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # agent_run_metrics
    op.create_table(
        "agent_run_metrics",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=True),
        sa.Column("total_duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("node_sequence", sa.String(), nullable=True),
        sa.Column("node_durations", postgresql.JSONB(), nullable=True),
        sa.Column("tools_invoked", postgresql.JSONB(), nullable=True),
        sa.Column("final_node", sa.String(64), nullable=True),
        sa.Column("was_escalated", sa.Boolean(), server_default="false"),
        sa.Column("intent_detected", sa.String(64), nullable=True),
        sa.Column("lead_created", sa.Boolean(), server_default="false"),
        sa.Column("total_tokens", sa.Integer(), server_default="0"),
        sa.Column("total_cost_usd", sa.Numeric(10, 6), server_default="0"),
        sa.Column("error", sa.Boolean(), server_default="false"),
        sa.Column("langfuse_trace_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_agent_run_created_at", "agent_run_metrics", ["created_at"])
    op.create_index("ix_agent_run_tenant_created", "agent_run_metrics", ["tenant_id", "created_at"])

    # llm_call_metrics
    op.create_table(
        "llm_call_metrics",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=True),
        sa.Column("agent_run_id", sa.UUID(), nullable=True),
        sa.Column("node_name", sa.String(64), nullable=False),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), server_default="0"),
        sa.Column("total_tokens", sa.Integer(), server_default="0"),
        sa.Column("cost_usd", sa.Numeric(10, 6), server_default="0"),
        sa.Column("latency_ms", sa.Integer(), server_default="0"),
        sa.Column("success", sa.Boolean(), server_default="true"),
        sa.Column("error_type", sa.String(128), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("langfuse_trace_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_llm_call_created_at", "llm_call_metrics", ["created_at"])
    op.create_index("ix_llm_call_tenant_created", "llm_call_metrics", ["tenant_id", "created_at"])
    op.create_index("ix_llm_call_model_created", "llm_call_metrics", ["model", "created_at"])
    op.create_index("ix_llm_call_agent_run", "llm_call_metrics", ["agent_run_id"])

    # rag_retrieval_metrics
    op.create_table(
        "rag_retrieval_metrics",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("agent_run_id", sa.UUID(), nullable=True),
        sa.Column("query_text", sa.String(512), nullable=True),
        sa.Column("chunks_returned", sa.Integer(), server_default="0"),
        sa.Column("chunks_above_threshold", sa.Integer(), server_default="0"),
        sa.Column("avg_similarity", sa.Numeric(5, 4), nullable=True),
        sa.Column("max_similarity", sa.Numeric(5, 4), nullable=True),
        sa.Column("min_similarity", sa.Numeric(5, 4), nullable=True),
        sa.Column("threshold_used", sa.Numeric(5, 4), server_default="0.7800"),
        sa.Column("threshold_violations", sa.Integer(), server_default="0"),
        sa.Column("embedding_latency_ms", sa.Integer(), server_default="0"),
        sa.Column("search_latency_ms", sa.Integer(), server_default="0"),
        sa.Column("total_latency_ms", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_rag_retrieval_created_at", "rag_retrieval_metrics", ["created_at"])
    op.create_index("ix_rag_retrieval_tenant_created", "rag_retrieval_metrics", ["tenant_id", "created_at"])
    op.create_index("ix_rag_retrieval_agent_run", "rag_retrieval_metrics", ["agent_run_id"])

    # escalation_decision_metrics
    op.create_table(
        "escalation_decision_metrics",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.Column("agent_run_id", sa.UUID(), nullable=True),
        sa.Column("conversation_id", sa.UUID(), nullable=True),
        sa.Column("detection_method", sa.String(16), nullable=False),
        sa.Column("pattern_matched", sa.String(64), nullable=True),
        sa.Column("llm_classification", sa.String(32), nullable=True),
        sa.Column("escalation_reason", sa.String(64), nullable=True),
        sa.Column("should_escalate", sa.Boolean(), server_default="false"),
        sa.Column("confidence", sa.Numeric(3, 2), nullable=True),
        sa.Column("latency_ms", sa.Integer(), server_default="0"),
        sa.Column("correct", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_escalation_decision_created_at", "escalation_decision_metrics", ["created_at"])
    op.create_index("ix_escalation_decision_method_created", "escalation_decision_metrics", ["detection_method", "created_at"])
    op.create_index("ix_escalation_decision_agent_run", "escalation_decision_metrics", ["agent_run_id"])

    # system_events
    op.create_table(
        "system_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("source", sa.String(128), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("stack_trace", sa.Text(), nullable=True),
        sa.Column("extra_data", postgresql.JSONB(), nullable=True),
        sa.Column("tenant_id", sa.String(), nullable=True),
        sa.Column("request_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_system_event_created_at", "system_events", ["created_at"])
    op.create_index("ix_system_event_type_created", "system_events", ["event_type", "created_at"])
    op.create_index("ix_system_event_severity_created", "system_events", ["severity", "created_at"])


def downgrade() -> None:
    op.drop_table("system_events")
    op.drop_table("escalation_decision_metrics")
    op.drop_table("rag_retrieval_metrics")
    op.drop_table("llm_call_metrics")
    op.drop_table("agent_run_metrics")
