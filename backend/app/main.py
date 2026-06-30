from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import get_engine, get_base, dispose_engine
from app.api import auth, items, swipe, match, payment, chat, subscription


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize database tables on startup."""
    engine = get_engine()
    base = get_base()
    async with engine.begin() as conn:
        await conn.run_sync(base.metadata.create_all)
    yield
    await dispose_engine()


app = FastAPI(
    title="Barter Marketplace API",
    description="Backend core for barter marketplace Telegram Mini App",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Telegram WebApp and development origins
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
    allow_headers=["Content-Type", "Authorization", "X-Telegram-Init-Data", "X-User-Id"],
)

# Register routers
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(swipe.router)
app.include_router(match.router)
app.include_router(payment.router)
app.include_router(chat.router)
app.include_router(subscription.router)


@app.get("/health")
async def health():
    """Healthcheck — instant, no DB dependency."""
    return {"status": "ok", "service": "barter-marketplace-api"}
