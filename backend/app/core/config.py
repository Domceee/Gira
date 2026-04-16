from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    APP_DATABASE_URL: str | None = None
    DATABASE_URL: str | None = None

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASS: str
    SMTP_FROM: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    FRONTEND_URL: str

    @model_validator(mode="before")
    @classmethod
    def _load_database_url(cls, values):
        if isinstance(values, dict):
            values["DATABASE_URL"] = values.get("DATABASE_URL") or values.get("APP_DATABASE_URL")
        return values

    @model_validator(mode="after")
    @classmethod
    def _require_database_url(cls, values):
        if values.DATABASE_URL is None:
            raise ValueError("DATABASE_URL or APP_DATABASE_URL must be set")
        return values

settings = Settings()