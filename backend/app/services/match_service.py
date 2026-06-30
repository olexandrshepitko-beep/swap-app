from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item
from app.models.swipe import Swipe
from app.models.match import Match
from app.models.chat import Chat


class MatchService:
    """Service for processing swipes and creating matches."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_swipe(
        self,
        user_id: int,
        item_id: int,
        direction: str,  # "like" or "pass"
    ) -> Optional[int]:
        """
        Process a swipe action.
        - If 'pass': just record the swipe, return None.
        - If 'like': check if the other user already liked this user's item.
          If yes -> create Match + Chat, mark both items as 'matched', return match_id.
          If no -> record the swipe, return None.
        Idempotent: if swipe already exists, returns based on existing data.
        """
        # Check idempotency — swipe already exists
        existing_swipe = await self._get_existing_swipe(user_id, item_id)
        if existing_swipe:
            # Already processed; check if it resulted in a match
            return await self._find_existing_match_for_swipe(user_id, item_id)

        # Save the swipe
        swipe = Swipe(user_id=user_id, item_id=item_id, direction=direction)
        self.db.add(swipe)
        await self.db.flush()

        if direction != "like":
            return None

        # 'like' — check for a reciprocal like
        match_id = await self._try_create_match(user_id, item_id)
        return match_id

    async def _get_existing_swipe(self, user_id: int, item_id: int) -> Optional[Swipe]:
        query = select(Swipe).where(
            and_(Swipe.user_id == user_id, Swipe.item_id == item_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _find_existing_match_for_swipe(
        self, user_id: int, item_id: int
    ) -> Optional[int]:
        """Find a match that resulted from this swipe pair."""
        item = await self.db.get(Item, item_id)
        if not item:
            return None

        # This user liked item_id. Check if a match exists with user's item and this item
        query = select(Match.id).where(
            or_(
                and_(
                    Match.user_a_id == user_id,
                    Match.item_b_id == item_id,
                ),
                and_(
                    Match.user_b_id == user_id,
                    Match.item_a_id == item_id,
                ),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _try_create_match(self, user_id: int, liked_item_id: int) -> Optional[int]:
        """
        Check if the owner of liked_item_id already liked one of user_id's items.
        If so, create a bidirectional match.
        """
        liked_item = await self.db.get(Item, liked_item_id)
        if not liked_item:
            return None

        other_user_id = liked_item.owner_id

        # Find a 'like' from other_user_id on any of user_id's items
        user_items_subq = (
            select(Item.id)
            .where(Item.owner_id == user_id)
            .subquery()
        )

        reciprocal_query = select(Swipe).where(
            and_(
                Swipe.user_id == other_user_id,
                Swipe.item_id.in_(select(user_items_subq)),
                Swipe.direction == "like",
            )
        )
        result = await self.db.execute(reciprocal_query)
        reciprocal_swipe = result.scalar_one_or_none()

        if not reciprocal_swipe:
            return None

        # Found reciprocal swipe — create match
        user_item_id = reciprocal_swipe.item_id

        match = Match(
            item_a_id=user_item_id,
            item_b_id=liked_item_id,
            user_a_id=user_id,
            user_b_id=other_user_id,
            status="pending",
        )
        self.db.add(match)
        await self.db.flush()

        # Create locked chat for this match
        chat = Chat(match_id=match.id, status="locked")
        self.db.add(chat)

        # Mark both items as matched
        user_item = await self.db.get(Item, user_item_id)
        if user_item:
            user_item.status = "matched"

        liked_item.status = "matched"

        await self.db.flush()
        return match.id
