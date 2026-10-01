import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models.campaign import Campaign
from app.models.company import Company, WebsiteStatus
from app.models.send_log import DELIVERED_STATUSES, SendLog, SendStatus
from app.schemas import (
    CampaignIn,
    CampaignOut,
    CampaignUpdate,
    MailerStatus,
    QueueIn,
    QueueItemOut,
    QueueResultOut,
    RenderedMail,
    RenderIn,
    SendIn,
    SendPlanOut,
    TestSendIn,
    validate_template,
)
from app.services import mailer_service as mailer
from discovery.industries import INDUSTRIES
from mailer.starters import STARTERS
from mailer.templates import VARIABLES, TemplateError

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

INDUSTRY_LABELS = {key: m.label_pl for key, m in INDUSTRIES.items()}


def _label(industry: str | None) -> str:
    return INDUSTRY_LABELS.get(industry or "", industry or "")


def _get(db: Session, campaign_id: uuid.UUID) -> Campaign:
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej kampanii")
    return campaign


def _out(db: Session, campaign: Campaign) -> CampaignOut:
    counts = {status: 0 for status in SendStatus}
    for status, n in db.execute(
        select(SendLog.status, func.count()).where(SendLog.campaign_id == campaign.id).group_by(SendLog.status)
    ).all():
        counts[status] = n
    return CampaignOut(
        id=campaign.id,
        name=campaign.name,
        language=campaign.language,
        subject_template=campaign.subject_template,
        body_template=campaign.body_template,
        allow_guessed_emails=campaign.allow_guessed_emails,
        status=campaign.status,
        created_at=campaign.created_at,
        counts=counts,
        sending=mailer.is_sending(campaign.id),
    )


def _bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


@router.get("/meta", response_model=MailerStatus)
def mailer_status(db: Session = Depends(get_db)) -> MailerStatus:
    sender = mailer.current_sender()
    missing = sender.missing()
    sent = mailer.sent_today(db)
    cap = mailer.cap_today()
    return MailerStatus(
        sender_configured=not missing,
        sender_missing=missing,
        sender_name=sender.name,
        sender_email=sender.email,
        smtp_configured=mailer.smtp_config().configured,
        cap_today=cap,
        sent_today=sent,
        remaining_today=max(0, cap - sent),
        daily_send_limit=mailer.settings.daily_send_limit,
        warmup_start=mailer.settings.warmup_start,
        send_delay_min_s=mailer.settings.send_delay_min_s,
        send_delay_max_s=mailer.settings.send_delay_max_s,
        smtp_is_test=mailer.is_test_mailbox(),
        variables=VARIABLES,
    )


@router.get("/starters")
def starter_templates() -> list[dict[str, str]]:
    return STARTERS


@router.post("/render", response_model=RenderedMail)
def render_template(payload: RenderIn, db: Session = Depends(get_db)) -> RenderedMail:
    """Podgląd szablonu na prawdziwej firmie -- wskazanej albo najlepiej ocenionej bez strony."""
    try:
        validate_template(payload.subject_template, payload.body_template)
    except ValueError as exc:
        raise _bad_request(exc) from exc

    stmt = select(Company).options(selectinload(Company.contacts)).where(Company.excluded_at.is_(None))
    if payload.company_id:
        stmt = stmt.where(Company.id == payload.company_id)
    else:
        stmt = stmt.where(Company.website_status == WebsiteStatus.NONE).order_by(Company.score.desc().nulls_last())
    company = db.execute(stmt.limit(1)).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Brak firmy do podglądu. Najpierw znajdź leady.")

    draft = Campaign(name="", subject_template=payload.subject_template, body_template=payload.body_template)
    try:
        subject, body = mailer.render_mail(draft, company, _label(company.industry), mailer.current_sender())
    except TemplateError as exc:
        raise _bad_request(exc) from exc
    contact = mailer.pick_contact(company, allow_guessed=True)
    return RenderedMail(
        company_id=company.id,
        company_name=company.name,
        email=contact.email if contact else None,
        subject=subject,
        body=body,
        context=mailer.context_for(company, _label(company.industry), mailer.current_sender()),
    )


@router.get("", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)) -> list[CampaignOut]:
    campaigns = db.execute(select(Campaign).order_by(Campaign.created_at.desc())).scalars().all()
    return [_out(db, c) for c in campaigns]


@router.post("", response_model=CampaignOut, status_code=201)
def create_campaign(payload: CampaignIn, db: Session = Depends(get_db)) -> CampaignOut:
    campaign = Campaign(
        name=payload.name.strip(),
        language=payload.language,
        subject_template=payload.subject_template.strip(),
        body_template=payload.body_template.strip(),
        allow_guessed_emails=payload.allow_guessed_emails,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return _out(db, campaign)


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: uuid.UUID, db: Session = Depends(get_db)) -> CampaignOut:
    return _out(db, _get(db, campaign_id))


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: uuid.UUID, payload: CampaignUpdate, db: Session = Depends(get_db)) -> CampaignOut:
    campaign = _get(db, campaign_id)
    if mailer.is_sending(campaign.id):
        raise HTTPException(status_code=409, detail="Zatrzymaj wysyłkę przed edycją kampanii")
    subject = payload.subject_template if payload.subject_template is not None else campaign.subject_template
    body = payload.body_template if payload.body_template is not None else campaign.body_template
    try:
        validate_template(subject, body)
    except ValueError as exc:
        raise _bad_request(exc) from exc
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Podaj nazwę kampanii")
        campaign.name = payload.name.strip()
    campaign.subject_template, campaign.body_template = subject.strip(), body.strip()
    if payload.allow_guessed_emails is not None:
        campaign.allow_guessed_emails = payload.allow_guessed_emails
    db.commit()
    return _out(db, campaign)


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    campaign = _get(db, campaign_id)
    delivered = db.execute(
        select(SendLog.id).where(SendLog.campaign_id == campaign.id, SendLog.status.in_(DELIVERED_STATUSES))
    ).first()
    if delivered:
        # Usunięcie skasowałoby historię wysyłek, a ona chroni przed ponownym kontaktem z tymi samymi firmami.
        raise HTTPException(status_code=409, detail="Kampanii, z której wyszły już maile, nie można usunąć")
    if mailer.is_sending(campaign.id):
        raise HTTPException(status_code=409, detail="Zatrzymaj wysyłkę przed usunięciem kampanii")
    db.delete(campaign)
    db.commit()
    return Response(status_code=204)


@router.get("/{campaign_id}/queue", response_model=list[QueueItemOut])
def campaign_queue(
    campaign_id: uuid.UUID,
    status: SendStatus | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
) -> list[QueueItemOut]:
    _get(db, campaign_id)
    stmt = (
        select(SendLog, Company)
        .join(Company, Company.id == SendLog.company_id)
        .where(SendLog.campaign_id == campaign_id)
        .order_by(SendLog.sent_at.desc().nulls_first(), SendLog.created_at)
        .limit(limit)
    )
    if status:
        stmt = stmt.where(SendLog.status == status)
    return [
        QueueItemOut(
            id=log.id,
            company_id=company.id,
            company_name=company.name,
            city=company.city,
            industry=company.industry,
            email=log.email,
            status=log.status,
            sent_at=log.sent_at,
            error=log.error,
            subject=log.subject,
            body=log.body,
        )
        for log, company in db.execute(stmt).all()
    ]


@router.post("/{campaign_id}/queue", response_model=QueueResultOut)
def add_to_queue(campaign_id: uuid.UUID, payload: QueueIn, db: Session = Depends(get_db)) -> QueueResultOut:
    campaign = _get(db, campaign_id)
    result = mailer.queue_companies(db, campaign, payload.company_ids)
    return QueueResultOut(queued=result.queued, skipped=result.skipped)


@router.delete("/{campaign_id}/queue/{log_id}", status_code=204)
def remove_from_queue(campaign_id: uuid.UUID, log_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    try:
        mailer.dequeue(db, _get(db, campaign_id), log_id)
    except mailer.MailerError as exc:
        raise _bad_request(exc) from exc
    return Response(status_code=204)


@router.get("/{campaign_id}/preview", response_model=list[RenderedMail])
def preview_next(campaign_id: uuid.UUID, limit: int = Query(default=3, le=20), db: Session = Depends(get_db)) -> list[RenderedMail]:
    campaign = _get(db, campaign_id)
    rows = db.execute(
        select(SendLog, Company)
        .join(Company, Company.id == SendLog.company_id)
        .where(SendLog.campaign_id == campaign.id, SendLog.status == SendStatus.QUEUED)
        .order_by(SendLog.created_at)
        .limit(limit)
    ).all()
    sender = mailer.current_sender()
    out = []
    for log, company in rows:
        subject, body = mailer.render_mail(campaign, company, _label(company.industry), sender)
        out.append(RenderedMail(company_id=company.id, company_name=company.name, email=log.email, subject=subject, body=body))
    return out


@router.post("/{campaign_id}/send", response_model=SendPlanOut)
def send(campaign_id: uuid.UUID, payload: SendIn, db: Session = Depends(get_db)) -> SendPlanOut:
    campaign = _get(db, campaign_id)
    try:
        plan = mailer.send_campaign(db, campaign, INDUSTRY_LABELS, dry_run=payload.dry_run)
    except mailer.MailerError as exc:
        raise _bad_request(exc) from exc
    return SendPlanOut(**plan.__dict__)


@router.post("/{campaign_id}/stop")
def stop(campaign_id: uuid.UUID, db: Session = Depends(get_db)) -> dict[str, bool]:
    _get(db, campaign_id)
    return {"stopping": mailer.stop_campaign(campaign_id)}


@router.post("/{campaign_id}/test", status_code=204)
def send_test(campaign_id: uuid.UUID, payload: TestSendIn, db: Session = Depends(get_db)) -> Response:
    campaign = _get(db, campaign_id)
    row = db.execute(
        select(Company)
        .join(SendLog, SendLog.company_id == Company.id)
        .where(SendLog.campaign_id == campaign.id, SendLog.status == SendStatus.QUEUED)
        .limit(1)
    ).scalar_one_or_none()
    company = row or db.execute(
        select(Company).where(Company.excluded_at.is_(None)).order_by(Company.score.desc().nulls_last()).limit(1)
    ).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Brak firmy do wygenerowania testu")
    try:
        mailer.send_test(campaign, company, _label(company.industry), payload.to)
    except mailer.MailerError as exc:
        raise _bad_request(exc) from exc
    except Exception as exc:  # noqa: BLE001 -- błąd SMTP pokazujemy wprost, bo to test konfiguracji
        raise HTTPException(status_code=502, detail=f"Skrzynka odrzuciła wysyłkę: {exc}") from exc
    return Response(status_code=204)
