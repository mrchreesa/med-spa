"""Initial schema - tenants, leads, conversations, knowledge_documents, escalations

Revision ID: 001
Revises: None
Create Date: 2026-02-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Tenants table
    op.create_table(
        "tenants",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("clerk_org_id", sa.String(), nullable=False, unique=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("retell_agent_id", sa.String(), nullable=True),
        sa.Column("business_hours", postgresql.JSONB(), nullable=True),
        sa.Column("settings", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Leads table
    op.create_table(
        "leads",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column(
            "source",
            sa.Enum("phone", "web_chat", "sms", name="leadsource"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("new", "contacted", "qualified", "booked", "lost", name="leadstatus"),
            nullable=False,
            server_default="new",
        ),
        sa.Column(
            "intent",
            sa.Enum(
                "appointment",
                "pricing",
                "treatment_info",
                "complaint",
                "general",
                "emergency",
                name="leadintent",
            ),
            nullable=True,
        ),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("urgency", sa.Integer(), server_default="0"),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Conversations table
    op.create_table(
        "conversations",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False, index=True),
        sa.Column(
            "lead_id", sa.UUID(), sa.ForeignKey("leads.id"), nullable=True
        ),
        sa.Column(
            "channel",
            sa.Enum("phone", "web_chat", "sms", name="channel"),
            nullable=False,
        ),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("transcript", postgresql.JSONB(), server_default="[]"),
        sa.Column("summary", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Knowledge documents table (with pgvector)
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False, index=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("doc_type", sa.String(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    # Add vector column separately (Alembic doesn't natively handle pgvector type)
    op.execute(
        "ALTER TABLE knowledge_documents ADD COLUMN embedding vector(1536)"
    )
    # Create HNSW index for fast similarity search
    op.execute(
        "CREATE INDEX ix_knowledge_documents_embedding ON knowledge_documents "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    # Escalations table
    op.create_table(
        "escalations",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("tenant_id", sa.String(), nullable=False, index=True),
        sa.Column(
            "conversation_id",
            sa.UUID(),
            sa.ForeignKey("conversations.id"),
            nullable=False,
        ),
        sa.Column(
            "reason",
            sa.Enum(
                "medical_question",
                "complaint",
                "emergency",
                "ai_unsure",
                "patient_request",
                name="escalationreason",
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "in_progress", "resolved", name="escalationstatus"
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("assigned_to", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("escalations")
    op.drop_table("knowledge_documents")
    op.drop_table("conversations")
    op.drop_table("leads")
    op.drop_table("tenants")
    op.execute("DROP TYPE IF EXISTS escalationstatus")
    op.execute("DROP TYPE IF EXISTS escalationreason")
    op.execute("DROP TYPE IF EXISTS channel")
    op.execute("DROP TYPE IF EXISTS leadintent")
    op.execute("DROP TYPE IF EXISTS leadstatus")
    op.execute("DROP TYPE IF EXISTS leadsource")
    op.execute("DROP EXTENSION IF EXISTS vector")
