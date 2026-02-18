"""Comprehensive tests for Clerk JWT auth middleware."""

import time
from unittest.mock import AsyncMock, patch

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat
from httpx import ASGITransport, AsyncClient
from jose import jwt

# ---------------------------------------------------------------------------
# RSA key helpers
# ---------------------------------------------------------------------------

def _generate_rsa_key():
    """Generate an RSA-2048 private key."""
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _jwk_from_private_key(private_key, kid: str = "test-kid-1") -> dict:
    """Build a JWK dict (public key) from an RSA private key."""
    import base64

    pub_numbers = private_key.public_key().public_numbers()

    def _int_to_b64(n: int) -> str:
        byte_len = (n.bit_length() + 7) // 8
        return base64.urlsafe_b64encode(n.to_bytes(byte_len, "big")).decode().rstrip("=")

    return {
        "kty": "RSA",
        "kid": kid,
        "use": "sig",
        "alg": "RS256",
        "n": _int_to_b64(pub_numbers.n),
        "e": _int_to_b64(pub_numbers.e),
    }


def _pem_from_private_key(private_key) -> bytes:
    """Get PEM bytes from an RSA private key."""
    return private_key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())


def _make_token(
    private_key,
    kid: str = "test-kid-1",
    sub: str = "user_test123",
    org_id: str = "org_test456",
    azp: str = "http://localhost:3000",
    exp: float | None = None,
    extra_claims: dict | None = None,
) -> str:
    """Sign a JWT with the given RSA private key."""
    now = time.time()
    claims = {
        "sub": sub,
        "org_id": org_id,
        "azp": azp,
        "iat": now,
        "exp": exp if exp is not None else now + 3600,
    }
    if extra_claims:
        claims.update(extra_claims)
    # Remove None-valued keys
    claims = {k: v for k, v in claims.items() if v is not None}

    pem = _pem_from_private_key(private_key)
    return jwt.encode(claims, pem, algorithm="RS256", headers={"kid": kid})


# ---------------------------------------------------------------------------
# Module-scoped fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def rsa_key_pair():
    """Generate RSA-2048 key pair once for all tests."""
    private_key = _generate_rsa_key()
    kid = "test-kid-1"
    jwk_dict = _jwk_from_private_key(private_key, kid)
    return private_key, jwk_dict, kid


@pytest.fixture(scope="module")
def second_rsa_key_pair():
    """Second RSA key pair for wrong-key tests."""
    private_key = _generate_rsa_key()
    kid = "test-kid-2"
    jwk_dict = _jwk_from_private_key(private_key, kid)
    return private_key, jwk_dict, kid


# ---------------------------------------------------------------------------
# Function-scoped client fixture with patched settings + JWKS
# ---------------------------------------------------------------------------

_AUTH_CHECK_PATH = "/api/v1/auth-check"


@pytest.fixture
def auth_client(rsa_key_pair):
    """Returns an async context manager factory for test clients with JWT auth configured.

    Adds a lightweight /api/v1/auth-check endpoint that goes through auth
    middleware but doesn't touch the database.
    """

    async def _make_client(
        clerk_jwks_url: str = "https://test.clerk.accounts.dev/.well-known/jwks.json",
        clerk_allowed_origins: list[str] | None = None,
        jwks_keys: list[dict] | None = None,
    ):
        if jwks_keys is None:
            _, jwk_dict, _ = rsa_key_pair
            jwks_keys = [jwk_dict]
        if clerk_allowed_origins is None:
            clerk_allowed_origins = []

        mock_get_keys = AsyncMock(return_value=jwks_keys)

        settings_patch = patch("app.middleware.auth.settings")
        cache_patch = patch("app.middleware.auth._jwks_cache")

        mock_settings = settings_patch.start()
        mock_settings.clerk_jwks_url = clerk_jwks_url
        mock_settings.clerk_allowed_origins = clerk_allowed_origins

        mock_cache = cache_patch.start()
        mock_cache.get_keys = mock_get_keys
        mock_cache.invalidate = lambda: None

        from app.main import create_app

        app = create_app()

        # Add a test-only endpoint that goes through auth but avoids DB
        @app.get(_AUTH_CHECK_PATH)
        async def _auth_check():
            return {"ok": True}

        client = AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        )

        return client, settings_patch, cache_patch, mock_get_keys

    return _make_client


# ---------------------------------------------------------------------------
# Skip-path tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_skips_auth():
    """Health endpoint should not require auth."""
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/health")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_chat_skips_auth():
    """POST /api/v1/chat should skip auth (public endpoint)."""
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/v1/chat", json={"message": "hi", "tenant_id": "org_x"})
    # Should not be 401 — chat is a skip path
    assert r.status_code != 401


# ---------------------------------------------------------------------------
# Missing / bad token tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_no_token_returns_401():
    """Protected route without auth header → 401."""
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/v1/leads")
    assert r.status_code == 401
    assert "authorization" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_bad_scheme_returns_401():
    """Non-Bearer auth scheme → 401."""
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get(
            "/api/v1/leads",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Valid token tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_valid_token_sets_state(auth_client, rsa_key_pair):
    """Valid RS256 JWT with org_id should pass auth."""
    private_key, _, kid = rsa_key_pair
    token = _make_token(private_key, kid=kid)

    client, sp, cp, _ = await auth_client()
    try:
        r = await client.get(
            _AUTH_CHECK_PATH,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json() == {"ok": True}
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


# ---------------------------------------------------------------------------
# Expired / tampered / wrong-key tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_expired_token_returns_401(auth_client, rsa_key_pair):
    """JWT with exp in the past → 401."""
    private_key, _, kid = rsa_key_pair
    token = _make_token(private_key, kid=kid, exp=time.time() - 3600)

    client, sp, cp, _ = await auth_client()
    try:
        r = await client.get(
            "/api/v1/leads",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


@pytest.mark.asyncio
async def test_tampered_token_returns_401(auth_client, rsa_key_pair):
    """Token with modified payload after signing → 401."""
    private_key, _, kid = rsa_key_pair
    token = _make_token(private_key, kid=kid)

    # Tamper with the payload segment
    parts = token.split(".")
    import base64
    payload = base64.urlsafe_b64decode(parts[1] + "==")
    import json
    data = json.loads(payload)
    data["org_id"] = "org_hacked"
    tampered_payload = base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

    client, sp, cp, _ = await auth_client()
    try:
        r = await client.get(
            "/api/v1/leads",
            headers={"Authorization": f"Bearer {tampered_token}"},
        )
        assert r.status_code == 401
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


@pytest.mark.asyncio
async def test_wrong_kid_returns_401(auth_client, rsa_key_pair, second_rsa_key_pair):
    """JWT signed with unknown kid (not in JWKS) → 401."""
    other_private_key, _, _ = second_rsa_key_pair
    # Sign with second key but JWKS only has first key
    token = _make_token(other_private_key, kid="unknown-kid-999")

    client, sp, cp, _ = await auth_client()
    try:
        r = await client.get(
            "/api/v1/leads",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


# ---------------------------------------------------------------------------
# Missing org_id test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_org_id_returns_403(auth_client, rsa_key_pair):
    """Valid JWT without org_id claim → 403."""
    private_key, _, kid = rsa_key_pair
    # Pass org_id=None so it's excluded from claims
    token = _make_token(private_key, kid=kid, org_id=None)

    client, sp, cp, _ = await auth_client()
    try:
        r = await client.get(
            "/api/v1/leads",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 403
        assert "organization" in r.json()["detail"].lower()
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


# ---------------------------------------------------------------------------
# AZP (authorized party) validation tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_azp_valid_passes(auth_client, rsa_key_pair):
    """azp in allowed_origins → passes."""
    private_key, _, kid = rsa_key_pair
    token = _make_token(private_key, kid=kid, azp="http://localhost:3000")

    client, sp, cp, _ = await auth_client(
        clerk_allowed_origins=["http://localhost:3000", "https://app.example.com"]
    )
    try:
        r = await client.get(
            _AUTH_CHECK_PATH,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


@pytest.mark.asyncio
async def test_azp_invalid_returns_401(auth_client, rsa_key_pair):
    """azp not in allowed_origins → 401."""
    private_key, _, kid = rsa_key_pair
    token = _make_token(private_key, kid=kid, azp="http://evil.com")

    client, sp, cp, _ = await auth_client(
        clerk_allowed_origins=["http://localhost:3000"]
    )
    try:
        r = await client.get(
            "/api/v1/leads",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 401
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


@pytest.mark.asyncio
async def test_azp_skipped_when_origins_empty(auth_client, rsa_key_pair):
    """Empty allowed_origins → azp check skipped, any azp passes."""
    private_key, _, kid = rsa_key_pair
    token = _make_token(private_key, kid=kid, azp="http://anything.com")

    client, sp, cp, _ = await auth_client(clerk_allowed_origins=[])
    try:
        r = await client.get(
            _AUTH_CHECK_PATH,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
    finally:
        await client.aclose()
        sp.stop()
        cp.stop()


# ---------------------------------------------------------------------------
# Key rotation test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_key_rotation_refetches(auth_client, rsa_key_pair, second_rsa_key_pair):
    """kid miss on first JWKS fetch, hit after refetch → passes."""
    private_key_2, jwk_dict_2, kid_2 = second_rsa_key_pair
    _, jwk_dict_1, _ = rsa_key_pair

    # Sign token with second key
    token = _make_token(private_key_2, kid=kid_2)

    # First fetch returns only key 1, second fetch returns both
    call_count = 0

    async def _rotating_get_keys(url):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return [jwk_dict_1]  # kid miss
        return [jwk_dict_1, jwk_dict_2]  # kid hit after rotation

    mock_get_keys = AsyncMock(side_effect=_rotating_get_keys)

    with patch("app.middleware.auth.settings") as mock_settings, \
         patch("app.middleware.auth._jwks_cache") as mock_cache:
        mock_settings.clerk_jwks_url = "https://test.clerk.accounts.dev/.well-known/jwks.json"
        mock_settings.clerk_allowed_origins = []
        mock_cache.get_keys = mock_get_keys
        mock_cache.invalidate = lambda: None

        from app.main import create_app
        app = create_app()

        @app.get(_AUTH_CHECK_PATH)
        async def _auth_check():
            return {"ok": True}

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.get(
                _AUTH_CHECK_PATH,
                headers={"Authorization": f"Bearer {token}"},
            )
        assert r.status_code == 200
        # Should have called get_keys twice (initial + refetch)
        assert mock_get_keys.call_count == 2


# ---------------------------------------------------------------------------
# Dev bypass tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_dev_bypass_with_empty_jwks_url():
    """Empty clerk_jwks_url → dev bypass, any Bearer token accepted."""
    with patch("app.middleware.auth.settings") as mock_settings:
        mock_settings.clerk_jwks_url = ""
        mock_settings.clerk_allowed_origins = []

        from app.main import create_app
        app = create_app()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            r = await client.get(
                "/api/v1/leads",
                headers={"Authorization": "Bearer any-random-token"},
            )
        # Dev bypass passes auth → tenant middleware sets tenant_id=""
        # Downstream may fail on DB but should not be 401
        assert r.status_code != 401


# ---------------------------------------------------------------------------
# Tenant ID error handling test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_tenant_id_empty_returns_403():
    """Dev bypass → empty org_id → tenant_id="" → get_tenant_id raises 403, not 500."""
    with patch("app.middleware.auth.settings") as mock_settings:
        mock_settings.clerk_jwks_url = ""
        mock_settings.clerk_allowed_origins = []

        from app.main import create_app
        app = create_app()
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Use a route that depends on TenantId
            r = await client.get(
                "/api/v1/leads",
                headers={"Authorization": "Bearer any-token"},
            )
        # With dev bypass, org_id="" → tenant_id="" → HTTPException(403)
        assert r.status_code == 403
