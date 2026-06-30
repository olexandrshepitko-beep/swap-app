"""
Unit tests for AntiFraudService.
Tests payment blocking conditions: shadow-ban, account age, daily limits, risk score.
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.anti_fraud_service import AntiFraudService
from app.models.user import User
from app.models.item import Item
from app.models.swipe import Swipe


class TestAntiFraudService:
    """Tests for AntiFraudService check_before_payment and apply_limits."""

    @pytest.mark.asyncio
    async def test_check_before_payment_allows_legitimate_user(
        self, mock_db, sample_user
    ):
        """check_before_payment returns (True, 'OK') for a legitimate user."""
        mock_db.get.return_value = sample_user

        # Mock items query: user has items with video
        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = [MagicMock(spec=Item)]
        # Mock swipes query: user has swipe activity
        swipes_result = MagicMock()
        swipes_result.scalar_one_or_none.return_value = MagicMock(spec=Swipe)

        async def mock_execute(query):
            stmt_str = str(query).lower()
            result = MagicMock()
            if "item" in stmt_str and "owner_id" in stmt_str:
                return items_result
            elif "swipe" in stmt_str:
                return swipes_result
            return MagicMock()

        mock_db.execute = AsyncMock(side_effect=mock_execute)

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(sample_user.id)

        assert allow is True
        assert reason == "OK"

    @pytest.mark.asyncio
    async def test_check_before_payment_blocks_shadow_banned(
        self, mock_db, sample_user_shadow_banned
    ):
        """check_before_payment blocks shadow-banned users."""
        mock_db.get.return_value = sample_user_shadow_banned

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(
            sample_user_shadow_banned.id
        )

        assert allow is False
        assert "shadow" in reason.lower()

    @pytest.mark.asyncio
    async def test_check_before_payment_blocks_new_account(
        self, mock_db, sample_user_new
    ):
        """check_before_payment blocks accounts less than 3 days old."""
        mock_db.get.return_value = sample_user_new

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(sample_user_new.id)

        assert allow is False
        assert "3 days" in reason.lower() or "too new" in reason.lower()

    @pytest.mark.asyncio
    async def test_check_before_payment_blocks_high_risk(
        self, mock_db, sample_user_high_risk
    ):
        """check_before_payment blocks users with risk_score >= 80."""
        mock_db.get.return_value = sample_user_high_risk

        # Need to mock items and swipes to get past those checks first
        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = [MagicMock(spec=Item)]
        swipes_result = MagicMock()
        swipes_result.scalar_one_or_none.return_value = MagicMock(spec=Swipe)

        async def mock_execute(query):
            stmt_str = str(query).lower()
            result = MagicMock()
            if "item" in stmt_str and "owner_id" in stmt_str:
                return items_result
            elif "swipe" in stmt_str:
                return swipes_result
            return MagicMock()

        mock_db.execute = AsyncMock(side_effect=mock_execute)

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(
            sample_user_high_risk.id
        )

        assert allow is False
        assert "risk" in reason.lower()

    @pytest.mark.asyncio
    async def test_check_before_payment_blocks_no_items(
        self, mock_db, sample_user
    ):
        """check_before_payment blocks users with no items with video."""
        mock_db.get.return_value = sample_user

        # No items with video
        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = []

        async def mock_execute(query):
            stmt_str = str(query).lower()
            result = MagicMock()
            if "item" in stmt_str and "owner_id" in stmt_str:
                return items_result
            return MagicMock()

        mock_db.execute = AsyncMock(side_effect=mock_execute)

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(sample_user.id)

        assert allow is False
        assert "video" in reason.lower() or "item" in reason.lower()

    @pytest.mark.asyncio
    async def test_check_before_payment_blocks_no_swipes(
        self, mock_db, sample_user
    ):
        """check_before_payment blocks users with no swipe activity."""
        mock_db.get.return_value = sample_user

        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = [MagicMock(spec=Item)]
        swipes_result = MagicMock()
        swipes_result.scalar_one_or_none.return_value = None  # No swipes

        async def mock_execute(query):
            stmt_str = str(query).lower()
            result = MagicMock()
            if "item" in stmt_str and "owner_id" in stmt_str:
                return items_result
            elif "swipe" in stmt_str:
                return swipes_result
            return MagicMock()

        mock_db.execute = AsyncMock(side_effect=mock_execute)

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(sample_user.id)

        assert allow is False
        assert "swipe" in reason.lower()

    @pytest.mark.asyncio
    async def test_check_before_payment_user_not_found(self, mock_db):
        """check_before_payment returns False for non-existent user."""
        mock_db.get.return_value = None

        service = AntiFraudService(mock_db)
        allow, reason = await service.check_before_payment(user_id=999)

        assert allow is False
        assert "not found" in reason.lower()

    @pytest.mark.asyncio
    async def test_apply_limits_allows_free_user(
        self, mock_db, sample_user
    ):
        """apply_limits allows normal free user within limits."""
        mock_db.get.return_value = sample_user
        count_result = MagicMock()
        count_result.scalar.return_value = 0  # No swipes/matches today

        mock_db.execute.return_value = count_result

        service = AntiFraudService(mock_db)
        limits = await service.apply_limits(sample_user.id)

        assert limits["allowed"] is True
        assert limits["daily_swipe_limit"] == 100
        assert limits["daily_match_limit"] == 10

    @pytest.mark.asyncio
    async def test_apply_limits_allows_pro_user(
        self, mock_db, sample_user
    ):
        """apply_limits allows higher limits for pro users."""
        pro_user = User(
            id=5,
            telegram_id=999,
            username="prouser",
            first_name="Pro",
            is_pro=True,
            risk_score=0,
            is_shadow_banned=False,
            created_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
        )
        mock_db.get.return_value = pro_user
        count_result = MagicMock()
        count_result.scalar.return_value = 0

        mock_db.execute.return_value = count_result

        service = AntiFraudService(mock_db)
        limits = await service.apply_limits(pro_user.id)

        assert limits["allowed"] is True
        assert limits["daily_swipe_limit"] == 500
        assert limits["daily_match_limit"] == 999999

    @pytest.mark.asyncio
    async def test_apply_limits_blocks_when_exceeded(
        self, mock_db, sample_user
    ):
        """apply_limits blocks when daily limit exceeded."""
        mock_db.get.return_value = sample_user
        count_result = MagicMock()
        count_result.scalar.return_value = 150  # Exceeds free swipe limit

        mock_db.execute.return_value = count_result

        service = AntiFraudService(mock_db)
        limits = await service.apply_limits(sample_user.id)

        assert limits["allowed"] is False

    @pytest.mark.asyncio
    async def test_apply_limits_user_not_found(self, mock_db):
        """apply_limits returns blocked for non-existent user."""
        mock_db.get.return_value = None

        service = AntiFraudService(mock_db)
        limits = await service.apply_limits(user_id=999)

        assert limits["allowed"] is False
        assert "not found" in limits["reason"]
