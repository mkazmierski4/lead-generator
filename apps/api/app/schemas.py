import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.company import LeadSource, WebsiteStatus


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    phone: str | None
    verified: bool


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
    created_at: datetime
    contacts: list[ContactOut] = []
