import re
from dataclasses import dataclass
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company, WebsiteStatus
from app.models.contact import Contact, ContactSource
from app.models.run import Run, RunKind
from app.models.send_log import SendLog
from enrichment.email_finder import find_in_html, guess_pattern
from enrichment.models import EmailFindResult
from enrichment.website_checker import analyze, fetch

YOUNG_COMPANY_YEARS = 3

_STATUS_MAP = {"dead": WebsiteStatus.DEAD, "outdated": WebsiteStatus.OUTDATED, "ok": WebsiteStatus.OK}


@dataclass
class EnrichmentRunResult:
    processed: int


def run_enrichment(db: Session, limit: int = 50) -> EnrichmentRunResult:
    companies = db.execute(
        select(Company).where(Company.enriched_at.is_(None), Company.excluded_at.is_(None)).limit(limit)
    ).scalars().all()

    for company in companies:
        _enrich_company(db, company)

    if companies:
        db.add(Run(kind=RunKind.ENRICHMENT, params={"limit": limit}, result={"processed": len(companies)}))
    db.commit()
    return EnrichmentRunResult(processed=len(companies))


def _enrich_company(db: Session, company: Company) -> None:
    reasons: list[str] = []
    html: str | None = None

    if company.website_url:
        response, fetch_notes = fetch(company.website_url)
        check = analyze(response, fetch_notes)
        company.website_status = _STATUS_MAP[check.status]
        reasons.extend(check.reasons)
        if response is not None:
            html = response.text
    else:
        # discovery_service ustawia NONE już przy zapisie, ale enrichment nie polega na tym --
        # egzekwuje to sam, żeby dać poprawny wynik też dla danych zapisanych przed tą regułą.
        company.website_status = WebsiteStatus.NONE

    if not company.contacts and company.website_url:
        find_result = find_in_html(html, company.website_url) if html else EmailFindResult(email=None, verified=False, reasons=[])
        if not find_result.email:
            find_result = guess_pattern(company.website_url)
        if find_result.email:
            company.contacts.append(
                Contact(
                    email=find_result.email,
                    source=ContactSource.WEBSITE_SCRAPE if find_result.verified else ContactSource.PATTERN_GUESS,
                    verified=find_result.verified,
                )
            )
        reasons.extend(find_result.reasons)

    score, score_reasons = _score(db, company)
    company.score = score
    company.score_explanation = "; ".join(reasons + score_reasons)
    company.enriched_at = datetime.now(timezone.utc)


_POINTS_SUFFIX = re.compile(r"\([+-]\d+(\.\d+)?\)$")


def rescore(db: Session, company: Company) -> None:
    """Przelicza wynik po ręcznej zmianie (np. dopisanym kontakcie), zachowując obserwacje ze sprawdzenia strony."""
    if company.enriched_at is None:
        return
    observations = [
        part for part in (company.score_explanation or "").split("; ")
        if part and not _POINTS_SUFFIX.search(part)
    ]
    score, score_reasons = _score(db, company)
    company.score = score
    company.score_explanation = "; ".join(observations + score_reasons)


_STATUS_POINTS: dict[WebsiteStatus, tuple[float, str]] = {
    WebsiteStatus.NONE: (40, "Brak strony internetowej"),
    WebsiteStatus.DEAD: (35, "Strona nie działa"),
    WebsiteStatus.OUTDATED: (20, "Strona przestarzała / ma problemy"),
    WebsiteStatus.OK: (0, "Strona działa poprawnie (niski priorytet)"),
    WebsiteStatus.UNKNOWN: (0, "Strona jeszcze nie sprawdzona"),
}


def _score(db: Session, company: Company) -> tuple[float, list[str]]:
    score = 0.0
    reasons = []

    points, label = _STATUS_POINTS[company.website_status]
    score += points
    reasons.append(f"{label} ({'+' if points >= 0 else ''}{points:g})")

    if company.registered_at:
        age_years = (date.today() - company.registered_at).days / 365
        if age_years <= YOUNG_COMPANY_YEARS:
            score += 15
            reasons.append(f"Młoda firma, ~{age_years:.1f} roku (+15)")
        else:
            reasons.append(f"Firma działa od ~{age_years:.0f} lat (+0)")

    has_contact = bool(company.phone) or bool(company.contacts)
    if has_contact:
        score += 10
        reasons.append("Są dane kontaktowe (+10)")
    else:
        score -= 10
        reasons.append("Brak jakichkolwiek danych kontaktowych (-10)")

    already_contacted = db.execute(select(SendLog.id).where(SendLog.company_id == company.id)).first()
    if already_contacted:
        score -= 1000
        reasons.append("Już kontaktowany wcześniej (wykluczony)")

    return score, reasons
