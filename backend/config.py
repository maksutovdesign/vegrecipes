from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://vegrecipes:vegrecipes@localhost:5432/vegrecipes"
    DATABASE_URL_SYNC: str = "postgresql://vegrecipes:vegrecipes@localhost:5432/vegrecipes"
    REDIS_URL: str = "redis://localhost:6379/0"
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "vegrecipes"
    S3_SECRET_KEY: str = "vegrecipes_secret"
    S3_BUCKET: str = "vegrecipes-media"

    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_MONTHLY_PRICE_ID: str = ""
    STRIPE_PRO_YEARLY_PRICE_ID: str = ""

    APP_URL: str = "http://localhost:3000"  # override in prod: https://vegrecipes.ru
    APP_ENV: str = "development"
    DEBUG: bool = False  # NEVER true in production
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    # Sentry
    SENTRY_DSN: str = ""

    # SMTP (email verification & password reset)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@vegrecipes.ru"

    def get_cors_origins(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
