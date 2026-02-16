from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.middleware.auth import ClerkAuthMiddleware
from app.middleware.logging import AuditLogMiddleware
from app.middleware.tenant import TenantMiddleware
from app.routers import (
    analytics,
    chat,
    conversations,
    escalations,
    knowledge_base,
    leads,
    settings as settings_router,
)
from app.routers.webhooks import retell, stripe, twilio

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Startup
    yield
    # Shutdown


def create_app() -> FastAPI:
    app = FastAPI(
        title="Med Spa AI Concierge API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware (LIFO order: last added = first to process request)
    # TenantMiddleware runs after auth, maps org_id -> tenant_id
    app.add_middleware(TenantMiddleware)
    # Auth middleware verifies JWT, extracts org_id
    app.add_middleware(ClerkAuthMiddleware)
    # Audit logging runs first
    app.add_middleware(AuditLogMiddleware)

    # Routers
    app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
    app.include_router(leads.router, prefix="/api/v1", tags=["leads"])
    app.include_router(conversations.router, prefix="/api/v1", tags=["conversations"])
    app.include_router(escalations.router, prefix="/api/v1", tags=["escalations"])
    app.include_router(knowledge_base.router, prefix="/api/v1", tags=["knowledge-base"])
    app.include_router(analytics.router, prefix="/api/v1", tags=["analytics"])
    app.include_router(settings_router.router, prefix="/api/v1", tags=["settings"])
    app.include_router(retell.router, prefix="/api/v1/webhooks", tags=["webhooks"])
    app.include_router(twilio.router, prefix="/api/v1/webhooks", tags=["webhooks"])
    app.include_router(stripe.router, prefix="/api/v1/webhooks", tags=["webhooks"])

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        return {"status": "healthy"}

    return app


app = create_app()
