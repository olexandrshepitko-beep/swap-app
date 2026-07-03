from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/barter"
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- Telegram ---
    BOT_TOKEN: str  # без дефолта — падаем на старте, если не задан в env
    BOT_USERNAME: str = ""  # для deep link'ов (t.me/<username>), не путать с ID

    # Секрет, который Telegram будет присылать в заголовке
    # X-Telegram-Bot-Api-Secret-Token на каждый webhook-запрос.
    # Генерируется вами (например: python -c "import secrets;print(secrets.token_urlsafe(32))")
    # и передаётся В Telegram при вызове setWebhook(secret_token=...).
    TELEGRAM_WEBHOOK_SECRET: str

    # Provider token из BotFather (/mybots -> Payments) для фиатных провайдеров
    # (ЮKassa, Stripe и т.п.). Если оплата идёт через Telegram Stars —
    # оставить пустым и использовать CURRENCY="XTR".
    TELEGRAM_PROVIDER_TOKEN: str = ""
    CURRENCY: str = "XTR"  # XTR = Telegram Stars; либо "USD"/"RUB" с провайдером

    TON_API_KEY: str = ""
    SECRET_KEY: str  # без дефолта — падаем на старте, если не задан в env

    PRO_PRICE: float = 10.0
    MATCH_PRICE: float = 0.5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
