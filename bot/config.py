from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Telegram
    BOT_TOKEN: str
    WEBHOOK_URL: str = ""
    WEBHOOK_SECRET: str = ""
    WEBHOOK_PATH: str = "/webhook"

    # API
    API_BASE_URL: str = "http://localhost:8000/api/v1"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/1"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Sentry
    SENTRY_DSN: str = ""

    # App
    ADMIN_IDS: list[int] = Field(default_factory=list)
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
