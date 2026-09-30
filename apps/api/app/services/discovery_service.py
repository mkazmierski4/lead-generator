import logging
from dataclasses import dataclass
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.company import Company, LeadSource, WebsiteStatus
from discovery.base import DiscoveryConfigError
from discovery.google_places import GooglePlacesConnector
from discovery.models import RawLead
from discovery.osm import OverpassConnector

CONNECTORS = {
    "osm": OverpassConnector(),
    "google_places": GooglePlacesConnector(),
}

logger = logging.getLogger(__name__)


def normalize_domain(url: str | None) -> str | None:
    if not url:
        return None
    netloc = urlparse(url if "//" in url else f"//{url}").netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc or None


@dataclass
class DiscoveryRunResult:
    found: int = 0
    created: int = 0
    skipped_duplicate: int = 0
    skipped_sources: list[str] | None = None


def run_discovery(db: Session, country: str, city: str, industry: str, sources: list[str]) -> DiscoveryRunResult:
    result = DiscoveryRunResult(skipped_sources=[])
    raw_leads: list[RawLead] = []

    for source in sources:
        connector = CONNECTORS[source]
        try:
            raw_leads.extend(connector.search(country=country, city=city, industry=industry))
        except DiscoveryConfigError:
            result.skipped_sources.append(source)
        except Exception:
            # Źródło danych nie odpowiada (np. darmowe, publiczne API Overpass jest przeciążone) --
            # to nie powinno wywalać całego runu, gdy inne źródła mogą się powieść. Błąd i tak
            # trafia do logów kontenera do diagnozy.
            logger.exception("Konektor discovery '%s' zawiódł, pomijam źródło", source)
            result.skipped_sources.append(source)

    result.found = len(raw_leads)

    for raw in raw_leads:
        if _is_duplicate(db, raw):
            result.skipped_duplicate += 1
            continue

        db.add(
            Company(
                name=raw.name,
                industry=raw.industry,
                country=raw.country,
                city=raw.city,
                address=raw.address,
                phone=raw.phone,
                website_url=raw.website_url,
                normalized_domain=normalize_domain(raw.website_url),
                website_status=WebsiteStatus.UNKNOWN if raw.website_url else WebsiteStatus.NONE,
                source=LeadSource(raw.source),
                source_id=raw.source_id,
            )
        )
        result.created += 1

    db.commit()
    return result


def _is_duplicate(db: Session, raw: RawLead) -> bool:
    by_source = db.execute(
        select(Company.id).where(Company.source == LeadSource(raw.source), Company.source_id == raw.source_id)
    ).first()
    if by_source:
        return True

    domain = normalize_domain(raw.website_url)
    if not domain:
        return False

    by_domain = db.execute(
        select(Company.id).where(Company.normalized_domain == domain, Company.country == raw.country.upper())
    ).first()
    return by_domain is not None
