from dataclasses import dataclass


@dataclass(frozen=True)
class IndustryMapping:
    label_pl: str
    osm_tags: list[tuple[str, str]]  # (key, value) wg tagowania OSM, sprawdzane z OR
    google_included_type: str  # https://developers.google.com/maps/documentation/places/web-service/place-types


# Startowy zestaw branż typowych dla klientów na "wizytówkę" -- łatwo rozszerzalny,
# nie próbujemy pokryć wszystkiego na starcie (patrz zasada projektu: brak przedwczesnej rozbudowy).
INDUSTRIES: dict[str, IndustryMapping] = {
    "hairdresser": IndustryMapping("Fryzjer", [("shop", "hairdresser")], "hair_salon"),
    "beauty_salon": IndustryMapping("Salon kosmetyczny", [("shop", "beauty")], "beauty_salon"),
    "restaurant": IndustryMapping("Restauracja", [("amenity", "restaurant")], "restaurant"),
    "cafe": IndustryMapping("Kawiarnia", [("amenity", "cafe")], "cafe"),
    "car_repair": IndustryMapping("Warsztat samochodowy", [("shop", "car_repair")], "car_repair"),
    "dentist": IndustryMapping("Gabinet stomatologiczny", [("amenity", "dentist")], "dentist"),
    "florist": IndustryMapping("Kwiaciarnia", [("shop", "florist")], "florist"),
    "bakery": IndustryMapping("Piekarnia", [("shop", "bakery")], "bakery"),
}


def get_industry(key: str) -> IndustryMapping:
    try:
        return INDUSTRIES[key]
    except KeyError:
        valid = ", ".join(sorted(INDUSTRIES))
        raise ValueError(f"Nieznana branża '{key}'. Dostępne: {valid}") from None
