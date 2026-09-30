from pydantic import BaseModel


class RawLead(BaseModel):
    """Wynik wyszukiwania z jednego źródła, zanim trafi do bazy (dedup/zapis robi apps/api)."""

    name: str
    industry: str  # klucz z packages/discovery/industries.py, np. "hairdresser"
    country: str  # ISO 3166-1 alpha-2, np. "PL"
    city: str | None = None
    address: str | None = None
    phone: str | None = None
    website_url: str | None = None

    source: str  # "osm" | "google_places" -- musi odpowiadać wartości app.models.company.LeadSource
    source_id: str  # unikalne id w ramach źródła, do dedupu

    lat: float | None = None
    lon: float | None = None
