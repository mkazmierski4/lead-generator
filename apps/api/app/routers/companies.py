import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models.company import Company, WebsiteStatus
from app.schemas import CompanyOut

router = APIRouter(prefix="/companies", tags=["companies"])


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
    stmt = select(Company).options(selectinload(Company.contacts))

    if country:
        stmt = stmt.where(Company.country == country.upper())
    if industry:
        stmt = stmt.where(Company.industry == industry)
    if website_status:
        stmt = stmt.where(Company.website_status == website_status)
    if min_score is not None:
        stmt = stmt.where(Company.score >= min_score)

    stmt = stmt.order_by(Company.score.desc().nulls_last()).limit(limit).offset(offset)

    return list(db.execute(stmt).scalars().all())


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> Company:
    stmt = select(Company).options(selectinload(Company.contacts)).where(Company.id == company_id)
    company = db.execute(stmt).scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
