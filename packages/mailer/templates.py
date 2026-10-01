import re
from dataclasses import dataclass

VAR_RE = re.compile(r"\{\{\s*([a-z_]+)\s*\}\}")

# Zmienne dostępne w temacie i treści. Klucz = nazwa w szablonie, wartość = opis dla UI.
VARIABLES: dict[str, str] = {
    "firma": "Nazwa firmy, np. Maciejka",
    "miasto": "Miasto firmy, np. Zakopane",
    "branza": "Branża małą literą, np. kwiaciarnia",
    "problem": "Jedno zdanie o tym, co jest nie tak ze stroną (albo że jej nie ma)",
    "strona": "Adres obecnej strony firmy, jeśli jest",
    "nadawca": "Twoje imię i nazwisko",
}

# Frazy dopasowane do konstrukcji "zauważyłem, że {{problem}}." -- zmieniając je, sprawdź podgląd.
_PROBLEMS = {
    "none": "Państwa firma nie ma jeszcze strony internetowej",
    "dead": "strona obecnie się nie otwiera",
    "outdated": "strona nie wyświetla się dobrze na telefonach",
    "ok": "strona działa, ale wygląda na dawno nieodświeżaną",
    "unknown": "nie udało mi się otworzyć strony",
}


class TemplateError(ValueError):
    pass


def problem_sentence(website_status: str) -> str:
    return _PROBLEMS.get(website_status, _PROBLEMS["unknown"])


def unknown_variables(text: str) -> set[str]:
    return {name for name in VAR_RE.findall(text) if name not in VARIABLES}


def validate(subject: str, body: str) -> None:
    if not subject.strip():
        raise TemplateError("Temat nie może być pusty")
    if not body.strip():
        raise TemplateError("Treść nie może być pusta")
    unknown = unknown_variables(subject) | unknown_variables(body)
    if unknown:
        raise TemplateError(f"Nieznane zmienne: {', '.join(sorted(unknown))}. Dostępne: {', '.join(VARIABLES)}")
    if "\n" in subject:
        raise TemplateError("Temat musi mieścić się w jednej linii")


def render(text: str, context: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        name = match.group(1)
        if name not in context:
            raise TemplateError(f"Brak wartości dla zmiennej {{{{{name}}}}}")
        return context[name]

    return VAR_RE.sub(replace, text)


@dataclass(frozen=True)
class Sender:
    name: str  # "Jan Kowalski"
    email: str  # adres From, np. jan@mojadomena.pl
    # Linia pod imieniem w podpisie: czym się zajmujesz i jak się skontaktować. Przy działalności
    # gospodarczej także nazwa firmy, adres i NIP.
    identity: str

    def missing(self) -> list[str]:
        return [
            label
            for label, value in (("imię i nazwisko", self.name), ("adres e-mail", self.email), ("opis w podpisie", self.identity))
            if not value.strip()
        ]


def footer(sender: Sender) -> str:
    """Podpis dołączany przez silnik do KAŻDEGO maila. Szablon nie może go usunąć ani pominąć,
    dlatego szablony kończą się samym "Pozdrawiam" -- imię i nazwisko dokłada podpis."""
    return (
        "\n\n--\n"
        f"{sender.name}\n"
        f"{sender.identity}\n\n"
        "Jeśli nie chcą Państwo więcej wiadomości ode mnie, wystarczy odpisać „wypisz” "
        "— nie skontaktuję się ponownie."
    )
