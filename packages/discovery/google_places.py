import os

import httpx

from .base import DiscoveryConfigError
from .industries import get_industry
from .models import RawLead

SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.location",
    ]
)


class GooglePlacesConnector:
    source = "google_places"

    def search(self, country: str, city: str, industry: str) -> list[RawLead]:
        api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
        if not api_key:
            raise DiscoveryConfigError(
                "Brak GOOGLE_PLACES_API_KEY w .env -- konektor Google Places jest pominięty."
            )

        mapping = get_industry(industry)
        response = httpx.post(
            SEARCH_TEXT_URL,
            json={
                "textQuery": f"{mapping.label_pl} w {city}",
                "languageCode": "pl",
                "regionCode": country,
                "includedType": mapping.google_included_type,
            },
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            timeout=15.0,
        )
        response.raise_for_status()
        places = response.json().get("places", [])

        leads: list[RawLead] = []
        for place in places:
            location = place.get("location", {})
            leads.append(
                RawLead(
                    name=place.get("displayName", {}).get("text", ""),
                    industry=industry,
                    country=country.upper(),
                    city=city,
                    address=place.get("formattedAddress"),
                    phone=place.get("internationalPhoneNumber"),
                    website_url=place.get("websiteUri"),
                    source=self.source,
                    source_id=place["id"],
                    lat=location.get("latitude"),
                    lon=location.get("longitude"),
                )
            )
        return leads
