# packages/mailer — wysyłka, warmup, deliverability

**Status: nie zbudowane jeszcze.** Zaplanowane w osobnej sesji (patrz root `CLAUDE.md` → Mailer Engine).

## Zakres modułu

Silnik wysyłki kampanii: renderowanie szablonu (`Campaign.subject_template`/`body_template` +
zmienne per firma), rate limiter z harmonogramem warmupu (`DAILY_SEND_LIMIT`), wysyłka SMTP z
opóźnieniami między mailami, obsługa bounce'ów i odpowiedzi (IMAP), integracja z Google Postmaster
Tools do monitoringu reputacji.

## Twarde zasady (egzekwowane w kodzie tego modułu, nie tylko w UI)

1. Przed wysyłką do kontaktu: sprawdzenie `suppression_list` (po e-mailu) ORAZ `send_log`
   (czy ten `contact_id` już ma wpis w tej kampanii — unikalny constraint w DB to ostatnia linia
   obrony, ale logika aplikacji musi to sprawdzać wcześniej i po prostu pominąć kontakt).
2. Każda funkcja wysyłająca ma domyślny `dry_run=True` — realna wysyłka wymaga jawnego
   przekazania `dry_run=False` przez wywołującego.
3. Rate limiter liczy wysłane maile per dzień per skrzynka i twardo blokuje przekroczenie
   `DAILY_SEND_LIMIT` niezależnie od tego, ile leadów czeka w kolejce.
4. Każdy szablon musi zawierać placeholder na link wypisania i dane nadawcy — walidacja przy
   tworzeniu kampanii powinna to wymuszać, nie tylko dokumentacja.
