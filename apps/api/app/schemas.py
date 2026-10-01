import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, model_validator

from app.models.campaign import CampaignStatus
from app.models.company import LeadSource, WebsiteStatus
from app.models.run import RunKind
from app.models.send_log import SendStatus
from mailer.templates import TemplateError
from mailer.templates import validate as validate_templates


def validate_template(subject: str, body: str) -> None:
    try:
        validate_templates(subject, body)
    except TemplateError as exc:
        raise ValueError(str(exc)) from exc


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


class CampaignIn(BaseModel):
    name: str
    subject_template: str
    body_template: str
    allow_guessed_emails: bool = False
    language: str = "pl"

    @model_validator(mode="after")
    def check(self) -> "CampaignIn":
        if not self.name.strip():
            raise ValueError("Podaj nazwę kampanii")
        validate_template(self.subject_template, self.body_template)
        return self


class CampaignUpdate(BaseModel):
    name: str | None = None
    subject_template: str | None = None
    body_template: str | None = None
    allow_guessed_emails: bool | None = None


class CampaignOut(BaseModel):
    id: uuid.UUID
    name: str
    language: str
    subject_template: str
    body_template: str
    allow_guessed_emails: bool
    status: CampaignStatus
    created_at: datetime
    counts: dict[SendStatus, int]
    sending: bool


class QueueItemOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    city: str | None
    industry: str | None
    email: str | None
    status: SendStatus
    sent_at: datetime | None
    error: str | None
    subject: str | None
    body: str | None


class QueueIn(BaseModel):
    company_ids: list[uuid.UUID]


class QueueResultOut(BaseModel):
    queued: int
    skipped: list[dict[str, str]]


class RenderIn(BaseModel):
    subject_template: str
    body_template: str
    company_id: uuid.UUID | None = None


class RenderedMail(BaseModel):
    company_id: uuid.UUID | None
    company_name: str
    email: str | None
    subject: str
    body: str


class SendIn(BaseModel):
    dry_run: bool = True


class SendPlanOut(BaseModel):
    dry_run: bool
    would_send: int
    queued: int
    remaining_today: int
    started: bool


class TestSendIn(BaseModel):
    to: EmailStr


class MailerStatus(BaseModel):
    sender_configured: bool
    sender_missing: list[str]
    sender_name: str
    sender_email: str
    smtp_configured: bool
    cap_today: int
    sent_today: int
    remaining_today: int
    daily_send_limit: int
    warmup_start: date | None
    variables: dict[str, str]


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: RunKind
    params: dict[str, Any]
    result: dict[str, Any]
    created_at: datetime
