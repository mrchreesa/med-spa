import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    """Set tenant context from Clerk organization ID."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        org_id = getattr(request.state, "org_id", None)
        if org_id:
            request.state.tenant_id = org_id
        else:
            request.state.tenant_id = ""

        return await call_next(request)
