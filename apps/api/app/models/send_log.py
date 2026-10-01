import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, UniqueConstraint
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
    SKIPPED = "skipped"  # odrzucone przez zabezpieczenia tuż przed wysyłką (np. adres trafił na listę wykluczeń)


# Statusy oznaczające, że mail faktycznie wyszedł -- liczą się do dziennego limitu i do "już kontaktowany".
DELIVERED_STATUSES = (SendStatus.SENT, SendStatus.BOUNCED, SendStatus.OPENED, SendStatus.REPLIED, SendStatus.UNSUBSCRIBED)


class SendLog(TimestampMixin, Base):
    """Historia wysyłek i jednocześnie kolejka (status QUEUED). Sprawdzana PRZED każdą wysyłką
    (apps/api/app/services/mailer_service.py), żeby nigdy nie skontaktować się drugi raz z tym samym
    kontaktem ani firmą -- patrz zasada w CLAUDE.md (root)."""

    __tablename__ = "send_log"
    __table_args__ = (
        UniqueConstraint("campaign_id", "contact_id", name="uq_send_log_campaign_contact"),
        Index("ix_send_log_contact_id", "contact_id"),
        Index("ix_send_log_email", "email"),
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

    # Kopia tego, co faktycznie wyszło -- adres, temat i treść po wyrenderowaniu. Szablon kampanii może
    # się później zmienić, a historia musi pokazywać prawdę.
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(500), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
