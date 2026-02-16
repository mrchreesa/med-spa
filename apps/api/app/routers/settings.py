"""Tenant settings endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import DbSession, TenantId
from app.models.tenant import Tenant

router = APIRouter()


class TenantSettingsUpdate(BaseModel):
    name: str | None = None
    phone_number: str | None = None
    business_hours: dict | None = None
    greeting_message: str | None = None
    notification_email: str | None = None
    notification_phone: str | None = None
    widget_color: str | None = None
    widget_position: str | None = None
    similarity_threshold: float | None = None


async def _get_tenant(db, tenant_id: str) -> Tenant | None:
    result = await db.execute(
        select(Tenant).where(Tenant.clerk_org_id == tenant_id)
    )
    return result.scalar_one_or_none()


@router.get("/settings")
async def get_settings(db: DbSession, tenant_id: TenantId) -> dict:
    """Get tenant settings."""
    tenant = await _get_tenant(db, tenant_id)
    if not tenant:
        return {
            "name": "",
            "phone_number": None,
            "business_hours": None,
            "settings": {},
        }

    return {
        "name": tenant.name,
        "phone_number": tenant.phone_number,
        "business_hours": tenant.business_hours,
        "settings": tenant.settings or {},
    }


@router.patch("/settings")
async def update_settings(
    body: TenantSettingsUpdate,
    db: DbSession,
    tenant_id: TenantId,
) -> dict:
    """Update tenant settings."""
    tenant = await _get_tenant(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if body.name is not None:
        tenant.name = body.name
    if body.phone_number is not None:
        tenant.phone_number = body.phone_number
    if body.business_hours is not None:
        tenant.business_hours = body.business_hours

    # Merge into settings JSONB
    current_settings = tenant.settings or {}
    settings_fields = {
        "greeting_message": body.greeting_message,
        "notification_email": body.notification_email,
        "notification_phone": body.notification_phone,
        "widget_color": body.widget_color,
        "widget_position": body.widget_position,
        "similarity_threshold": body.similarity_threshold,
    }
    for key, value in settings_fields.items():
        if value is not None:
            current_settings[key] = value
    tenant.settings = current_settings

    await db.commit()
    await db.refresh(tenant)

    return {
        "name": tenant.name,
        "phone_number": tenant.phone_number,
        "business_hours": tenant.business_hours,
        "settings": tenant.settings or {},
    }
