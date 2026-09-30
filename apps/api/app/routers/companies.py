import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models.company import Company, WebsiteStatus
from app.schemas import CompanyOut

router = APIRouter(prefix="/companies", tags=["companies"])


def _filtered_companies_stmt(
    country: str | None,
    industry: str | None,
    website_status: WebsiteStatus | None,
    min_score: float | None,
) -> Select:
    stmt = select(Company)

    if country:
        stmt = stmt.where(Company.country == country.upper())
    if industry:
        stmt = stmt.where(Company.industry == industry)
    if website_status:
        stmt = stmt.where(Company.website_status == website_status)
    if min_score is not None:
        stmt = stmt.where(Company.score >= min_score)

    return stmt.order_by(Company.score.desc().nulls_last())


@router.get("", response_model=list[CompanyOut])
def list_companies(
    country: str | None = Query(default=None, description="Kod kraju ISO 3166-1 alpha-2, np. PL"),
    industry: str | None = Query(default=None),
    website_status: WebsiteStatus | None = Query(default=None),
    min_score: float | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Company]:
    stmt = _filtered_companies_stmt(country, industry, website_status, min_score)
    stmt = stmt.options(selectinload(Company.contacts)).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


@router.get("/export.csv")
def export_companies_csv(
    country: str | None = Query(default=None),
    industry: str | None = Query(default=None),
    website_status: WebsiteStatus | None = Query(default=None),
    min_score: float | None = Query(default=None),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    stmt = _filtered_companies_stmt(country, industry, website_status, min_score)
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
    stmt = select(Company).options(selectinload(Company.contacts)).where(Company.id == company_id)
    company = db.execute(stmt).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
