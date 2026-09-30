# packages/enrichment — ocena stron i scoring

## Zakres modułu

- `website_checker.py` — `fetch(url)` + `analyze(response, notes)` → `WebsiteCheckResult(status, reasons)`.
  Status: `dead` (brak połączenia/timeout/HTTP 4xx+5xx/domena zaparkowana), `outdated` (strona działa,
  ale brak HTTPS i/lub brak meta viewport), `ok`. Fallback https→http przy błędzie połączenia, żeby
  odróżnić "całkiem martwą stronę" od "tylko zły certyfikat".
- `email_finder.py` — `find_in_html(html, url)` szuka e-maila w treści strony (regex + filtr szumu typu
  adresy z trackerów/przykładowych domen, preferuje adres na domenie firmy), `guess_pattern(url)` to
  fallback `kontakt@domena` (zawsze `verified=False`).
- `models.py` — `WebsiteCheckResult`, `EmailFindResult`. Bez zależności od bazy danych (tak jak
  `packages/discovery`) — orkiestracja i zapis żyją w `apps/api/app/services/enrichment_service.py`.

## Twarde zasady

- Scraping tylko stron własnych firm (ich stopka/kontakt), z opóźnieniami i poszanowaniem `robots.txt`.
- Wynik zawsze musi dać się prześledzić do konkretnego sygnału — stąd `Company.score_explanation`
  (czytelna dla człowieka lista powodów), nie tylko surowa liczba.
- `guess_pattern` to zawsze fallback PO nieudanej próbie scrapowania (`find_in_html` nie znalazło
  nic), nigdy pierwszy wybór, i zawsze oznaczony `verified=False` — mailer (Faza 4) musi to rozróżniać.

## Status: zbudowane (website_checker, email_finder, scoring)

Zweryfikowane na żywych stronach: `anthropic.com`/`example.com` → `ok`, nieistniejąca domena → `dead`,
kawiarnia w Zakopanem bez HTTPS ale z realnym mailem w stopce → `outdated` + e-mail znaleziony
(`verified=True`), inna bez żadnego maila na stronie → poprawny fallback na wzorzec (`verified=False`).
Scoring (`apps/api/app/services/enrichment_service.py::_score`) łączy `website_status` + wiek firmy
(gdy znany) + dostępność kontaktu + czy już wysłano kampanię (`send_log`) w jeden `score` z pełnym
uzasadnieniem w `score_explanation`.

## Nie zbudowane: konektor CEIDG (rejestr firm, `registered_at`)

CEIDG API v2 (`dane.biznes.gov.pl`) wymaga darmowej rejestracji (JWT token przysyłany mailem), ale
**dokładne parametry zapytania (wyszukiwanie po nazwie/mieście, kształt odpowiedzi JSON) nie zostały
zweryfikowane** — dokumentacja PDF nie renderowała się w tym środowisku, a strony pomocnicze nie miały
szczegółów. Zdecydowano NIE zgadywać kształtu API i nie wysyłać niezweryfikowanego kodu.

**Żeby to dokończyć:** zarejestruj się na `dane.biznes.gov.pl` (darmowe, JWT przychodzi mailem), dodaj
`CEIDG_API_KEY` do `.env`, i zweryfikuj realne zapytanie (`curl` z `Authorization: Bearer <token>` do
`https://dane.biznes.gov.pl/api/ceidg/v2/firmy?...`) zanim napiszemy konektor -- ten sam wzorzec co
`google_places.py` (pomijany bez klucza, nie wywala runu), ale tym razem trzeba najpierw zobaczyć
prawdziwą odpowiedź API, bo nie ma pewności co do nazw pól.
