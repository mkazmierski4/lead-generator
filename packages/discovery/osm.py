import httpx

from .geocoding import BoundingBox, geocode
from .industries import get_industry
from .models import RawLead

# Publiczna instancja overpass-api.de bywa niestabilna (bywają 406/504 pod obciążeniem) --
# próbujemy po kolei kilku publicznych mirrorów zamiast polegać na jednym punkcie awarii.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]


def _build_query(bbox: BoundingBox, osm_tags: list[tuple[str, str]]) -> str:
    bbox_str = f"{bbox.south},{bbox.west},{bbox.north},{bbox.east}"
    clauses = "".join(
        f'node["{key}"="{value}"]({bbox_str});way["{key}"="{value}"]({bbox_str});'
        for key, value in osm_tags
    )
    return f"[out:json][timeout:25];({clauses});out center tags;"


def _extract_website(tags: dict[str, str]) -> str | None:
    return tags.get("website") or tags.get("contact:website")


def _extract_phone(tags: dict[str, str]) -> str | None:
    return tags.get("phone") or tags.get("contact:phone")


def _extract_address(tags: dict[str, str]) -> str | None:
    parts = [tags.get("addr:street"), tags.get("addr:housenumber")]
    street = " ".join(p for p in parts if p)
    city = tags.get("addr:city")
    return ", ".join(p for p in (street, city) if p) or None


def _query_overpass(query: str) -> list[dict]:
    last_error: Exception | None = None
    for url in OVERPASS_URLS:
        try:
            response = httpx.post(
                url,
                data={"data": query},
                headers={"User-Agent": "lead-generator-mvp/0.1"},
                timeout=15.0,
            )
            response.raise_for_status()
            return response.json().get("elements", [])
        except (httpx.HTTPStatusError, httpx.TransportError) as exc:
            last_error = exc
            continue
    raise RuntimeError(f"Wszystkie mirrory Overpass zawiodły: {last_error}") from last_error


class OverpassConnector:
    source = "osm"

    def search(self, country: str, city: str, industry: str) -> list[RawLead]:
        mapping = get_industry(industry)
        bbox = geocode(f"{city}, {country}")
        query = _build_query(bbox, mapping.osm_tags)
        elements = _query_overpass(query)

        leads: list[RawLead] = []
        for element in elements:
            tags = element.get("tags", {})
            name = tags.get("name")
            if not name:
                continue  # bez nazwy to nie jest użyteczny lead

            leads.append(
                RawLead(
                    name=name,
                    industry=industry,
                    country=country.upper(),
                    city=city,
                    address=_extract_address(tags),
                    phone=_extract_phone(tags),
                    website_url=_extract_website(tags),
                    source=self.source,
                    source_id=f"{element['type']}/{element['id']}",
                    lat=element.get("lat") or element.get("center", {}).get("lat"),
                    lon=element.get("lon") or element.get("center", {}).get("lon"),
                )
            )
        return leads
