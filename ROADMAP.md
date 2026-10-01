# Roadmap — Lead Generation Program

Pełny plan biznesowy/techniczny (kontekst decyzyjny): `C:\Users\Michał\.claude\plans\open-chcia-bym-eby-my-stworzyli-eager-knuth.md`.
Ten plik to żywa mapa postępu projektu — aktualizowana na koniec każdego etapu.

## Jak czytać

- ✅ gotowe i zweryfikowane · 🔄 w trakcie · ⬜ zaplanowane, nierozpoczęte · ⛔ zablokowane (czeka na decyzję/dane od użytkownika)
- Każda faza kończy się realną weryfikacją (uruchomieniem czegoś, nie tylko napisaniem kodu), zanim przejdziemy dalej, i osobnym commitem.
- Fazy budowane są w jednej ciągłej rozmowie z Claude (nie w osobnych sesjach per moduł) -- świadoma
  decyzja pod kątem szybkości i kosztu tokenów przy tej skali projektu, patrz root `CLAUDE.md` →
  "Status budowy".

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

## Faza 2 — Enrichment Engine ✅ (poza CEIDG)

Cel: dla każdego leadu ustalić, czy strona istnieje/działa, znaleźć kontakt e-mail, policzyć score.

- [x] `website_checker` — status HTTP, fallback https→http, wykrywanie zaparkowanych domen, heurystyki
      "przestarzała strona" (brak HTTPS/viewport).
- [x] `email_finder` — scraping treści strony (regex + filtr szumu), fallback na pattern-guessing
      (`kontakt@domena`, zawsze oznaczony jako niezweryfikowany).
- [x] `scoring` — łączy `website_status` + wiek firmy (gdy znany) + dostępność kontaktu + historię
      kontaktu (`send_log`) w `Company.score`, z pełnym uzasadnieniem w `Company.score_explanation`.
- [x] `POST /enrichment/run` uruchamiający pipeline dla nowych, nieprzetworzonych leadów.
- [ ] **Konektor CEIDG (Polska)** — `registered_at` jako sygnał "młoda firma". Zablokowane: nie udało
      się zweryfikować dokładnych parametrów API v2 (dokumentacja PDF nie renderowała się lokalnie).
      Wymaga: darmowej rejestracji na `dane.biznes.gov.pl` (JWT mailem) + jednego przebiegu weryfikacji
      na żywo, zanim powstanie kod -- patrz `packages/enrichment/CLAUDE.md`.

**Zweryfikowane:** firma bez strony → `website_status=none`, score +30 (priorytet); firma z martwą
domeną → `dead`; firma z działającą nowoczesną stroną → `ok`, score nisko (odsiew) -- wszystko na
żywych stronach (Zakopane, kawiarnie/kwiaciarnie), nie na danych syntetycznych.

---

## Faza 3 — Dashboard ✅ (poza kolejką kampanii, patrz Faza 4)

Cel: wygodny, ładny UI do przeglądania/filtrowania/zatwierdzania leadów — zanim cokolwiek
wyśle się automatycznie.

- [x] Makieta całej aplikacji zatwierdzona przed kodem: https://claude.ai/artifact/GEZWGLwvLrFqMvB6e4XAjv
- [x] Pulpit: liczniki, najlepsze leady, oś aktywności (historia uruchomień w tabeli `runs`).
- [x] Leady: zakładki statusu z licznikami, filtr branży, wyszukiwanie (Ctrl K), paginacja, rozwijane
      uzasadnienie wyniku, eksport CSV, wzbogacanie z UI.
- [x] Karta firmy: rozbicie punktów, obserwacje ze sprawdzenia strony, ręczny kontakt (przelicza wynik),
      wykluczenie na stałe (trafia też do `suppression_list`).
- [x] Znajdź leady: kafelki branż, źródła, przebieg wyszukiwania, historia wyszukiwań.
- [x] Kampanie (podgląd fazy 4) i Ustawienia (status kluczy, zabezpieczenia wysyłki).
- [ ] Zatwierdzanie leadów do kolejki kampanii — czeka na `packages/mailer` (Faza 4).

**Zweryfikowane:** `next build`, `tsc`, `lint` czyste; wszystkie trasy zwracają 200; realne wywołania
(discovery piekarni w Zakopanem, wzbogacanie, ręczny kontakt 30→50 pkt, wykluczenie). Po drodze
wymienione martwe mirrory Overpass. Wizualnie zweryfikowane tylko przez makietę.

Da się od zera, z poziomu przeglądarki, przejrzeć wyniki Fazy 1+2 i wybrać 20-50 leadów do pierwszej
kampanii -- brakuje tylko przycisku "zakolejkuj do kampanii", bo kampanie jeszcze nie istnieją.

---

## Faza 4 — Mailer Engine ✅ w kodzie, ⛔ czeka na domenę

Cel: bezpieczna wysyłka — najbardziej krytyczny etap pod kątem ryzyka (spam/ban).

- [x] Kampanie: własny szablon z zmiennymi wstawianymi w miejscu kursora, 3 gotowe szablony
      (napisane pod brak odmiany zmiennych), podgląd na prawdziwych firmach.
- [x] Kolejka tylko z potwierdzonymi adresami (odgadnięte na życzenie per kampania), dodawanie z listy
      leadów (zaznaczanie) i z karty firmy, z wyjaśnieniem pominięć.
- [x] Przed każdym mailem: wykluczenia, suppression list, historia kontaktu z dowolnej kampanii.
- [x] Dzienny limit z harmonogramem rozgrzewania (10/15/25/35, potem `DAILY_SEND_LIMIT`), egzekwowany
      w silniku; wysyłka w tle z losowym odstępem, zatrzymanie, stop po 3 błędach SMTP.
- [x] Podpis i informacja o wypisaniu doklejane zawsze; `List-Unsubscribe`; domyślnie `dry_run`;
      okno potwierdzenia partii w UI.
- [x] Mailpit jako skrzynka testowa ("Wyślij test do siebie"); wysyłka partii na Mailpit zablokowana,
      żeby nie oznaczać firm jako kontaktowanych.
- [ ] **Domena + skrzynka + SPF/DKIM/DMARC** — po stronie użytkownika (stan na 2026-10-01: brak domeny).

**Weryfikacja kodu:** cały przepływ przetestowany przez API i na Mailpit (kolejka 3 z 23 firm, test
dociera z [TEST], partia na Mailpit blokowana, historia firmy, usuwanie kampanii bez wysłanych).
**Weryfikacja dostarczalności (po domenie):** test na własny adres w Gmailu trafia do Odebrane,
nagłówki SPF/DKIM/DMARC = pass.

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
| Dokończenie Fazy 2 (sygnał "młoda firma") | Darmowa rejestracja na `dane.biznes.gov.pl` → JWT do `CEIDG_API_KEY` |
| Przed Fazą 4 | Nazwa domeny pod cold mailing + wybór dostawcy skrzynki (Google Workspace / Zoho / inny) |
| Przy skalowaniu za granicę (Faza 6) | Lista docelowych krajów w kolejności priorytetu |
| Repozytorium na GitHub (opcjonalnie, poza tym roadmapem) | Puste repo utworzone na Twoim koncie + skonfigurowane lokalnie dane uwierzytelniające do gita (nie potrzebuję Twojego hasła/tokenu — wystarczy, że `git push` będzie działał z Twojego konta) |

## Metryki sukcesu (do monitorowania od Fazy 5)

- Liczba wygenerowanych leadów/tydzień spełniających kryteria scoringu.
- Spam rate w Google Postmaster Tools (cel: utrzymać nisko, poniżej progu ostrzeżeń Google).
- Response rate kampanii (odpowiedzi / wysłane).
- Liczba realnych rozmów/ofert wygenerowanych z kampanii — ostateczny miernik sensowności narzędzia.
