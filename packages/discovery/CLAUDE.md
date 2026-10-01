# packages/discovery — źródła leadów

**Status: nie zbudowane jeszcze.** Zaplanowane w osobnej sesji (patrz root `CLAUDE.md` → Discovery Engine).

## Zakres modułu

Konektory wyszukujące firmy wg lokalizacji + branży, zwracające `RawLead` (nazwa, adres, telefon,
website_url jeśli jest, source + source_id do dedupu). Każde źródło to osobna implementacja wspólnego
interfejsu — nie łączyć logiki różnych źródeł w jednej funkcji.

Planowane konektory (kolejność wg planu):
1. Google Places API (Text Search / Nearby Search) — główne źródło, pole `website` (brak = najlepszy sygnał).
2. OpenStreetMap Overpass API — darmowe uzupełnienie, dobre dla mniejszych miejscowości.
3. Rejestry firm: CEIDG/KRS (Polska) — dają `registered_at`, kluczowe dla filtra "młoda firma".
   Kolejne kraje (UK Companies House, OpenCorporates) dopiero po ustabilizowaniu PL.

## Twarde zasady

- Zero scrapowania Google Maps/Search czy social media botem — wyłącznie oficjalne API/rejestry
  (patrz root `CLAUDE.md`, zasada 6).
- Każdy wynik musi mieć `source` + `source_id`, żeby `apps/api` mógł zrobić dedup przy zapisie.
- Klucze API (np. `GOOGLE_PLACES_API_KEY`) tylko przez zmienne środowiskowe (`.env`), nigdy hardkodowane.

## Status: Discovery Engine (Faza 1) zbudowany

- `osm.py` — konektor Overpass API, geokodowanie przez Nominatim (`geocoding.py`). Zweryfikowany
  na żywych danych (527 fryzjerów w Krakowie, w tym wiele bez strony; kwiaciarnie w Zakopanem
  zapisane i poprawnie odrzucone jako duplikat przy powtórnym uruchomieniu).
- `google_places.py` — gotowy, ale nieaktywny bez `GOOGLE_PLACES_API_KEY` w `.env`; wtedy
  `run_discovery` po prostu pomija to źródło (`skipped_sources`), nie wywala całego runu.
- **Uwaga o stabilności:** darmowa, publiczna instancja `overpass-api.de` bywa niestabilna pod
  obciążeniem (widziane: 406, 504, connect timeout przy zbyt częstych zapytaniach pod rząd).
  `osm.py` próbuje po kolei serwerów klastra `overpass-api.de` (`OVERPASS_URLS`: główny, `lz4.`, `z.`)
  z 2-sekundową przerwą, ponawiając tylko błędy przeciążenia (429/5xx) i błędy sieci. Zewnętrzne
  mirrory (`overpass.kumi.systems`, `overpass.openstreetmap.ru`) zostały usunięte — w 10.2026 przestały
  odpowiadać. Nie odpytywać Overpass w pętli/testach bez potrzeby — to współdzielony darmowy zasób.
- `industries.py` — startowy zestaw 8 branż (fryzjer, salon kosmetyczny, restauracja, kawiarnia,
  warsztat samochodowy, dentysta, kwiaciarnia, piekarnia). Dodawanie kolejnej branży = jeden wpis
  w `INDUSTRIES` z tagiem OSM + typem Google Places, o ile jest to dobrze otagowane w OSM.
- Zapis/dedup żyje w `apps/api/app/services/discovery_service.py` (nie tutaj) — dedup po
  `(source, source_id)` ORAZ po `normalized_domain` między źródłami (patrz `apps/api/CLAUDE.md`).

## Kolejny krok (Faza 2 — Enrichment)

Rejestry firm (CEIDG/KRS) do `registered_at`, `website_checker` i `email_finder` — to już zakres
`packages/enrichment`, nie tego modułu.
