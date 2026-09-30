from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://leads:leads_dev_password@localhost:5432/leads"
    daily_send_limit: int = 20


settings = Settings()
