import smtplib
import ssl
import uuid
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, formatdate


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    user: str
    password: str

    @property
    def configured(self) -> bool:
        return bool(self.host)


@dataclass(frozen=True)
class OutgoingMail:
    to: str
    subject: str
    body: str
    from_name: str
    from_email: str


def build_message(mail: OutgoingMail) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((mail.from_name, mail.from_email))
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    msg["Date"] = formatdate(localtime=True)
    domain = mail.from_email.split("@")[-1] or "localhost"
    msg["Message-ID"] = f"<{uuid.uuid4()}@{domain}>"
    # Wypisanie przez odpowiedź -- aplikacja działa lokalnie, więc link http nie byłby osiągalny dla
    # odbiorcy. Klienci poczty pokazują przy tym nagłówku przycisk "Wypisz".
    msg["List-Unsubscribe"] = f"<mailto:{mail.from_email}?subject=wypisz>"
    # Celowo czysty tekst: przy cold mailingu wygląda jak normalna korespondencja i lepiej dochodzi.
    msg.set_content(mail.body)
    return msg


def send(config: SmtpConfig, mail: OutgoingMail) -> None:
    if not config.configured:
        raise RuntimeError("Brak SMTP_HOST w .env -- wysyłka niemożliwa")
    msg = build_message(mail)
    with smtplib.SMTP(config.host, config.port, timeout=30) as smtp:
        smtp.ehlo()
        if smtp.has_extn("starttls"):
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        if config.user:
            smtp.login(config.user, config.password)
        smtp.send_message(msg)
