# packages/mailer — wysyłka, warmup, deliverability

Czyste funkcje bez bazy danych (tak jak `packages/discovery` i `packages/enrichment`). Orkiestracja,
kolejka i zabezpieczenia: `apps/api/app/services/mailer_service.py`, endpointy: `apps/api/app/routers/campaigns.py`.

- `templates.py` — zmienne szablonu (`VARIABLES`: firma, miasto, branza, problem, strona, nadawca),
  walidacja (nieznana zmienna = błąd przy zapisie kampanii), `render`, frazy `{{problem}}` dopasowane do
  konstrukcji "zauważyłem, że …", oraz `footer()` — stopka nadawcy.
- `warmup.py` — `daily_cap()`: 10 / 15 / 25 / 35 maili dziennie w tygodniach 1–4 od
  `MAILBOX_WARMUP_START`, potem `DAILY_SEND_LIMIT`. Brak daty = skrzynka traktowana jako nowa.
- `smtp.py` — wiadomość czysto tekstowa (lepiej dochodzi przy cold mailingu), nagłówek
  `List-Unsubscribe: <mailto:…?subject=wypisz>`, STARTTLS jeśli serwer go oferuje.

## Twarde zasady (egzekwowane w `mailer_service.py`, nie w UI)

1. Przed KAŻDYM mailem (nie tylko przy dodawaniu do kolejki) ponownie: `Company.excluded_at`,
   `suppression_list` po adresie, oraz czy ta firma LUB ten adres dostały już wiadomość z jakiejkolwiek
   kampanii. Trafienie = status `SKIPPED` z powodem, mail nie wychodzi.
2. `send_campaign(..., dry_run=True)` domyślnie tylko liczy plan. Prawdziwa wysyłka wymaga `dry_run=False`
   ORAZ uzupełnionych `SENDER_NAME`, `SENDER_EMAIL`, `SENDER_IDENTITY` i `SMTP_HOST`.
3. Dzienny limit liczony z `send_log` (statusy z `DELIVERED_STATUSES`, doba wg Europe/Warsaw) twardo
   zatrzymuje pętlę wysyłki, niezależnie od długości kolejki.
4. **Stopkę z danymi nadawcy i instrukcją wypisania dokleja silnik do każdego maila** — szablon nie musi
   (i nie może) jej zawierać ani usunąć. To mocniejsze niż walidacja placeholdera: nie da się o niej zapomnieć.
   Wypisanie przez odpowiedź "wypisz", bo aplikacja działa lokalnie i link http byłby nieosiągalny.
5. Domyślnie do kolejki trafiają tylko adresy potwierdzone (znalezione na stronie albo dopisane ręcznie).
   Odgadnięte (`kontakt@domena`) tylko gdy kampania ma `allow_guessed_emails=True`.
6. Kampanii, z której wyszedł choć jeden mail, nie da się usunąć — jej `send_log` chroni przed ponownym
   kontaktem z tymi samymi firmami.

## Gotowe szablony (`starters.py`)

Trzy szablony pierwszej wiadomości, z zasadami pisania w docstringu. Najważniejsza: **zmienne
wstawiają się w mianowniku**, więc stoją tylko w temacie, nawiasie albo dopowiedzeniu ("trafiłem na
Państwa firmę ({{firma}})"), nigdy "w {{miasto}}". Frazy `{{problem}}` są pisane pod "zauważyłem, że …"
— zmieniając je, wyrenderuj szablony na prawdziwych firmach (`POST /campaigns/render`) i przeczytaj.
Pierwszy mail o nic nie prosi poza odpowiedzią na pytanie "czy mogę przesłać przykłady?".

## Testowanie

Docker Compose ma Mailpit (SMTP `mailpit:1025`, podgląd http://localhost:8025).
- **Wysyłka partii na Mailpit jest zablokowana** (`is_test_mailbox()`): zapisałaby prawdziwe firmy jako
  "już kontaktowane", choć nic do nich nie wyszło. Do testów treści: `POST /campaigns/{id}/test`
  ("Wyślij test do siebie") — nie trafia do `send_log` ani do limitu.
- Jeśli testujesz silnik ręcznie z inną skrzynką na prawdziwych firmach z rejestru, **usuń potem
  testowe wpisy z `send_log`**.

## Jeszcze nie ma (faza 5)

Wykrywanie odpowiedzi i "wypisz" (IMAP), obsługa odbić, monitoring reputacji (Google Postmaster Tools).
