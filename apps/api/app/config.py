from datetime import date

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://leads:leads_dev_password@localhost:5432/leads"

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    sender_name: str = ""
    sender_email: str = ""
    sender_identity: str = ""

    daily_send_limit: int = 20
    mailbox_warmup_start: str = ""  # YYYY-MM-DD, dzień pierwszej wysyłki z nowej skrzynki
    send_delay_min_s: float = 45
    send_delay_max_s: float = 120

    @property
    def warmup_start(self) -> date | None:
        try:
            return date.fromisoformat(self.mailbox_warmup_start) if self.mailbox_warmup_start else None
        except ValueError:
            return None


settings = Settings()
