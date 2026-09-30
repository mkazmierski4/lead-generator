# Lead Generation Program — architektura projektu

Pełny plan biznesowy i techniczny: `C:\Users\Michał\.claude\plans\open-chcia-bym-eby-my-stworzyli-eager-knuth.md`.

## Co to jest

Lokalna aplikacja webowa do wyszukiwania firm (wg lokalizacji/branży) bez strony internetowej lub z niedziałającą/przestarzałą stroną, wzbogacania ich o dane kontaktowe, oceniania (scoring) i wysyłania spersonalizowanych, zgodnych z zasadami deliverability maili z ofertą budowy strony.

## Struktura monorepo

```
apps/api/              FastAPI backend — API, baza danych, orkiestracja pipeline'ów
apps/web/               Next.js dashboard (TypeScript + Tailwind)
packages/discovery/      konektory źródeł leadów (Google Places, OSM, rejestry firm) — Python
packages/enrichment/    website_checker, email finder, scoring — Python
packages/mailer/         silnik wysyłki, warmup, deliverability — Python
packages/shared/         wspólne typy/schematy Pydantic używane przez apps/api i packages/*
```

Każdy katalog `apps/*` i `packages/*` ma własny, krótki `CLAUDE.md` ze szczegółami dot. tego modułu — nowa sesja pracująca nad jednym modułem nie musi czytać całego repo.

## Twarde zasady (obowiązują w każdym module, bez wyjątków)

1. **Suppression list ponad wszystko.** Żaden e-mail nie może zostać wysłany, jeśli kontakt/firma jest już w `suppression_list` lub ma wpis w `send_log` dla tej samej kampanii/kontaktu. Sprawdzenie musi się dziać na poziomie silnika wysyłki (`packages/mailer`), nie tylko w UI.
2. **Każdy szablon maila musi zawierać link wypisania** (unsubscribe) i jasną identyfikację nadawcy (nazwa firmy/osoby, adres).
3. **Rate limiting jest wbudowany, nie opcjonalny.** Domyślny limit wysyłki to zmienna konfiguracyjna (`DAILY_SEND_LIMIT`, start: 20-50/dzień, harmonogram warmupu). Silnik wysyłki musi go egzekwować sam, niezależnie od tego, co poda UI.
4. **Wysyłka kampanii domyślnie w trybie `dry-run`.** Prawdziwa wysyłka wymaga jawnej flagi/potwierdzenia — nigdy nie jest domyślnym zachowaniem endpointu/skryptu.
5. **Deduplikacja leadów** po znormalizowanej domenie / e-mailu / (nazwa + adres) przy zapisie do `companies`/`contacts` — różne źródła (Google Places, OSM, rejestry) nie mogą tworzyć duplikatów.
6. **Brak agresywnego scrapowania Google Maps/Search czy social media.** Źródła danych to oficjalne API (Google Places API, Overpass/OSM, rejestry firm typu CEIDG/KRS/Companies House) lub scraping wyłącznie stron własnych firm (ich stopka/kontakt), z rozsądnymi opóźnieniami i poszanowaniem `robots.txt`.

## Stack

- Backend: Python 3.13 + FastAPI + SQLAlchemy + Alembic (migracje) + APScheduler (harmonogram zadań).
- Baza danych: PostgreSQL (Docker Compose lokalnie).
- Frontend: Next.js (TypeScript) + Tailwind CSS.
- Całość uruchamiana lokalnie przez `docker compose up` — bez hostingu w chmurze.

## Rdzeń schematu bazy danych

`companies`, `contacts`, `campaigns`, `send_log`, `suppression_list` — pełne definicje w `apps/api/app/models/`. Przed zmianą schematu: nowa migracja Alembic (`alembic revision --autogenerate`), nigdy ręczna edycja bazy na produkcji.

## Status budowy

Projekt budowany etapami jako osobne sesje Claude Code (patrz plan): Fundament → Discovery Engine → Enrichment Engine → Dashboard → Mailer Engine → Deliverability hardening → Skalowanie/i18n. Aktualny etap i to, co już działa, sprawdzaj w `git log` i w tym pliku (aktualizowany na końcu każdego etapu).

**Etap 0 (Fundament): gotowy.** Szkielet repo, Docker Compose (Postgres + FastAPI + Next.js), schemat DB
z pierwszą migracją Alembic, `GET /health` i `GET /companies`, strona startowa dashboardu sprawdzająca
połączenie z API. Zweryfikowane end-to-end przez `docker compose up` (patrz `apps/api/CLAUDE.md` i
`apps/web/CLAUDE.md` po szczegóły uruchomienia).

**Następny etap: Discovery Engine** (patrz `packages/discovery/CLAUDE.md`) — konektor Google Places +
OSM, zapis leadów do bazy z dedupem po `(source, source_id)`.
