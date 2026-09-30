import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class SendStatus(str, enum.Enum):
    QUEUED = "queued"
    SENT = "sent"
    BOUNCED = "bounced"
    OPENED = "opened"
    REPLIED = "replied"
    UNSUBSCRIBED = "unsubscribed"
    FAILED = "failed"


class SendLog(TimestampMixin, Base):
    """Historia wysyłek. Sprawdzana PRZED każdą wysyłką (packages/mailer), żeby nigdy nie skontaktować
    się drugi raz z tym samym kontaktem — patrz zasada w CLAUDE.md (root)."""

    __tablename__ = "send_log"
    __table_args__ = (
        UniqueConstraint("campaign_id", "contact_id", name="uq_send_log_campaign_contact"),
        Index("ix_send_log_contact_id", "contact_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    status: Mapped[SendStatus] = mapped_column(Enum(SendStatus, name="send_status"), default=SendStatus.QUEUED, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
