import json
import logging
import time

import httpx
from fastapi import Request
from jose import JWTError, jwk, jwt
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response

from app.config import settings

logger = logging.getLogger(__name__)


class JWKSCache:
    """Cache Clerk JWKS keys with TTL."""

    def __init__(self, ttl_seconds: int = 3600):
        self._keys: list[dict] | None = None
        self._fetched_at: float = 0
        self._ttl = ttl_seconds

    @property
    def _is_expired(self) -> bool:
        return self._keys is None or (time.time() - self._fetched_at) > self._ttl

    async def get_keys(self, jwks_url: str) -> list[dict]:
        if not self._is_expired and self._keys is not None:
            return self._keys

        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_url, timeout=10)
            response.raise_for_status()
            data = response.json()

        self._keys = data.get("keys", [])
        self._fetched_at = time.time()
        return self._keys

    def invalidate(self) -> None:
        self._keys = None
        self._fetched_at = 0


_jwks_cache = JWKSCache()


def _error(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail})


class ClerkAuthMiddleware(BaseHTTPMiddleware):
    """Verify Clerk JWT tokens and extract user/org info."""

    SKIP_PATHS = {
        "/health",
        "/docs",
        "/openapi.json",
        "/api/v1/chat",
        "/api/v1/webhooks/retell",
        "/api/v1/webhooks/twilio",
        "/api/v1/webhooks/stripe",
    }
    SKIP_PREFIXES = ("/api/v1/chat/",)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in self.SKIP_PATHS or request.url.path.startswith(self.SKIP_PREFIXES):
            request.state.user_id = ""
            request.state.org_id = ""
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return _error(401, "Missing authorization header")

        token = auth_header.split(" ", 1)[1]

        # In development without Clerk keys, accept any token but log a warning
        if not settings.clerk_jwks_url:
            logger.warning("Clerk JWKS URL not configured — skipping JWT verification")
            request.state.user_id = ""
            request.state.org_id = ""
            request.state.token = token
            return await call_next(request)

        try:
            claims = await self._verify_token(token)
            request.state.user_id = claims.get("sub", "")
            request.state.org_id = claims.get("org_id", "")
            request.state.token = token
        except Exception:
            logger.exception("Auth verification failed")
            return _error(401, "Invalid token")

        if not request.state.org_id:
            return _error(
                403,
                "No organization selected. Please select an organization in Clerk.",
            )

        return await call_next(request)

    async def _verify_token(self, token: str) -> dict:
        """Verify JWT using Clerk JWKS."""
        try:
            unverified_header = jwt.get_unverified_header(token)
        except JWTError as e:
            raise ValueError(f"Invalid token format: {e}")

        kid = unverified_header.get("kid")
        if not kid:
            raise ValueError("Token missing key ID")

        keys = await _jwks_cache.get_keys(settings.clerk_jwks_url)
        signing_key = None
        for key_data in keys:
            if key_data.get("kid") == kid:
                signing_key = key_data
                break

        if not signing_key:
            # Key might have rotated — refetch once
            _jwks_cache.invalidate()
            keys = await _jwks_cache.get_keys(settings.clerk_jwks_url)
            for key_data in keys:
                if key_data.get("kid") == kid:
                    signing_key = key_data
                    break

        if not signing_key:
            raise ValueError("Unable to find signing key")

        try:
            rsa_key = jwk.construct(signing_key)
            claims = jwt.decode(
                token,
                rsa_key.to_dict(),
                algorithms=["RS256"],
                options={"verify_aud": False},
            )
            return claims
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except JWTError as e:
            raise ValueError(f"Token verification failed: {e}")
