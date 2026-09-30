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
