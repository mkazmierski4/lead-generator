"""Silnik kampanii: kolejka, zabezpieczenia, limit dzienny i wysyłka w tle.

Twarde zasady z root CLAUDE.md są egzekwowane TUTAJ, nie w UI:
- przed KAŻDYM mailem ponownie sprawdzamy wykluczenia, suppression list i historię kontaktu,
- dzienny limit (z harmonogramem rozgrzewania) blokuje wysyłkę niezależnie od długości kolejki,
- wysyłka domyślnie jest próbna (`dry_run=True`), prawdziwa wymaga jawnego `dry_run=False`,
- stopka z danymi nadawcy i sposobem wypisania jest doklejana zawsze i nie da się jej usunąć.
"""

import logging
import random
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.db import SessionLocal
from app.models.campaign import Campaign, CampaignStatus
from app.models.company import Company
from app.models.contact import Contact, ContactSource
from app.models.send_log import DELIVERED_STATUSES, SendLog, SendStatus
from app.models.suppression import SuppressionEntry
from mailer import smtp
from mailer.templates import Sender, footer, problem_sentence, render
from mailer.warmup import daily_cap

logger = logging.getLogger(__name__)

LOCAL_TZ = ZoneInfo("Europe/Warsaw")
MAX_CONSECUTIVE_FAILURES = 3


class MailerError(RuntimeError):
    pass


# ---------- konfiguracja ----------

def current_sender() -> Sender:
    return Sender(name=settings.sender_name, email=settings.sender_email, identity=settings.sender_identity)


def smtp_config() -> smtp.SmtpConfig:
    return smtp.SmtpConfig(settings.smtp_host, settings.smtp_port, settings.smtp_user, settings.smtp_password)


def _today_local() -> date:
    return datetime.now(LOCAL_TZ).date()


def _start_of_today_utc() -> datetime:
    local_midnight = datetime.combine(_today_local(), datetime.min.time(), tzinfo=LOCAL_TZ)
    return local_midnight.astimezone(timezone.utc)


def cap_today() -> int:
    return daily_cap(_today_local(), settings.warmup_start, settings.daily_send_limit)


def sent_today(db: Session) -> int:
    return db.execute(
        select(func.count()).select_from(SendLog).where(
            SendLog.status.in_(DELIVERED_STATUSES), SendLog.sent_at >= _start_of_today_utc()
        )
    ).scalar_one()


def remaining_today(db: Session) -> int:
    return max(0, cap_today() - sent_today(db))


# ---------- wybór adresu i zabezpieczenia ----------

def pick_contact(company: Company, allow_guessed: bool) -> Contact | None:
    with_email = [c for c in company.contacts if c.email]
    confirmed = [c for c in with_email if c.verified]
    if confirmed:
        # ręcznie dopisany adres ma pierwszeństwo przed znalezionym na stronie
        return sorted(confirmed, key=lambda c: c.source != ContactSource.MANUAL)[0]
    if allow_guessed and with_email:
        return with_email[0]
    return None


def blocking_reason(db: Session, company: Company, email: str, ignore_log_id: uuid.UUID | None = None) -> str | None:
    if company.excluded_at is not None:
        return "Firma jest wykluczona"

    normalized = email.strip().lower()
    if db.execute(select(SuppressionEntry.id).where(SuppressionEntry.email == normalized)).first():
        return "Adres jest na liście wykluczeń"

    delivered = select(SendLog.id).where(
        SendLog.status.in_(DELIVERED_STATUSES),
        (SendLog.company_id == company.id) | (func.lower(SendLog.email) == normalized),
    )
    if ignore_log_id is not None:
        delivered = delivered.where(SendLog.id != ignore_log_id)
    if db.execute(delivered).first():
        return "Ta firma już dostała od nas wiadomość"
    return None


# ---------- kolejka ----------

@dataclass
class QueueResult:
    queued: int = 0
    skipped: list[dict[str, str]] = field(default_factory=list)


def queue_companies(db: Session, campaign: Campaign, company_ids: list[uuid.UUID]) -> QueueResult:
    result = QueueResult()
    companies = db.execute(
        select(Company).options(selectinload(Company.contacts)).where(Company.id.in_(company_ids))
    ).scalars().all()

    for company in companies:
        def skip(reason: str) -> None:
            result.skipped.append({"company_id": str(company.id), "name": company.name, "reason": reason})

        contact = pick_contact(company, campaign.allow_guessed_emails)
        if contact is None:
            has_guess = any(c.email for c in company.contacts)
            skip("Tylko odgadnięty e-mail (kampania przyjmuje tylko potwierdzone)" if has_guess else "Brak adresu e-mail")
            continue

        reason = blocking_reason(db, company, contact.email or "")
        if reason:
            skip(reason)
            continue

        in_this = db.execute(
            select(SendLog).where(SendLog.campaign_id == campaign.id, SendLog.company_id == company.id)
        ).scalars().first()
        if in_this is not None:
            if in_this.status == SendStatus.FAILED:
                # nieudaną wysyłkę (np. chwilowy błąd skrzynki) można świadomie ponowić
                in_this.status, in_this.error, in_this.email, in_this.contact_id = SendStatus.QUEUED, None, contact.email, contact.id
                result.queued += 1
            else:
                skip("Już w tej kampanii")
            continue

        queued_elsewhere = db.execute(
            select(SendLog.id).where(SendLog.company_id == company.id, SendLog.status == SendStatus.QUEUED)
        ).first()
        if queued_elsewhere:
            skip("Już czeka w kolejce innej kampanii")
            continue

        db.add(SendLog(campaign_id=campaign.id, contact_id=contact.id, company_id=company.id, email=contact.email))
        result.queued += 1

    db.commit()
    return result


def dequeue(db: Session, campaign: Campaign, log_id: uuid.UUID) -> None:
    log = db.get(SendLog, log_id)
    if log is None or log.campaign_id != campaign.id:
        raise MailerError("Nie ma takiej pozycji w kolejce")
    if log.status != SendStatus.QUEUED:
        raise MailerError("Ta wiadomość już nie czeka w kolejce")
    db.delete(log)
    db.commit()


# ---------- renderowanie ----------

def context_for(company: Company, industry_label: str, sender: Sender) -> dict[str, str]:
    return {
        "firma": company.name,
        "miasto": company.city or "",
        "branza": industry_label.lower(),
        "problem": problem_sentence(company.website_status.value),
        "strona": company.website_url or "",
        "nadawca": sender.name or "[Twoje imię i nazwisko]",
    }


def render_mail(campaign: Campaign, company: Company, industry_label: str, sender: Sender) -> tuple[str, str]:
    ctx = context_for(company, industry_label, sender)
    subject = render(campaign.subject_template, ctx).strip()
    body = render(campaign.body_template, ctx).rstrip() + footer(_footer_sender(sender))
    return subject, body


def _footer_sender(sender: Sender) -> Sender:
    # W podglądzie, zanim nadawca jest skonfigurowany, pokazujemy wyraźne miejsca do uzupełnienia.
    return Sender(
        name=sender.name or "[Twoje imię i nazwisko]",
        email=sender.email or "[adres nadawcy]",
        identity=sender.identity or "[Nazwa firmy, adres, NIP]",
    )


# ---------- wysyłka ----------

_running: dict[uuid.UUID, threading.Event] = {}
_lock = threading.Lock()


def is_sending(campaign_id: uuid.UUID) -> bool:
    with _lock:
        return campaign_id in _running


@dataclass
class SendPlan:
    dry_run: bool
    would_send: int
    queued: int
    remaining_today: int
    started: bool = False


def send_campaign(db: Session, campaign: Campaign, industry_labels: dict[str, str], dry_run: bool = True) -> SendPlan:
    queued = db.execute(
        select(func.count()).select_from(SendLog).where(SendLog.campaign_id == campaign.id, SendLog.status == SendStatus.QUEUED)
    ).scalar_one()
    remaining = remaining_today(db)
    plan = SendPlan(dry_run=dry_run, would_send=min(queued, remaining), queued=queued, remaining_today=remaining)
    if dry_run:
        return plan

    sender = current_sender()
    missing = sender.missing()
    if missing:
        raise MailerError(f"Uzupełnij w .env dane nadawcy: {', '.join(missing)}")
    if not smtp_config().configured:
        raise MailerError("Brak skonfigurowanej skrzynki (SMTP_HOST w .env)")
    if queued == 0:
        raise MailerError("Kolejka tej kampanii jest pusta")
    if remaining == 0:
        raise MailerError("Dzienny limit wysyłki jest wyczerpany. Wróć jutro.")

    with _lock:
        if campaign.id in _running:
            raise MailerError("Ta kampania już wysyła")
        stop = threading.Event()
        _running[campaign.id] = stop

    campaign.status = CampaignStatus.ACTIVE
    db.commit()
    threading.Thread(target=_send_loop, args=(campaign.id, industry_labels, stop), daemon=True).start()
    plan.started = True
    return plan


def stop_campaign(campaign_id: uuid.UUID) -> bool:
    with _lock:
        stop = _running.get(campaign_id)
    if stop is None:
        return False
    stop.set()
    return True


def _send_loop(campaign_id: uuid.UUID, industry_labels: dict[str, str], stop: threading.Event) -> None:
    db = SessionLocal()
    sender = current_sender()
    config = smtp_config()
    failures = 0
    try:
        while not stop.is_set():
            if remaining_today(db) <= 0:
                break

            log = db.execute(
                select(SendLog).where(SendLog.campaign_id == campaign_id, SendLog.status == SendStatus.QUEUED)
                .order_by(SendLog.created_at).limit(1)
            ).scalar_one_or_none()
            if log is None:
                break

            campaign = db.get(Campaign, campaign_id)
            company = db.execute(
                select(Company).options(selectinload(Company.contacts)).where(Company.id == log.company_id)
            ).scalar_one()

            reason = blocking_reason(db, company, log.email or "", ignore_log_id=log.id)
            if reason:
                log.status = SendStatus.SKIPPED
                log.error = reason
                db.commit()
                continue

            subject, body = render_mail(campaign, company, industry_labels.get(company.industry or "", company.industry or ""), sender)
            log.subject, log.body = subject, body
            try:
                smtp.send(config, smtp.OutgoingMail(to=log.email or "", subject=subject, body=body, from_name=sender.name, from_email=sender.email))
                log.status = SendStatus.SENT
                log.sent_at = datetime.now(timezone.utc)
                log.error = None
                failures = 0
            except Exception as exc:  # noqa: BLE001 -- każdy błąd SMTP ma trafić do historii, nie wywalić wątku
                logger.exception("Wysyłka do %s nie powiodła się", log.email)
                log.status = SendStatus.FAILED
                log.error = str(exc)[:500]
                failures += 1
            db.commit()

            if failures >= MAX_CONSECUTIVE_FAILURES:
                # Kilka błędów pod rząd to prawie zawsze problem z konfiguracją skrzynki -- nie męczymy jej dalej.
                break

            # Losowy odstęp, żeby wysyłka wyglądała jak normalna korespondencja, a nie seria.
            stop.wait(random.uniform(settings.send_delay_min_s, settings.send_delay_max_s))
    finally:
        campaign = db.get(Campaign, campaign_id)
        if campaign is not None:
            left = db.execute(
                select(func.count()).select_from(SendLog).where(SendLog.campaign_id == campaign_id, SendLog.status == SendStatus.QUEUED)
            ).scalar_one()
            campaign.status = CampaignStatus.COMPLETED if left == 0 and failures < MAX_CONSECUTIVE_FAILURES else CampaignStatus.PAUSED
            db.commit()
        db.close()
        with _lock:
            _running.pop(campaign_id, None)


def send_test(campaign: Campaign, company: Company, industry_label: str, to: str) -> None:
    """Jeden mail testowy na wskazany adres (zwykle własny). Nie trafia do historii ani limitu."""
    if not smtp_config().configured:
        raise MailerError("Brak skonfigurowanej skrzynki (SMTP_HOST w .env)")
    sender = current_sender()
    subject, body = render_mail(campaign, company, industry_label, sender)
    smtp.send(
        smtp_config(),
        smtp.OutgoingMail(
            to=to,
            subject=f"[TEST] {subject}",
            body=body,
            from_name=sender.name or "Test",
            from_email=sender.email or "test@localhost",
        ),
    )
