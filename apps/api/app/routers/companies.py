import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models.campaign import Campaign
from app.models.company import Company, WebsiteStatus
from app.models.contact import Contact, ContactSource
from app.models.send_log import SendLog
from app.models.suppression import SuppressionEntry, SuppressionReason
from app.schemas import CompanyOut, CompanySendOut, CompanyStats, ContactIn
from app.services.enrichment_service import rescore

router = APIRouter(prefix="/companies", tags=["companies"])

ACTIONABLE_STATUSES = (WebsiteStatus.NONE, WebsiteStatus.DEAD, WebsiteStatus.OUTDATED)


def _base_filters(stmt: Select, country: str | None, industry: str | None, q: str | None) -> Select:
    stmt = stmt.where(Company.excluded_at.is_(None))
    if country:
        stmt = stmt.where(Company.country == country.upper())
    if industry:
        stmt = stmt.where(Company.industry == industry)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(Company.name.ilike(pattern), Company.city.ilike(pattern)))
    return stmt


def _filtered_companies_stmt(
    country: str | None,
    industry: str | None,
    website_status: WebsiteStatus | None,
    min_score: float | None,
    q: str | None,
) -> Select:
    stmt = _base_filters(select(Company), country, industry, q)
    if website_status:
        stmt = stmt.where(Company.website_status == website_status)
    if min_score is not None:
        stmt = stmt.where(Company.score >= min_score)
    return stmt.order_by(Company.score.desc().nulls_last(), Company.created_at.desc())


def _get_or_404(db: Session, company_id: uuid.UUID) -> Company:
    stmt = select(Company).options(selectinload(Company.contacts)).where(Company.id == company_id)
    company = db.execute(stmt).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Nie ma takiej firmy")
    return company


@router.get("", response_model=list[CompanyOut])
def list_companies(
    country: str | None = Query(default=None, description="Kod kraju ISO 3166-1 alpha-2, np. PL"),
    industry: str | None = Query(default=None),
    website_status: WebsiteStatus | None = Query(default=None),
    min_score: float | None = Query(default=None),
    q: str | None = Query(default=None, description="Szukaj po nazwie firmy lub mieście"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Company]:
    stmt = _filtered_companies_stmt(country, industry, website_status, min_score, q)
    stmt = stmt.options(selectinload(Company.contacts)).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


@router.get("/stats", response_model=CompanyStats)
def company_stats(
    country: str | None = Query(default=None),
    industry: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> CompanyStats:
    by_status_stmt = _base_filters(
        select(Company.website_status, func.count()), country, industry, q
    ).group_by(Company.website_status)
    by_status = {status: 0 for status in WebsiteStatus}
    for status, count in db.execute(by_status_stmt).all():
        by_status[status] = count

    enriched = db.execute(
        _base_filters(select(func.count()).select_from(Company), country, industry, q).where(
            Company.enriched_at.is_not(None)
        )
    ).scalar_one()
    ready = db.execute(
        _base_filters(select(func.count()).select_from(Company), country, industry, q).where(
            Company.website_status.in_(ACTIONABLE_STATUSES), Company.score > 0
        )
    ).scalar_one()
    total = sum(by_status.values())

    return CompanyStats(
        total=total,
        ready=ready,
        enriched=enriched,
        awaiting_enrichment=total - enriched,
        by_status=by_status,
    )


@router.get("/export.csv")
def export_companies_csv(
    country: str | None = Query(default=None),
    industry: str | None = Query(default=None),
    website_status: WebsiteStatus | None = Query(default=None),
    min_score: float | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    stmt = _filtered_companies_stmt(country, industry, website_status, min_score, q)
    companies = db.execute(stmt).scalars().all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["name", "industry", "country", "city", "address", "phone", "website_url", "website_status", "score", "source"]
    )
    for c in companies:
        writer.writerow(
            [c.name, c.industry, c.country, c.city, c.address, c.phone, c.website_url, c.website_status.value, c.score, c.source.value]
        )
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=companies.csv"},
    )


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> Company:
    return _get_or_404(db, company_id)


@router.get("/{company_id}/sends", response_model=list[CompanySendOut])
def company_sends(company_id: uuid.UUID, db: Session = Depends(get_db)) -> list[CompanySendOut]:
    _get_or_404(db, company_id)
    rows = db.execute(
        select(SendLog, Campaign.name)
        .join(Campaign, Campaign.id == SendLog.campaign_id)
        .where(SendLog.company_id == company_id)
        .order_by(SendLog.created_at.desc())
    ).all()
    return [
        CompanySendOut(
            id=log.id,
            campaign_id=log.campaign_id,
            campaign_name=name,
            status=log.status,
            email=log.email,
            sent_at=log.sent_at,
            created_at=log.created_at,
            error=log.error,
        )
        for log, name in rows
    ]


@router.post("/{company_id}/exclude", response_model=CompanyOut)
def exclude_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> Company:
    company = _get_or_404(db, company_id)
    if company.excluded_at is None:
        company.excluded_at = datetime.now(timezone.utc)

    for contact in company.contacts:
        if not contact.email:
            continue
        email = contact.email.strip().lower()
        exists = db.execute(select(SuppressionEntry.id).where(SuppressionEntry.email == email)).first()
        if not exists:
            db.add(SuppressionEntry(email=email, reason=SuppressionReason.MANUAL))

    db.commit()
    db.refresh(company)
    return company


@router.post("/{company_id}/contacts", response_model=CompanyOut, status_code=201)
def add_contact(company_id: uuid.UUID, payload: ContactIn, db: Session = Depends(get_db)) -> Company:
    company = _get_or_404(db, company_id)
    company.contacts.append(
        Contact(
            email=payload.email.lower() if payload.email else None,
            phone=payload.phone.strip() if payload.phone else None,
            source=ContactSource.MANUAL,
            verified=True,
        )
    )
    rescore(db, company)
    db.commit()
    db.refresh(company)
    return company
