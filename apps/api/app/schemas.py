import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, model_validator

from app.models.company import LeadSource, WebsiteStatus
from app.models.run import RunKind


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    phone: str | None
    verified: bool


class ContactIn(BaseModel):
    email: EmailStr | None = None
    phone: str | None = None

    @model_validator(mode="after")
    def at_least_one(self) -> "ContactIn":
        if not self.email and not (self.phone and self.phone.strip()):
            raise ValueError("Podaj e-mail albo telefon")
        return self


class CompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    industry: str | None
    country: str
    city: str | None
    address: str | None
    phone: str | None
    website_url: str | None
    website_status: WebsiteStatus
    registered_at: date | None
    source: LeadSource
    score: float | None
    score_explanation: str | None
    enriched_at: datetime | None
    excluded_at: datetime | None
    created_at: datetime
    contacts: list[ContactOut] = []


class CompanyStats(BaseModel):
    total: int
    ready: int
    enriched: int
    awaiting_enrichment: int
    by_status: dict[WebsiteStatus, int]


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: RunKind
    params: dict[str, Any]
    result: dict[str, Any]
    created_at: datetime
