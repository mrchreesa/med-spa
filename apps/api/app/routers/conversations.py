"""Conversation management endpoints."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.deps import DbSession, TenantId
from app.models.conversation import Conversation
from app.schemas.conversation import ConversationResponse, PaginatedConversationResponse

router = APIRouter()


@router.get("/conversations", response_model=PaginatedConversationResponse)
async def list_conversations(
    db: DbSession,
    tenant_id: TenantId,
    limit: int = 50,
    offset: int = 0,
) -> PaginatedConversationResponse:
    """List conversations for the current tenant."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.tenant_id == tenant_id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    conversations = result.scalars().all()

    count_result = await db.execute(
        select(func.count(Conversation.id))
        .where(Conversation.tenant_id == tenant_id)
    )
    total = count_result.scalar_one()

    return PaginatedConversationResponse(
        items=[ConversationResponse.model_validate(c) for c in conversations],
        total_count=total,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    db: DbSession,
    tenant_id: TenantId,
) -> ConversationResponse:
    """Get a conversation with full transcript."""
    uid = uuid.UUID(conversation_id)
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uid,
            Conversation.tenant_id == tenant_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse.model_validate(conv)
