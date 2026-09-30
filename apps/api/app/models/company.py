import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, Float, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.contact import Contact


class LeadSource(str, enum.Enum):
    GOOGLE_PLACES = "google_places"
    OSM = "osm"
    CEIDG = "ceidg"
    KRS = "krs"
    COMPANIES_HOUSE = "companies_house"
    MANUAL = "manual"


class WebsiteStatus(str, enum.Enum):
    UNKNOWN = "unknown"  # jeszcze nie sprawdzone przez enrichment
    NONE = "none"  # brak strony w ogóle
    DEAD = "dead"  # strona nie odpowiada / błąd / parking page
    OUTDATED = "outdated"  # strona działa, ale jest przestarzała/słaba
    OK = "ok"  # strona działa i wygląda dobrze -> słaby lead


class Company(TimestampMixin, Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="uq_companies_source_source_id"),
        Index("ix_companies_normalized_domain", "normalized_domain"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(120), nullable=True)

    country: Mapped[str] = mapped_column(String(2), nullable=False)  # kod ISO 3166-1 alpha-2
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    normalized_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    website_status: Mapped[WebsiteStatus] = mapped_column(
        Enum(WebsiteStatus, name="website_status"), default=WebsiteStatus.UNKNOWN, nullable=False
    )

    registered_at: Mapped[date | None] = mapped_column(Date, nullable=True)  # data rejestracji firmy (z rejestru)

    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource, name="lead_source"), nullable=False)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)  # id w systemie źródłowym, do dedupu

    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Czytelne dla człowieka uzasadnienie score'u (lista powodów) -- wymóg z packages/enrichment/CLAUDE.md:
    # scoring nie może być czarną skrzynką, dashboard musi umieć pokazać "dlaczego taki wynik".
    score_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    contacts: Mapped[list["Contact"]] = relationship(back_populates="company", cascade="all, delete-orphan")
