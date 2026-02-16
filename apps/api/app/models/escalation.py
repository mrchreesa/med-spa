import enum

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import TenantModel


class EscalationStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class EscalationReason(str, enum.Enum):
    MEDICAL_QUESTION = "medical_question"
    COMPLAINT = "complaint"
    EMERGENCY = "emergency"
    AI_UNSURE = "ai_unsure"
    PATIENT_REQUEST = "patient_request"


class Escalation(TenantModel):
    __tablename__ = "escalations"

    conversation_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    reason: Mapped[EscalationReason] = mapped_column(Enum(EscalationReason), nullable=False)
    status: Mapped[EscalationStatus] = mapped_column(
        Enum(EscalationStatus), nullable=False, default=EscalationStatus.PENDING
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String, nullable=True)
