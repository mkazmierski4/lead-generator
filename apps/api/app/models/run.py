import enum
import uuid
from typing import Any

from sqlalchemy import Enum, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.mixins import TimestampMixin


class RunKind(str, enum.Enum):
    DISCOVERY = "discovery"
    ENRICHMENT = "enrichment"


class Run(TimestampMixin, Base):
    """Historia uruchomień discovery/enrichment -- źródło dla historii wyszukiwań i osi aktywności w UI."""

    __tablename__ = "runs"
    __table_args__ = (Index("ix_runs_created_at", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind: Mapped[RunKind] = mapped_column(Enum(RunKind, name="run_kind"), nullable=False)
    params: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    result: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
