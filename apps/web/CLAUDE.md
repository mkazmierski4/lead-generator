@AGENTS.md

## apps/web — dashboard (Next.js)

Konwencje: App Router, TypeScript, Tailwind. Komunikacja z backendem wyłącznie przez
`NEXT_PUBLIC_API_URL` (patrz `src/lib/api.ts`) — nigdy bezpośrednio z bazą danych. Dashboard to
komponent kliencki (`"use client"`), fetchuje po stronie przeglądarki wprost do opublikowanego
portu API (`localhost:8000`) -- w przeciwieństwie do ewentualnych Server Components, przeglądarka
nie ma dostępu do wewnątrz-sieciowego adresu Dockera (`API_INTERNAL_URL`), więc nie ma tu tego
samego problemu co z pierwotną stroną startową z Fazy 0.

## Design: "rejestr inspekcyjny"

Dashboard to narzędzie robocze (używane codziennie do przeglądania dziesiątek leadów), nie strona
marketingowa -- stąd układ rejestru/listy (nie kart z cieniami), gęsty ale czytelny, z pełnym
uzasadnieniem każdego wyniku rozwijanym pod wierszem (`Company.score_explanation` nie może być
czarną skrzynką -- to wymóg z `packages/enrichment/CLAUDE.md`).

- **Kolor** (`globals.css`, tokeny `--paper`/`--ink`/`--signal`): papierowa stonowana
  zieleń-szarość + ciepła bliska-czerń + jeden akcent (ceglasta czerwień) zarezerwowany
  wyłącznie dla leadów "gotowych do kontaktu" (`lib/labels.ts::isActionable`). Ma wariant dark mode.
  Świadomie NIE kremowo-terakotowy i NIE czarno-neonowy -- to dwa najczęstsze domyślne schematy AI.
- **Typografia** (`layout.tsx`, `next/font/google`): Source Serif 4 na nazwy firm/tytuł, IBM Plex
  Sans na UI, IBM Plex Mono tylko na kolumnę wyniku (jedyne miejsce z faktycznie tabelarycznymi
  danymi -- mono nie jest tu dekoracją domyślną).
- Każdy interaktywny element ma `focus-visible` (nie tylko domyślny outline przeglądarki) --
  pilnować tego przy dodawaniu nowych przycisków/linków.

## Komponenty

- `app/page.tsx` — orkiestracja: stan filtrów, paginacja (`limit`/`offset`), fetch przy zmianie
  filtrów.
- `components/LeadRow.tsx` — wiersz rejestru, rozwijany do pełnej listy powodów scoringu + adresu/
  strony/źródła.
- `components/FilterBar.tsx` — branża / status strony / kraj / min. wynik.
- `components/DiscoveryPanel.tsx` — formularz uruchamiający `POST /discovery/run` (kraj, miasto,
  branża, źródła OSM/Google Places).
- `components/EnrichmentButton.tsx` — uruchamia `POST /enrichment/run`.

Zweryfikowane: `tsc --noEmit` i `next lint` czyste, strona renderuje się i realnie łączy z API
(dane testowe z Zakopanego z Fazy 1/2). Bez zrzutu ekranu (brak narzędzi przeglądarki w tym
środowisku) -- jeśli coś wygląda źle wizualnie, daj znać, żeby to poprawić.

