"""
Shared fixtures for all backend tests.
Provides mock database sessions and test models.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.user import User
from app.models.item import Item
from app.models.swipe import Swipe
from app.models.match import Match
from app.models.payment import Payment
from app.models.chat import Chat
from app.models.rating import Rating
from app.models.subscription import Subscription


@pytest.fixture
def mock_db() -> AsyncMock:
    """Create a mock AsyncSession.
    - db.execute() is async (AsyncMock), returns MagicMock with sync scalar_one_or_none
    - db.get() is async (AsyncMock), returns MagicMock
    """
    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = None
    execute_result.scalars.return_value.all.return_value = []

    session = AsyncMock()
    session.execute.return_value = execute_result
    session.get = AsyncMock()
    return session


@pytest.fixture
def sample_user() -> User:
    return User(id=1, telegram_id=123456789, username="testuser", first_name="Test",
                avatar_file_id=None, is_pro=False, risk_score=0, is_shadow_banned=False,
                created_at=datetime(2025, 1, 1, tzinfo=timezone.utc))


@pytest.fixture
def sample_user_new() -> User:
    return User(id=2, telegram_id=987654321, username="newuser", first_name="New",
                avatar_file_id=None, is_pro=False, risk_score=0, is_shadow_banned=False,
                created_at=datetime.now(timezone.utc))


@pytest.fixture
def sample_user_shadow_banned() -> User:
    return User(id=3, telegram_id=555555555, username="banneduser", first_name="Banned",
                avatar_file_id=None, is_pro=False, risk_score=50, is_shadow_banned=True,
                created_at=datetime(2024, 6, 1, tzinfo=timezone.utc))


@pytest.fixture
def sample_user_high_risk() -> User:
    return User(id=4, telegram_id=111111111, username="riskuser", first_name="Risk",
                avatar_file_id=None, is_pro=False, risk_score=85, is_shadow_banned=False,
                created_at=datetime(2024, 1, 1, tzinfo=timezone.utc))


@pytest.fixture
def sample_item() -> Item:
    return Item(id=1, owner_id=1, video_file_id="test_video_id", title="Test Item",
                description="A test item for barter", category="electronics",
                condition="good", status="active",
                created_at=datetime(2025, 1, 15, tzinfo=timezone.utc))


@pytest.fixture
def sample_item_other() -> Item:
    return Item(id=2, owner_id=2, video_file_id="test_video_id_2", title="Another Item",
                description="Another test item", category="clothing",
                condition="like_new", status="active",
                created_at=datetime(2025, 1, 16, tzinfo=timezone.utc))


@pytest.fixture
def sample_swipe() -> Swipe:
    return Swipe(id=1, user_id=1, item_id=2, direction="like",
                 created_at=datetime(2025, 1, 20, tzinfo=timezone.utc))


@pytest.fixture
def sample_match() -> Match:
    return Match(id=1, item_a_id=1, item_b_id=2, user_a_id=1, user_b_id=2,
                 status="pending", created_at=datetime(2025, 1, 20, tzinfo=timezone.utc))


@pytest.fixture
def sample_payment() -> Payment:
    return Payment(id=1, match_id=1, user_id=1, amount=0.5, currency="USD",
                   provider="telegram", status="init", provider_payment_id=None,
                   created_at=datetime(2025, 1, 20, tzinfo=timezone.utc))


@pytest.fixture
def sample_chat() -> Chat:
    return Chat(id=1, match_id=1, status="locked", unlocked_at=None)


@pytest.fixture
def sample_rating() -> Rating:
    return Rating(id=1, match_id=1, rater_user_id=1, item_id=2, rating=5, tags=None,
                  created_at=datetime(2025, 1, 21, tzinfo=timezone.utc))


@pytest.fixture
def sample_subscription() -> Subscription:
    return Subscription(id=1, user_id=1, active=True,
                        start_date=datetime(2025, 1, 1, tzinfo=timezone.utc),
                        end_date=datetime(2025, 2, 1, tzinfo=timezone.utc), auto_renew=True)
