"""Tests for auth middleware — skip paths, missing token, dev fallback."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_skips_auth():
    """Health endpoint should not require auth."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/health")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_protected_route_rejects_no_token():
    """Dashboard routes should return 401 without auth header."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/v1/leads")
    assert r.status_code == 401
    assert "authorization" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_protected_route_rejects_bad_scheme():
    """Non-Bearer auth should be rejected."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get(
            "/api/v1/leads",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
    assert r.status_code == 401
