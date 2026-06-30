"""
Integration test configuration.
Overrides database with SQLite in-memory for testing.
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
    """Patch the database engine to use SQLite in-memory before any test runs."""
    test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    original_engine = database.engine
    original_factory = database.async_session_factory
    database.engine = test_engine
    database.async_session_factory = test_session_factory

    yield

    database.engine = original_engine
    database.async_session_factory = original_factory
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(patch_database) -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh SQLite session for each test."""
    async with database.async_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def override_deps(db_session):
    """Override FastAPI dependencies with real SQLite session."""

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
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(override_deps):
    """Create an async test client with overridden deps."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
