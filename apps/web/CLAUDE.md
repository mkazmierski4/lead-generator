@AGENTS.md

## apps/web — dashboard (Next.js)

Konwencje: App Router, TypeScript, Tailwind. Komunikacja z backendem wyłącznie przez
`NEXT_PUBLIC_API_URL` (patrz `src/lib/api.ts`) — nigdy bezpośrednio z bazą danych.

Pełny dashboard (lista/filtrowanie leadów, podgląd kampanii, statystyki wysyłek) to osobny
etap prac (patrz root `CLAUDE.md` → "Status budowy" → Dashboard). Obecnie jest tu tylko
strona startowa sprawdzająca połączenie z API.

