import re
from urllib.parse import urlparse

from .models import EmailFindResult

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Adresy, które technicznie pasują do regexa, ale nigdy nie są realnym kontaktem firmy
# (przykładowe domeny, biblioteki trackingowe/analityczne wklejone w kod strony itd.)
NOISE_DOMAIN_MARKERS = ["example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org", ".png", ".jpg", ".svg"]


def extract_domain(url: str) -> str:
    netloc = urlparse(url if "//" in url else f"//{url}").netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc


def find_in_html(html: str, website_url: str) -> EmailFindResult:
    domain = extract_domain(website_url)
    candidates = {m.group(0).lower() for m in EMAIL_RE.finditer(html)}
    candidates = {e for e in candidates if not any(marker in e for marker in NOISE_DOMAIN_MARKERS)}

    if not candidates:
        return EmailFindResult(email=None, verified=False, reasons=["Nie znaleziono adresu e-mail na stronie"])

    # preferuj adres na domenie firmy nad przypadkowym innym adresem znalezionym na stronie
    same_domain = sorted(e for e in candidates if domain and e.endswith(f"@{domain}"))
    pick = same_domain[0] if same_domain else sorted(candidates)[0]
    return EmailFindResult(email=pick, verified=True, reasons=[f"Znaleziono na stronie firmy: {pick}"])


def guess_pattern(website_url: str) -> EmailFindResult:
    domain = extract_domain(website_url)
    if not domain:
        return EmailFindResult(email=None, verified=False, reasons=["Brak domeny, nie da się odgadnąć adresu"])

    guess = f"kontakt@{domain}"
    return EmailFindResult(
        email=guess,
        verified=False,
        reasons=[f"Nie znaleziono e-maila na stronie -- odgadnięty wzorzec: {guess} (niezweryfikowany)"],
    )
