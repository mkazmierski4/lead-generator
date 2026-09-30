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

## Co jeszcze nie istnieje (kolejne etapy)

Endpoints do tworzenia/edycji kampanii, uruchamiania discovery/enrichment/wysyłki oraz logika
`packages/discovery`, `packages/enrichment`, `packages/mailer` — to osobne etapy z planu
(patrz root `CLAUDE.md`). Obecny etap dostarcza tylko szkielet + `GET /companies`, `GET /health`.
