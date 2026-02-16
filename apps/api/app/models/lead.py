import enum

from sqlalchemy import Enum, String, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TenantModel


class LeadSource(str, enum.Enum):
    PHONE = "phone"
    WEB_CHAT = "web_chat"
    SMS = "sms"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    BOOKED = "booked"
    LOST = "lost"


class LeadIntent(str, enum.Enum):
    APPOINTMENT = "appointment"
    PRICING = "pricing"
    TREATMENT_INFO = "treatment_info"
    COMPLAINT = "complaint"
    GENERAL = "general"
    EMERGENCY = "emergency"


class Lead(TenantModel):
    __tablename__ = "leads"

    name: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource), nullable=False)
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus), nullable=False, default=LeadStatus.NEW
    )
    intent: Mapped[LeadIntent | None] = mapped_column(Enum(LeadIntent), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    urgency: Mapped[int] = mapped_column(Integer, default=0)
    extra_data: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
