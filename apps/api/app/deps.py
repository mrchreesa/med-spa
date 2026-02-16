from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


async def get_tenant_id(request: Request) -> str:
    """Extract tenant ID from authenticated request."""
    import uuid as uuid_mod

    tenant_id: str = getattr(request.state, "tenant_id", "")
    if not tenant_id:
        raise ValueError("Tenant ID not found in request state")

    # Validate that tenant_id is either a valid UUID or a Clerk org_id (org_*)
    if not tenant_id.startswith("org_"):
        try:
            uuid_mod.UUID(tenant_id)
        except ValueError:
            raise ValueError(f"Invalid tenant_id format: {tenant_id}")

    return tenant_id


DbSession = Annotated[AsyncSession, Depends(get_db)]
TenantId = Annotated[str, Depends(get_tenant_id)]
