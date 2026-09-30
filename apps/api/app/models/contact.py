import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.company import Company


class ContactSource(str, enum.Enum):
    GOOGLE_PLACES = "google_places"
    WEBSITE_SCRAPE = "website_scrape"
    REGISTRY = "registry"
    PATTERN_GUESS = "pattern_guess"
    MANUAL = "manual"


class Contact(TimestampMixin, Base):
    __tablename__ = "contacts"
    __table_args__ = (Index("ix_contacts_email", "email"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    source: Mapped[ContactSource] = mapped_column(Enum(ContactSource, name="contact_source"), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    company: Mapped["Company"] = relationship(back_populates="contacts")
