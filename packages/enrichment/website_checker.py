import httpx

from .models import WebsiteCheckResult

USER_AGENT = "lead-generator-mvp/0.1"

# Częste markery domen zaparkowanych / wystawionych na sprzedaż -- jeśli strona "działa", ale to
# w rzeczywistości ogłoszenie sprzedaży domeny, to dla nas i tak jest to lead bez realnej strony.
PARKED_MARKERS = [
    "domain is for sale",
    "domain may be for sale",
    "buy this domain",
    "sedo.com",
    "parkingcrew",
    "bodis.com",
    "this domain is parked",
    "domena jest na sprzedaż",
    "domena na sprzedaż",
    "kup tę domenę",
]


def _ensure_scheme(url: str) -> str:
    return url if "//" in url else f"https://{url}"


def fetch(url: str) -> tuple[httpx.Response | None, list[str]]:
    """Pojedyncze pobranie strony z fallbackiem https -> http, gdy HTTPS zawiedzie na etapie
    połączenia (zły/wygasły certyfikat, brak konfiguracji SSL). Zwraca (response albo None, powody)."""
    normalized = _ensure_scheme(url)
    headers = {"User-Agent": USER_AGENT}

    try:
        return httpx.get(normalized, timeout=10.0, follow_redirects=True, headers=headers), []
    except httpx.ConnectError:
        if normalized.startswith("https://"):
            try:
                response = httpx.get(
                    normalized.replace("https://", "http://", 1), timeout=10.0, follow_redirects=True, headers=headers
                )
                return response, ["Brak działającego HTTPS (zadziałało dopiero zwykłe HTTP)"]
            except httpx.HTTPError:
                pass
        return None, ["Brak połączenia z serwerem"]
    except httpx.TimeoutException:
        return None, ["Strona nie odpowiada (timeout)"]
    except httpx.HTTPError as exc:
        return None, [f"Błąd połączenia: {exc}"]


def analyze(response: httpx.Response | None, fetch_notes: list[str]) -> WebsiteCheckResult:
    if response is None:
        return WebsiteCheckResult(status="dead", reasons=fetch_notes or ["Strona niedostępna"])

    if response.status_code >= 400:
        return WebsiteCheckResult(status="dead", reasons=[f"Serwer zwrócił błąd HTTP {response.status_code}"])

    html = response.text.lower()
    if any(marker in html for marker in PARKED_MARKERS):
        return WebsiteCheckResult(
            status="dead", reasons=["Strona wygląda na zaparkowaną domenę / ogłoszenie sprzedaży"]
        )

    reasons = list(fetch_notes)
    if "viewport" not in html:
        reasons.append("Brak meta viewport (strona prawdopodobnie nie działa dobrze na telefonie)")
    if not str(response.url).startswith("https"):
        reasons.append("Strona nie wymusza/nie ma HTTPS")

    if reasons:
        return WebsiteCheckResult(status="outdated", reasons=reasons)
    return WebsiteCheckResult(status="ok", reasons=["Strona działa, ma HTTPS i wygląda na dopasowaną do telefonów"])
