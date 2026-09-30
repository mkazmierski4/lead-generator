import enum
import uuid

from sqlalchemy import Enum, String

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class SuppressionReason(str, enum.Enum):
    UNSUBSCRIBED = "unsubscribed"
    HARD_BOUNCE = "hard_bounce"
    COMPLAINT = "complaint"
    MANUAL = "manual"


class SuppressionEntry(TimestampMixin, Base):
    """Trwała lista 'nigdy nie kontaktować'. Sprawdzana PRZED każdą wysyłką — patrz zasada w CLAUDE.md (root)."""

    __tablename__ = "suppression_list"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    reason: Mapped[SuppressionReason] = mapped_column(Enum(SuppressionReason, name="suppression_reason"), nullable=False)
