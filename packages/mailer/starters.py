"""Gotowe szablony pierwszej wiadomości.

Zasady, według których są napisane (trzymaj się ich przy zmianach):
- Zmienne tylko w miejscach, gdzie mianownik brzmi naturalnie: temat, dopowiedzenie po przecinku,
  nawias. "w {{miasto}}" dałoby "w Zakopane" -- dlatego nigdzie tak nie piszemy.
- Pierwszy mail o nic nie prosi poza krótką odpowiedzią: "czy mogę przesłać przykłady?". Bez cennika,
  linków i załączników -- tak lepiej dochodzi, a odbiorca decyduje, czy chce oferty.
- Jedna konkretna obserwacja o TEJ firmie ({{problem}}), jeden argument biznesowy, jedno pytanie.
- 70-120 słów, zero wykrzykników i słów typu "promocja", "darmowe", "gwarancja sukcesu".
- Bez "Pozdrawiam, {{nadawca}}" -- imię i nazwisko dokłada podpis (stopka) silnika.
"""

STARTERS: list[dict[str, str]] = [
    {
        "key": "bez-strony",
        "name": "Firma bez strony",
        "for": "none",
        "description": "Najmocniejszy przypadek: firma działa, ale w internecie nie ma jej strony.",
        "subject": "{{firma}} — strona internetowa",
        "body": (
            "Dzień dobry,\n\n"
            "przeglądałem lokalne firmy ({{miasto}} i okolice) i trafiłem na Państwa firmę ({{firma}}). "
            "Zauważyłem, że {{problem}}.\n\n"
            "Dziś większość klientów, zanim zadzwoni albo przyjdzie, sprawdza w telefonie ofertę, "
            "godziny otwarcia i dojazd. Prosta strona sprawia, że wtedy znajdują Państwa, "
            "a nie konkurencję.\n\n"
            "Robię takie strony dla lokalnych firm: jedna przejrzysta strona z ofertą, zdjęciami, mapą "
            "i przyciskiem „zadzwoń”, dobrze działająca na telefonie. Bez abonamentów.\n\n"
            "Czy mogę przesłać 2–3 przykłady i orientacyjną wycenę?\n\n"
            "Pozdrawiam"
        ),
    },
    {
        "key": "slaba-strona",
        "name": "Przestarzała lub niedziałająca strona",
        "for": "outdated,dead",
        "description": "Strona jest, ale się nie otwiera albo źle wygląda na telefonie.",
        "subject": "Krótka uwaga o stronie {{strona}}",
        "body": (
            "Dzień dobry,\n\n"
            "sprawdzałem stronę Państwa firmy ({{strona}}) i zauważyłem, że {{problem}}.\n\n"
            "Piszę, bo łatwo to przeoczyć, a większość klientów szuka dziś firm w telefonie. "
            "Strona bywa pierwszym wrażeniem — jeszcze zanim ktoś zadzwoni albo przyjdzie.\n\n"
            "Zajmuję się odświeżaniem stron małych firm: nowoczesny wygląd, szybkie ładowanie i wygodna "
            "obsługa na telefonie, z zachowaniem tego, co Państwo już mają.\n\n"
            "Czy mogę przygotować krótką propozycję, jak mogłaby wyglądać nowa wersja? Bez zobowiązań.\n\n"
            "Pozdrawiam"
        ),
    },
    {
        "key": "krotki",
        "name": "Krótka wersja",
        "for": "none",
        "description": "Trzy zdania. Dobra do porównania z dłuższą wersją na części firm.",
        "subject": "Pytanie o stronę internetową",
        "body": (
            "Dzień dobry,\n\n"
            "szukałem w internecie Państwa firmy — {{firma}}, {{miasto}} — i nie znalazłem strony internetowej.\n\n"
            "Robię proste strony-wizytówki dla lokalnych firm, takie, które dobrze wyglądają na telefonie "
            "i pomagają klientom Państwa znaleźć. Czy mogę przesłać kilka przykładów i cenę?\n\n"
            "Pozdrawiam"
        ),
    },
]
