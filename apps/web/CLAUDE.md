@AGENTS.md

## apps/web — dashboard (Next.js 16, App Router)

Wszystkie ekrany to komponenty klienckie fetchujące z przeglądarki wprost do opublikowanego portu API
(`NEXT_PUBLIC_API_URL`, domyślnie `localhost:8000`) przez `src/lib/api.ts` (obiekt `api`). Nigdy
bezpośrednio z bazą danych. `useSearchParams` wymaga granicy `<Suspense>` (patrz `app/leady/page.tsx`).

## Źródło prawdy dla wyglądu

Zatwierdzona makieta: https://claude.ai/artifact/GEZWGLwvLrFqMvB6e4XAjv (canvas z 6 ekranami). Nowe ekrany
najpierw projektujemy tam, dopiero po akceptacji przenosimy do kodu.

- **Czcionka:** jedna rodzina, Schibsted Grotesk (`layout.tsx`, zmienna `--font-app`). Bez serifu i bez
  monospace; liczby przez klasę `.num` (cyfry tabelaryczne).
- **Kolory i tokeny:** `globals.css` `:root` — ciemna rama (`--frame`), jasny arkusz (`--sheet`), panele
  (`--surface`), jeden akcent ochry (`--accent`) dla leadów do działania, zieleń (`--positive`) dla
  "strona działa". Świadomie bez kremowo-terakotowego i czarno-neonowego schematu.
- **Komponenty CSS** (też w `globals.css`): `.panel`, `.btn-*`, `.pill-*`, `.mono-*`, `.seg`, `.lrow`,
  `.tile`, `.switch`, `.run`, `.why`, `.fact`, `.tl` — reużywaj ich zamiast pisać nowe style inline.
- **Ruch:** jedna sekwencja wejścia (`.rise .d1-.d3`), liczniki `useCountUp`, rosnące paski (`.fill`),
  pierścień wyniku, płynne rozwijanie wierszy. Wszystko wyłączone przy `prefers-reduced-motion`.
- **Dostępność:** `:focus-visible` globalnie, `aria-expanded`/`aria-current`/`role="switch"`,
  potwierdzenie wykluczenia przez drugi klik zamiast `window.confirm`.

## Ekrany

| Trasa | Plik | Uwagi |
|---|---|---|
| `/` | `app/page.tsx` | Pulpit: liczniki ze `/companies/stats`, top 4 leady, oś aktywności z `/runs` |
| `/leady` | `app/leady/page.tsx` | zakładki statusu (liczniki ze stats), filtr branży, wyszukiwanie `?q=`, paginacja |
| `/leady/[id]` | `app/leady/[id]/page.tsx` | karta firmy: pierścień wyniku, rozbicie punktów, ręczny kontakt, wykluczenie |
| `/znajdz` | `app/znajdz/page.tsx` | discovery; kroki postępu są orientacyjne (API odpowiada jednym wynikiem) |
| `/kampanie` | `app/kampanie/page.tsx` | statyczny podgląd fazy 4 |
| `/ustawienia` | `app/ustawienia/page.tsx` | status kluczy z `/settings/status`; klucze trzymamy w `.env`, nie w UI |

Po każdej zmianie danych (discovery, enrichment, wykluczenie, kontakt) wołaj `notifyLeadsChanged()`
(`lib/events.ts`) — odświeża liczniki w sidebarze i na Pulpicie.

## Świadome odstępstwa od makiety

- Ustawienia nie mają pól do wpisania klucza API — klucze nie powinny przechodzić przez przeglądarkę ani
  lądować w bazie; UI pokazuje status i nazwę zmiennej w `.env`.
- Filtr "Kraj" pominięty, dopóki rejestr ma tylko PL (wróci w fazie 6).
