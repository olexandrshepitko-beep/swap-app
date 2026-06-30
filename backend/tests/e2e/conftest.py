
"""
E2E test configuration.
Overrides database with SQLite in-memory for full cycle testing.
"""
import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.core import database
from app.core.database import Base, get_async_session
from app.api.deps import get_current_user
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def patch_database():
    test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    database.engine = test_engine
    database.async_session_factory = test_session_factory
    yield
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(patch_database) -> AsyncGenerator[AsyncSession, None]:
    async with database.async_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return User(
            id=1,
            telegram_id=12345,
            username="testuser",
            first_name="Test",
            is_pro=False,
            risk_score=0,
            is_shadow_banned=False,
        )

    app.dependency_overrides[get_async_session] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
