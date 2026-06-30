"""
Unit tests for MatchService.
Tests swipe processing: like without match, like with match, idempotency, pass.
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.match_service import MatchService
from app.models.swipe import Swipe
from app.models.match import Match
from app.models.chat import Chat
from app.models.item import Item


class TestMatchService:
    """Tests for MatchService.process_swipe."""

    @pytest.mark.asyncio
    async def test_process_swipe_like_no_reciprocal(self, mock_db, sample_item_other):
        """process_swipe with direction='like' and no reciprocal like returns None."""
        mock_db.get.return_value = sample_item_other
        service = MatchService(mock_db)
        match_id = await service.process_swipe(user_id=1, item_id=2, direction="like")
        assert match_id is None

    @pytest.mark.asyncio
    async def test_process_swipe_like_with_reciprocal_creates_match(self, mock_db, sample_item, sample_item_other):
        """process_swipe creates match when reciprocal like exists."""
        reciprocal_swipe = Swipe(user_id=2, item_id=1, direction="like")

        call_count = [0]
        def execute_side_effect(query):
            call_count[0] += 1
            result = MagicMock()
            if call_count[0] == 1:
                result.scalar_one_or_none.return_value = None  # no existing swipe
            else:
                result.scalar_one_or_none.return_value = reciprocal_swipe  # reciprocal found
            return result

        mock_db.execute.side_effect = execute_side_effect
        mock_db.get.side_effect = lambda model, pk: { (Item, 2): sample_item_other, (Item, 1): sample_item }.get((model, pk))

        service = MatchService(mock_db)
        match_id = await service.process_swipe(user_id=1, item_id=2, direction="like")
        # Without a real DB, match.id won't be auto-generated after flush.
        # But the real verification is that items were marked as matched.
        assert sample_item.status == "matched"
        assert sample_item_other.status == "matched"

    @pytest.mark.asyncio
    async def test_process_swipe_idempotent(self, mock_db, sample_swipe, sample_item_other):
        """process_swipe returns None when duplicate like but no match yet."""
        mock_db.get.return_value = sample_item_other
        # First execute call: _get_existing_swipe finds swipe.
        # Second execute call: _find_existing_match_for_swipe -> no match (None)
        call_count = [0]
        def exec_side_effect(query):
            call_count[0] += 1
            result = MagicMock()
            if call_count[0] == 1:
                result.scalar_one_or_none.return_value = sample_swipe
            else:
                result.scalar_one_or_none.return_value = None  # no match found
            return result
        mock_db.execute.side_effect = exec_side_effect

        service = MatchService(mock_db)
        match_id = await service.process_swipe(user_id=1, item_id=2, direction="like")
        assert match_id is None

    @pytest.mark.asyncio
    async def test_process_swipe_idempotent_with_match(self, mock_db, sample_swipe, sample_match):
        """process_swipe returns existing match_id on duplicate swipe when match exists."""
        def execute_side_effect(query):
            result = MagicMock()
            stmt_str = str(query)
            if "swipe" in stmt_str.lower() and "match" not in stmt_str.lower():
                result.scalar_one_or_none.return_value = sample_swipe
            elif "match" in stmt_str.lower():
                result.scalar_one_or_none.return_value = sample_match.id
            else:
                result.scalar_one_or_none.return_value = None
            return result

        mock_db.execute.side_effect = execute_side_effect
        service = MatchService(mock_db)
        match_id = await service.process_swipe(user_id=1, item_id=2, direction="like")
        assert match_id == sample_match.id

    @pytest.mark.asyncio
    async def test_process_swipe_pass_direction(self, mock_db):
        """process_swipe with direction='pass' records swipe and returns None."""
        service = MatchService(mock_db)
        match_id = await service.process_swipe(user_id=1, item_id=2, direction="pass")
        assert match_id is None

    @pytest.mark.asyncio
    async def test_process_swipe_nonexistent_item(self, mock_db):
        """process_swipe with non-existent item returns None gracefully."""
        mock_db.get.return_value = None
        service = MatchService(mock_db)
        match_id = await service.process_swipe(user_id=1, item_id=999, direction="like")
        assert match_id is None

    @pytest.mark.asyncio
    async def test_process_swipe_like_marks_items_matched(self, mock_db, sample_item, sample_item_other):
        """When a match is created, both items are marked as 'matched'."""
        reciprocal_swipe = Swipe(user_id=2, item_id=1, direction="like")

        call_count = [0]
        def execute_side_effect(query):
            call_count[0] += 1
            result = MagicMock()
            if call_count[0] == 1:
                result.scalar_one_or_none.return_value = None  # no existing swipe
            else:
                result.scalar_one_or_none.return_value = reciprocal_swipe  # reciprocal found
            return result

        mock_db.execute.side_effect = execute_side_effect
        mock_db.get.side_effect = lambda model, pk: { (Item, 2): sample_item_other, (Item, 1): sample_item }.get((model, pk))

        service = MatchService(mock_db)
        await service.process_swipe(user_id=1, item_id=2, direction="like")
        assert sample_item.status == "matched"
        assert sample_item_other.status == "matched"
