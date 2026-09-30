# apps/api — backend (FastAPI)

Konwencje: SQLAlchemy 2.0 (styl `Mapped[...]`/`mapped_column`), migracje wyłącznie przez Alembic
(`alembic revision --autogenerate -m "..."`, nigdy ręczna edycja schematu). Modele w `app/models/`,
jeden plik per encja. Routery w `app/routers/`, rejestrowane w `app/main.py`.

## Lokalny development

```
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # Windows
alembic upgrade head
uvicorn app.main:app --reload
```

Albo przez `docker compose up` z roota repo (patrz `docker-compose.yml`).

## Schemat bazy — rdzeń

- `companies` — firmy znalezione przez `packages/discovery`, wzbogacane przez `packages/enrichment`
  (`website_status`, `score`, `registered_at`). Dedup po `(source, source_id)` i `normalized_domain`.
- `contacts` — dane kontaktowe firmy (e-mail/telefon), powiązane 1:N z `companies`.
- `campaigns` — definicje kampanii mailowych (szablon, język, status).
- `send_log` — historia wysyłek; unikalność `(campaign_id, contact_id)` + indeks na `contact_id`
  do globalnego sprawdzania "czy już kontaktowany". **Silnik wysyłki musi to sprawdzać przed wysyłką.**
- `suppression_list` — trwała lista wykluczeń (e-mail unikalny). **Sprawdzana przed każdą wysyłką.**

Te dwie ostatnie tabele implementują twarde zasady compliance opisane w root `CLAUDE.md` — nie
omijać ich przy budowie `packages/mailer`.

## Discovery (Faza 1) — zbudowane

- `POST /discovery/run` `{country, city, industry, sources: ["osm", "google_places"]}` — uruchamia
  konektory z `packages/discovery` i zapisuje wyniki przez `app/services/discovery_service.py`.
  Zwraca `{found, created, skipped_duplicate, skipped_sources}`. Źródło bez skonfigurowanego klucza
  (np. Google Places bez `GOOGLE_PLACES_API_KEY`) ląduje w `skipped_sources`, nie wywraca requestu.
- `GET /discovery/industries` — lista obsługiwanych branż (klucz + etykieta PL).
- `GET /companies/export.csv` — eksport z tymi samymi filtrami co `GET /companies`. Zarejestrowany
  PRZED `GET /companies/{company_id}` w pliku routera — inna kolejność powoduje, że FastAPI próbuje
  sparsować `"export.csv"` jako UUID i zwraca 422 zamiast trafić do handlera eksportu.
- `app/services/discovery_service.py::normalize_domain` — dedup po `(source, source_id)` i po
  `normalized_domain` między źródłami. Gdy ten kod zacznie być potrzebny także w `packages/mailer`
  (Faza 4, przy suppression liście), przenieść go do `packages/shared` — na razie zostaje lokalnie
  (patrz zasada projektu o unikaniu przedwczesnych abstrakcji).

## Enrichment (Faza 2) — zbudowane

- `POST /enrichment/run?limit=50` — bierze firmy z `enriched_at IS NULL`, dla każdej: sprawdza stronę
  (`website_checker`), szuka/odgaduje e-mail gdy brak kontaktu (`email_finder`), liczy `score` +
  `score_explanation`. Zwraca `{processed}`.
- `app/services/enrichment_service.py::_enrich_company` **sam egzekwuje** `website_status=NONE` gdy
  brak `website_url` -- nie polega na tym, że `discovery_service` już to ustawił. Powód: dane zapisane
  przed wprowadzeniem tej reguły (albo przyszły import z innego źródła) inaczej zostałyby błędnie
  ocenione jako "jeszcze nie sprawdzone".
- Kolejność w `email_finder`: najpierw `find_in_html` (scraping), dopiero gdy nic nie znajdzie —
  `guess_pattern` jako fallback. Odwrotna kolejność (albo pomijanie fallbacku) była błędem złapanym
  przy testowaniu na żywych danych -- zawsze weryfikuj to zachowanie po zmianach w tym module.
- Scoring jest celowo prostą, czytelną formułą punktową (nie ML) -- patrz `packages/enrichment/CLAUDE.md`
  po pełne reguły. Firma już obecna w `send_log` dostaje mocno ujemny score zamiast być usuwana z bazy
  (zostaje widoczna/audytowalna, po prostu spada na dół listy).

## Co jeszcze nie istnieje (kolejne etapy)

Konektor CEIDG (`registered_at`) — zablokowany na weryfikacji API, patrz `packages/enrichment/CLAUDE.md`.
Endpointy do kampanii/wysyłki — `packages/mailer` (Faza 4). Pełny UI dashboardu — Faza 3.
