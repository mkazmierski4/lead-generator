import os

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


class GeocodingError(RuntimeError):
    pass


class BoundingBox:
    def __init__(self, south: float, west: float, north: float, east: float) -> None:
        self.south = south
        self.west = west
        self.north = north
        self.east = east


def _user_agent() -> str:
    # Nominatim wymaga identyfikującego User-Agenta (polityka użytkowania OSM). Kontakt jest
    # opcjonalny i ustawiany świadomie przez właściciela projektu w .env, nigdy automatycznie.
    contact = os.environ.get("OSM_CONTACT_EMAIL")
    base = "lead-generator-mvp/0.1"
    return f"{base} (kontakt: {contact})" if contact else base


def geocode(query: str) -> BoundingBox:
    """Zamienia np. 'Kraków, Polska' na bounding box do zapytania Overpass."""
    response = httpx.get(
        NOMINATIM_URL,
        params={"q": query, "format": "json", "limit": 1},
        headers={"User-Agent": _user_agent()},
        timeout=10.0,
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        raise GeocodingError(f"Nie znaleziono lokalizacji: '{query}'")

    south, north, west, east = (float(v) for v in results[0]["boundingbox"])
    return BoundingBox(south=south, west=west, north=north, east=east)
