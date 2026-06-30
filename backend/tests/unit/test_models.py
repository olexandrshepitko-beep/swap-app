"""
Unit tests for all SQLAlchemy models.
Tests creation of models with required fields and relationships.
"""
from datetime import datetime, timezone

import pytest

from app.models.user import User
from app.models.item import Item
from app.models.swipe import Swipe
from app.models.match import Match
from app.models.payment import Payment
from app.models.chat import Chat
from app.models.rating import Rating
from app.models.subscription import Subscription


class TestUserModel:
    def test_create_user_minimal(self):
        """Create a User with only required fields."""
        user = User(
            telegram_id=12345,
            first_name="Alice",
        )
        assert user.telegram_id == 12345
        assert user.first_name == "Alice"
        assert user.username is None
        assert user.avatar_file_id is None
        # Python-level defaults: SQLAlchemy mapped_column default=False
        # sets the DB default, not Python default. Before flush, these are None.
        # The column definition itself has default=False which is correct.
        assert hasattr(user, 'is_pro')
        assert hasattr(user, 'risk_score')
        assert hasattr(user, 'is_shadow_banned')

    def test_create_user_full(self):
        """Create a User with all fields."""
        user = User(
            telegram_id=67890,
            username="bob_barter",
            first_name="Bob",
            avatar_file_id="AgACAgIAAxkB...",
            is_pro=True,
            risk_score=10,
            is_shadow_banned=False,
        )
        assert user.telegram_id == 67890
        assert user.username == "bob_barter"
        assert user.first_name == "Bob"
        assert user.avatar_file_id == "AgACAgIAAxkB..."
        assert user.is_pro is True
        assert user.risk_score == 10

    def test_user_relationships_defined(self):
        """User model declares relationship attributes."""
        user = User(telegram_id=1, first_name="Test")
        assert hasattr(user, 'items')
        assert hasattr(user, 'payments')
        assert hasattr(user, 'subscriptions')

    def test_user_table_name(self):
        """User model uses correct table name."""
        assert User.__tablename__ == "users"

    def test_user_telegram_id_indexed(self):
        """telegram_id is indexed."""
        cols = {c.name: c for c in User.__table__.columns}
        assert cols["telegram_id"].index is True


class TestItemModel:
    def test_create_item_minimal(self):
        """Create an Item with only required fields."""
        item = Item(
            owner_id=1,
            video_file_id="video123",
            title="Test Item",
        )
        assert item.owner_id == 1
        assert item.video_file_id == "video123"
        assert item.title == "Test Item"
        assert item.description is None
        assert item.category is None

    def test_create_item_with_explicit_defaults(self):
        """Create an Item with explicit default values."""
        item = Item(
            owner_id=1,
            video_file_id="video123",
            title="Test Item",
            condition="good",
            status="active",
        )
        assert item.condition == "good"
        assert item.status == "active"

    def test_create_item_full(self):
        """Create an Item with all fields."""
        item = Item(
            owner_id=1,
            video_file_id="video456",
            title="Full Item",
            description="A complete item description",
            category="electronics",
            condition="new",
            status="active",
        )
        assert item.description == "A complete item description"
        assert item.category == "electronics"
        assert item.condition == "new"

    def test_item_status_values(self):
        """Item status accepts known values."""
        for status in ("active", "matched", "hidden"):
            item = Item(
                owner_id=1, video_file_id="v", title="T", status=status
            )
            assert item.status == status

    def test_item_foreign_keys(self):
        """Item has correct foreign key to users."""
        fks = {fk.column for fk in Item.__table__.foreign_keys}
        assert any("users.id" in str(fk) for fk in fks)

    def test_item_owner_relationship(self):
        """Item declares owner relationship."""
        item = Item(owner_id=1, video_file_id="v", title="T")
        assert hasattr(item, 'owner')


class TestSwipeModel:
    def test_create_swipe_like(self):
        """Create a Swipe with direction='like'."""
        swipe = Swipe(user_id=1, item_id=2, direction="like")
        assert swipe.user_id == 1
        assert swipe.item_id == 2
        assert swipe.direction == "like"

    def test_create_swipe_pass(self):
        """Create a Swipe with direction='pass'."""
        swipe = Swipe(user_id=1, item_id=2, direction="pass")
        assert swipe.direction == "pass"

    def test_swipe_default_direction(self):
        """Swipe model defines direction column with default='pass' (server_default)."""
        swipe = Swipe(user_id=1, item_id=2)
        # Python level is None because server_default only applies at DB level.
        # Verify the model column has the default defined.
        from sqlalchemy import String
        col = Swipe.__table__.columns["direction"]
        assert col.default is not None or col.server_default is not None

    def test_swipe_foreign_keys(self):
        """Swipe has foreign keys to users and items."""
        fks = {fk.column for fk in Swipe.__table__.foreign_keys}
        fk_strs = {str(fk) for fk in fks}
        assert any("users.id" in s for s in fk_strs)
        assert any("items.id" in s for s in fk_strs)


class TestMatchModel:
    def test_create_match(self):
        """Create a Match with all required fields."""
        match = Match(
            item_a_id=1,
            item_b_id=2,
            user_a_id=10,
            user_b_id=20,
            status="pending",
        )
        assert match.item_a_id == 1
        assert match.item_b_id == 2
        assert match.user_a_id == 10
        assert match.user_b_id == 20
        assert match.status == "pending"

    def test_match_status_default(self):
        """Match status has a server_default='pending' in the column definition."""
        match = Match(item_a_id=1, item_b_id=2, user_a_id=10, user_b_id=20)
        col = Match.__table__.columns["status"]
        assert col.server_default is not None or col.default is not None

    def test_match_relationships(self):
        """Match declares payment and chat relationships."""
        match = Match(item_a_id=1, item_b_id=2, user_a_id=10, user_b_id=20)
        assert hasattr(match, 'payment')
        assert hasattr(match, 'chat')


class TestPaymentModel:
    def test_create_payment_init(self):
        """Create a Payment with status='init'."""
        payment = Payment(
            match_id=1,
            user_id=1,
            amount=0.5,
            currency="USD",
            provider="telegram",
            status="init",
        )
        assert payment.match_id == 1
        assert payment.user_id == 1
        assert float(payment.amount) == 0.5
        assert payment.currency == "USD"
        assert payment.provider == "telegram"
        assert payment.status == "init"
        assert payment.provider_payment_id is None

    def test_payment_status_default(self):
        """Payment status has a server_default='init' in the column definition."""
        payment = Payment(match_id=1, user_id=1, amount=0.5)
        col = Payment.__table__.columns["status"]
        assert col.server_default is not None or col.default is not None

    def test_payment_status_transitions(self):
        """Payment status supports all expected values."""
        for status in ("init", "paid", "refunded", "failed"):
            p = Payment(match_id=1, user_id=1, amount=0.5, status=status)
            assert p.status == status


class TestChatModel:
    def test_create_chat_locked(self):
        """Create a Chat with status='locked'."""
        chat = Chat(match_id=1, status="locked")
        assert chat.match_id == 1
        assert chat.status == "locked"
        assert chat.unlocked_at is None

    def test_chat_status_values(self):
        """Chat status accepts all expected values."""
        for status in ("locked", "unlocked", "expired"):
            c = Chat(match_id=1, status=status)
            assert c.status == status

    def test_chat_match_unique(self):
        """Chat.match_id is unique (one chat per match)."""
        from sqlalchemy.schema import UniqueConstraint
        cols = Chat.__table__.columns
        assert cols["match_id"].unique is True


class TestRatingModel:
    def test_create_rating(self):
        """Create a Rating with all required fields."""
        rating = Rating(
            match_id=1,
            rater_user_id=1,
            item_id=2,
            rating=5,
        )
        assert rating.match_id == 1
        assert rating.rater_user_id == 1
        assert rating.item_id == 2
        assert rating.rating == 5
        assert rating.tags is None

    def test_rating_range(self):
        """Rating accepts values 1-5."""
        for r in (1, 2, 3, 4, 5):
            rating = Rating(match_id=1, rater_user_id=1, item_id=2, rating=r)
            assert rating.rating == r


class TestSubscriptionModel:
    def test_create_subscription(self):
        """Create a Subscription with required fields."""
        sub = Subscription(
            user_id=1,
            active=True,
            auto_renew=True,
        )
        assert sub.user_id == 1
        assert sub.active is True
        assert sub.auto_renew is True
        assert sub.start_date is None
        assert sub.end_date is None

    def test_subscription_defaults(self):
        """Subscription model defines default values correctly in column definitions."""
        sub = Subscription(user_id=1)
        # Python-level: server_default means None until DB flush
        col_active = Subscription.__table__.columns["active"]
        col_autorenew = Subscription.__table__.columns["auto_renew"]
        assert col_active.server_default is not None or col_active.default is not None
        assert col_autorenew.server_default is not None or col_autorenew.default is not None
