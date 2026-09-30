# packages/enrichment — ocena stron i scoring

**Status: nie zbudowane jeszcze.** Zaplanowane w osobnej sesji (patrz root `CLAUDE.md` → Enrichment Engine).

## Zakres modułu

- `website_checker` — dla firmy z `website_url` ustala `WebsiteStatus` (`none`/`dead`/`outdated`/`ok`):
  HTTP status/timeout, SSL, heurystyki "przestarzała strona" (brak viewport meta itd.), WHOIS (data
  wygaśnięcia domeny blisko = sygnał).
- `email_finder` — gdy brak e-maila ze źródła: scraping stopki/kontaktu własnej strony firmy,
  pattern-guessing (`info@`, `kontakt@` + weryfikacja), dane z rejestru.
- `scoring` — łączy sygnały (`website_status`, `registered_at`, branża, dostępność kontaktu,
  czy już kontaktowany) w pojedynczy `score` zapisywany na `Company`.

## Twarde zasady

- Scraping tylko stron własnych firm (ich stopka/kontakt), z opóźnieniami i poszanowaniem `robots.txt`.
- Wynik zawsze musi dać się prześledzić do konkretnego sygnału (np. "strona zwróciła 404") — dashboard
  pokazuje uzasadnienie score'u, więc logika nie może być czarną skrzynką.
