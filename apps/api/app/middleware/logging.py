import logging
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

logger = logging.getLogger(__name__)


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log all API requests for HIPAA audit trail."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        logger.info(
            "api_request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "tenant_id": getattr(request.state, "tenant_id", ""),
                "user_id": getattr(request.state, "user_id", ""),
            },
        )

        # Record SystemEvent for 5xx responses
        if response.status_code >= 500:
            try:
                from app.database import async_session_factory
                from app.models.metrics import SystemEvent

                async with async_session_factory() as db:
                    event = SystemEvent(
                        event_type="error",
                        severity="error",
                        source=f"http.{request.method}.{request.url.path}",
                        message=(
                            f"HTTP {response.status_code} on"
                            f" {request.method} {request.url.path}"
                        ),
                        tenant_id=getattr(request.state, "tenant_id", None) or None,
                        request_id=request_id,
                    )
                    db.add(event)
                    await db.commit()
            except Exception:
                logger.debug("Failed to record system event for 5xx", exc_info=True)

        response.headers["X-Request-ID"] = request_id
        return response
