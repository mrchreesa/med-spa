"""Test configuration and fixtures."""

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models import Base, Conversation, Escalation, Lead, Tenant
from app.models.conversation import Channel
from app.models.escalation import EscalationReason, EscalationStatus
from app.models.lead import LeadIntent, LeadSource, LeadStatus

# ---------------------------------------------------------------------------
# Test database
# ---------------------------------------------------------------------------
TEST_DATABASE_URL = settings.database_url.replace("/medspa", "/medspa_test")

# Tables to truncate between tests (order matters for FK constraints)
_TABLES = ["escalations", "conversations", "leads", "knowledge_documents", "tenants"]


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """Per-test DB session with table cleanup.

    Creates a fresh engine per test to avoid event-loop conflicts
    between session-scoped fixtures and function-scoped tests.
    """
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        yield session
        # Cleanup after each test
        for table in _TABLES:
            await session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
        await session.commit()

    await engine.dispose()


# ---------------------------------------------------------------------------
# Override FastAPI deps to use the test session
# ---------------------------------------------------------------------------
def _override_get_db(session: AsyncSession):
    async def _inner():
        yield session

    return _inner


def _override_get_tenant_id(tid: str):
    async def _inner():
        return tid

    return _inner


@pytest_asyncio.fixture
async def client(db: AsyncSession, tenant_id: str) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client with FastAPI dependency overrides."""
    from app.deps import get_db, get_tenant_id
    from app.main import create_app

    app = create_app()
    app.dependency_overrides[get_db] = _override_get_db(db)
    app.dependency_overrides[get_tenant_id] = _override_get_tenant_id(tenant_id)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": "Bearer test_token"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Identity fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def tenant_id() -> str:
    return "test_org_" + uuid.uuid4().hex[:8]


@pytest.fixture
def api_headers() -> dict[str, str]:
    return {
        "Authorization": "Bearer test_token",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# Seed data fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def tenant(db: AsyncSession, tenant_id: str) -> Tenant:
    t = Tenant(
        id=uuid.uuid4(),
        clerk_org_id=tenant_id,
        name="Test Med Spa",
        settings={"greeting": "Welcome!"},
    )
    db.add(t)
    await db.flush()
    return t


@pytest_asyncio.fixture
async def lead(db: AsyncSession, tenant_id: str) -> Lead:
    l = Lead(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        source=LeadSource.WEB_CHAT,
        status=LeadStatus.NEW,
        intent=LeadIntent.APPOINTMENT,
        summary="Interested in Botox treatment",
        urgency=3,
    )
    db.add(l)
    await db.flush()
    return l


@pytest_asyncio.fixture
async def conversation(db: AsyncSession, tenant_id: str) -> Conversation:
    c = Conversation(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        channel=Channel.WEB_CHAT,
        transcript=[
            {"role": "user", "content": "Hi, I'm interested in Botox"},
            {"role": "assistant", "content": "Welcome! I'd be happy to help."},
        ],
    )
    db.add(c)
    await db.flush()
    return c


@pytest_asyncio.fixture
async def escalation(db: AsyncSession, tenant_id: str, conversation: Conversation) -> Escalation:
    e = Escalation(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        conversation_id=conversation.id,
        reason=EscalationReason.MEDICAL_QUESTION,
        status=EscalationStatus.PENDING,
        notes="Patient asked about medication interactions",
    )
    db.add(e)
    await db.flush()
    return e


# ---------------------------------------------------------------------------
# Mock LLM fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def mock_llm():
    """Mock LLM that returns deterministic responses."""
    mock = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "Thank you for your interest! We offer a variety of treatments."
    mock.ainvoke = AsyncMock(return_value=mock_response)
    return mock


@pytest.fixture
def mock_classification_llm():
    """Mock LLM that returns SAFE classification."""
    mock = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "SAFE"
    mock.ainvoke = AsyncMock(return_value=mock_response)
    return mock


@pytest.fixture
def mock_lead_llm():
    """Mock LLM that returns lead classification."""
    mock = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = "INTENT: appointment\nURGENCY: 3\nSUMMARY: Patient wants Botox consultation"
    mock.ainvoke = AsyncMock(return_value=mock_response)
    return mock
