"""
Fuzz tests for the Swipe endpoint.
Uses Hypothesis to generate random user_ids, item_ids, and directions.
Verifies the swipe processing never raises an unexpected 500 error.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest
from hypothesis import given, strategies as st

from app.services.match_service import MatchService
from app.models.swipe import Swipe


# Strategy: generate random swipe inputs
swipe_directions = st.sampled_from(["like", "pass"])
user_ids = st.integers(min_value=1, max_value=10000)
item_ids = st.integers(min_value=1, max_value=10000)


class TestSwipeFuzz:
    """Fuzz tests for swipe processing — no 500s allowed."""

    @given(user_id=user_ids, item_id=item_ids, direction=swipe_directions)
    @pytest.mark.asyncio
    async def test_process_swipe_never_500(
        self, user_id, item_id, direction
    ):
        """
        Fuzz test: process_swipe should never crash or raise unexpected errors.
        It should return either None (no match) or an int (match_id).
        """
        mock_db = AsyncMock()

        async def mock_execute(query):
            result = MagicMock()
            # All queries return nothing by default
            result.scalar_one_or_none.return_value = None
            result.scalars.return_value.all.return_value = []
            return result

        mock_db.execute = AsyncMock(side_effect=mock_execute)
        mock_db.get.return_value = None
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()

        service = MatchService(mock_db)
        try:
            result = await service.process_swipe(
                user_id=user_id,
                item_id=item_id,
                direction=direction,
            )
            # Must be either None or a positive int
            assert result is None or isinstance(result, int)
        except Exception as e:
            # Only ValueError or known expected exceptions are acceptable
            # But 500-style crashes should never happen
            if not isinstance(e, (ValueError, KeyError)):
                # For fuzz tests, this should not happen
                pytest.fail(f"Unexpected exception: {type(e).__name__}: {e}")

    @given(user_id=user_ids, direction=swipe_directions)
    @pytest.mark.asyncio
    async def test_process_swipe_with_nonexistent_item(
        self, user_id, direction
    ):
        """Fuzz: swiping on non-existent item should not crash."""
        mock_db = AsyncMock()
        mock_db.execute.return_value = MagicMock()
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.get.return_value = None
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()

        service = MatchService(mock_db)
        try:
            result = await service.process_swipe(
                user_id=user_id,
                item_id=999999,  # non-existent
                direction=direction,
            )
            assert result is None
        except Exception as e:
            if not isinstance(e, ValueError):
                pytest.fail(f"Unexpected exception: {type(e).__name__}: {e}")

    @given(
        user_id=user_ids,
        item_id=item_ids,
    )
    @pytest.mark.asyncio
    async def test_process_swipe_duplicate_does_not_raise(
        self, user_id, item_id
    ):
        """Fuzz: duplicate swipe (idempotent) should not raise."""
        mock_db = AsyncMock()

        # Simulate existing swipe returned on first call
        existing_swipe = Swipe(user_id=user_id, item_id=item_id, direction="like")

        async def mock_execute(query):
            result = MagicMock()
            stmt_str = str(query).lower()
            if "swipe.user_id" in stmt_str and "swipe.item_id" in stmt_str and "swipe.direction" not in stmt_str:
                result.scalar_one_or_none.return_value = existing_swipe
            else:
                result.scalar_one_or_none.return_value = None
            return result

        mock_db.execute = AsyncMock(side_effect=mock_execute)
        mock_db.get.return_value = None
        mock_db.add = MagicMock()
        mock_db.flush = AsyncMock()

        service = MatchService(mock_db)
        try:
            result = await service.process_swipe(
                user_id=user_id,
                item_id=item_id,
                direction="like",
            )
            assert result is None or isinstance(result, int)
        except Exception as e:
            pytest.fail(f"Duplicate swipe raised: {type(e).__name__}: {e}")
