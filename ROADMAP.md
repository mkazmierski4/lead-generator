# Roadmap — Lead Generation Program

Pełny plan biznesowy/techniczny (kontekst decyzyjny): `C:\Users\Michał\.claude\plans\open-chcia-bym-eby-my-stworzyli-eager-knuth.md`.
Ten plik to żywa mapa postępu projektu — aktualizowana na koniec każdego etapu.

## Jak czytać

- ✅ gotowe i zweryfikowane · 🔄 w trakcie · ⬜ zaplanowane, nierozpoczęte · ⛔ zablokowane (czeka na decyzję/dane od użytkownika)
- Każda faza = osobna sesja Claude Code (małe, skoncentrowane konteksty — patrz root `CLAUDE.md` sekcja "Plan pracy z Claude Code" w oryginalnym planie).
- Każda faza kończy się realną weryfikacją (uruchomieniem czegoś, nie tylko napisaniem kodu), zanim przejdziemy dalej.

---

## Faza 0 — Fundament ✅

Szkielet monorepo, Docker Compose (Postgres + FastAPI + Next.js), pełny schemat CRM
(`companies`, `contacts`, `campaigns`, `send_log`, `suppression_list`) z migracją Alembic,
`GET /health` + `GET /companies`, dashboard-placeholder sprawdzający połączenie z API.

**Zweryfikowane:** `docker compose up` — wszystkie 3 kontenery działają, dashboard faktycznie
widzi API przez sieć Dockera.

---

## Faza 1 — Discovery Engine ✅

Cel: znaleźć firmy wg lokalizacji + branży i zapisać je do bazy bez duplikatów.

- [x] Konektor OpenStreetMap Overpass API — darmowy, bez klucza, z fallbackiem na kilka mirrorów
      (publiczna instancja `overpass-api.de` bywa niestabilna pod obciążeniem).
- [x] Konektor Google Places API (Text Search) — gotowy, aktywuje się po dodaniu
      `GOOGLE_PLACES_API_KEY` do `.env`; bez klucza źródło jest pomijane, nie wywala runu.
- [x] Zapis do `companies` z dedupem po `(source, source_id)` i `normalized_domain`.
- [x] `POST /discovery/run` + `GET /discovery/industries` (8 startowych branż).
- [x] Eksport CSV (`GET /companies/export.csv`) do ręcznej weryfikacji jakości wyników.
- [x] Odporność: awaria jednego źródła (np. padnięty Overpass) trafia do `skipped_sources`,
      nie crashuje całego zapytania.

**⛔ Zależność zewnętrzna (nadal otwarta):** `GOOGLE_PLACES_API_KEY` — dorzucić do `.env`, gdy
będzie potrzebne drugie źródło danych (OSM samo w sobie już działa i daje realne leady).

**Zweryfikowane:** "fryzjer, Kraków" przez żywe Overpass API → 527 wyników, część bez strony;
"kwiaciarnia, Zakopane" zapisana do bazy, powtórne uruchomienie → 0 nowych rekordów (dedup działa).

---

## Faza 2 — Enrichment Engine ⬜

Cel: dla każdego leadu ustalić, czy strona istnieje/działa, znaleźć kontakt e-mail, policzyć score.

- [ ] `website_checker` — status HTTP, SSL, heurystyki "przestarzała strona", WHOIS (wygaśnięcie domeny).
- [ ] `email_finder` — scraping stopki/kontaktu własnej strony firmy, pattern-guessing (`info@`, `kontakt@`).
- [ ] Konektor CEIDG/KRS (Polska) — `registered_at` jako twardy sygnał "młoda firma".
- [ ] `scoring` — łączy sygnały w `Company.score`, z uzasadnieniem widocznym w dashboardzie.
- [ ] Endpoint/skill `/enrich-leads` uruchamiający pipeline dla nowych, nieprzetworzonych leadów.

**Weryfikacja fazy:** firma z martwą stroną dostaje `website_status=dead` i wysoki score; firma
z działającą, nowoczesną stroną dostaje niski score (odsiew).

---

## Faza 3 — Dashboard ⬜

Cel: wygodny, ładny UI do przeglądania/filtrowania/zatwierdzania leadów — zanim cokolwiek
wyśle się automatycznie.

- [ ] Lista leadów z filtrami: kraj, branża, `website_status`, min. score, status kontaktu.
- [ ] Widok szczegółów firmy — dane kontaktowe, źródło, uzasadnienie score'u.
- [ ] Ręczne zatwierdzanie/odrzucanie leadów do kolejnej kampanii (kolejka do wysyłki).
- [ ] Podstawowy branding/design pass (patrz `artifact-design`/`frontend-design` jako inspiracja
      stylistyczna, choć to nie jest Artifact — zwykła appka Next.js).

**Weryfikacja fazy:** da się od zera, z poziomu przeglądarki, przejrzeć wyniki Fazy 1+2 i wybrać
20-50 leadów do pierwszej kampanii.

---

## Faza 4 — Mailer Engine ⬜

Cel: bezpieczna wysyłka — najbardziej krytyczny etap pod kątem ryzyka (spam/ban).

- [ ] **Setup infrastruktury (czynność jednorazowa, częściowo ręczna):** domena pod cold mailing,
      skrzynka (Google Workspace/Zoho), konfiguracja SPF/DKIM/DMARC.
- [ ] Harmonogram warmupu (rosnący `DAILY_SEND_LIMIT`: ~5-10/dzień → 20-50/dzień w 3-4 tygodnie).
- [ ] Rate limiter egzekwowany w kodzie (nie tylko w UI) — patrz `packages/mailer/CLAUDE.md`.
- [ ] System szablonów z personalizacją (nazwa firmy, miasto, konkretny problem ze stroną) +
      wymuszony link wypisania i identyfikacja nadawcy.
- [ ] Sprawdzenie `suppression_list` + `send_log` przed każdą wysyłką (twarda reguła projektu).
- [ ] Wysyłka SMTP z opóźnieniami między mailami, domyślny tryb `dry-run`.

**⛔ Zależność zewnętrzna:** decyzja o domenie/skrzynce (nazwa domeny, dostawca poczty) — do
ustalenia z użytkownikiem przed startem tej fazy.

**Weryfikacja fazy:** testowa wysyłka na własny adres trafia do Odebrane (nie Spam), nagłówki
SPF/DKIM/DMARC = pass, próba drugiej wysyłki do tego samego kontaktu jest zablokowana.

---

## Faza 5 — Deliverability & Compliance hardening ⬜

Cel: żeby konto/domena przetrwały pierwsze tygodnie realnej wysyłki.

- [ ] Integracja z Google Postmaster Tools (monitoring spam rate).
- [ ] Automatyczne wykrywanie bounce'ów i cofanie z kolejki / dopisywanie do `suppression_list`.
- [ ] Wykrywanie odpowiedzi (IMAP) — auto-pauza follow-upów dla kontaktów, którzy odpisali.
- [ ] Dashboard statystyk kampanii: wysłano / otwarto / odpowiedziano / odbito / wypisano.
- [ ] Przegląd zgodności prawnej (B2B, legitimate interest, opt-out) — checklist, nie porada prawna.

**Weryfikacja fazy:** po serii testowych wysyłek spam rate w Postmaster Tools pozostaje niski,
bounce'y realnie trafiają na suppression list.

---

## Faza 6 — Skalowanie i internacjonalizacja ⬜

Cel: więcej krajów, więcej wolumenu, lepsza konwersja.

- [ ] Kolejne rejestry firm (UK Companies House, OpenCorporates dla innych krajów EU).
- [ ] Mapowanie branż na kategorie Google Places per język/kraj.
- [ ] Szablony maili per język (nie tylko per branża).
- [ ] Wiele skrzynek/domen wysyłkowych równolegle (przy realnym wzroście wolumenu).
- [ ] Sekwencje follow-up + A/B testy szablonów.
- [ ] Automatyzacja pełnego cyklu (discovery → enrichment → wysyłka) przez `schedule`/cron —
      dopiero gdy Fazy 4-5 są sprawdzone w praniu przez min. 4-6 tygodni ręcznej kontroli.

---

## Otwarte decyzje / czego będę potrzebować od Ciebie po drodze

| Kiedy | Czego potrzeba |
|---|---|
| Przed Fazą 1 (pełne możliwości) | Klucz `GOOGLE_PLACES_API_KEY` z Google Cloud Console |
| Przed Fazą 4 | Nazwa domeny pod cold mailing + wybór dostawcy skrzynki (Google Workspace / Zoho / inny) |
| Przy skalowaniu za granicę (Faza 6) | Lista docelowych krajów w kolejności priorytetu |
| Repozytorium na GitHub (opcjonalnie, poza tym roadmapem) | Puste repo utworzone na Twoim koncie + skonfigurowane lokalnie dane uwierzytelniające do gita (nie potrzebuję Twojego hasła/tokenu — wystarczy, że `git push` będzie działał z Twojego konta) |

## Metryki sukcesu (do monitorowania od Fazy 5)

- Liczba wygenerowanych leadów/tydzień spełniających kryteria scoringu.
- Spam rate w Google Postmaster Tools (cel: utrzymać nisko, poniżej progu ostrzeżeń Google).
- Response rate kampanii (odpowiedzi / wysłane).
- Liczba realnych rozmów/ofert wygenerowanych z kampanii — ostateczny miernik sensowności narzędzia.
