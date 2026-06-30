from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/barter"
    REDIS_URL: str = "redis://localhost:6379/0"
    BOT_TOKEN: str = ""  # Must be set via env! Empty default — no token leak
    TON_API_KEY: str = ""
    SECRET_KEY: str = ""  # Must be set via env! Empty default — will raise
    PRO_PRICE: float = 10.0
    MATCH_PRICE: float = 0.5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.BOT_TOKEN:
            raise ValueError("BOT_TOKEN is required! Set it via environment variable or .env file.")
        if not self.SECRET_KEY:
            raise ValueError("SECRET_KEY is required! Set it via environment variable or .env file.")


settings = Settings()
