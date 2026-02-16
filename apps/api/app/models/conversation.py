import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TenantModel


class Channel(str, enum.Enum):
    PHONE = "phone"
    WEB_CHAT = "web_chat"
    SMS = "sms"


class Conversation(TenantModel):
    __tablename__ = "conversations"

    lead_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True
    )
    channel: Mapped[Channel] = mapped_column(
        Enum(
            Channel,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
    )
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    transcript: Mapped[list[dict]] = mapped_column(JSONB, default=list)
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
