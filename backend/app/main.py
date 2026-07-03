from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import get_engine, get_base, dispose_engine
from app.api import auth, items, swipe, match, payment, chat, subscription, telegram_webhook, media


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await dispose_engine()


app = FastAPI(
    title="Barter Marketplace API",
    description="Backend core for barter marketplace Telegram Mini App",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://web.telegram.org",
        "https://t.me",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(swipe.router)
app.include_router(match.router)
app.include_router(payment.router)
app.include_router(chat.router)
app.include_router(subscription.router)
app.include_router(telegram_webhook.router)
app.include_router(media.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "barter-marketplace-api"}


# ВНИМАНИЕ: /debug эндпоинт УДАЛЁН — он отдавал без авторизации префикс
# BOT_TOKEN и наличие/отсутствие SECRET_KEY в env любому анонимному запросу.
# Если нужен health/diag — делайте отдельный роут за админ-авторизацией,
# не паблик GET.
