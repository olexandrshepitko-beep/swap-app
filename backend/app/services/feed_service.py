from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.item import Item
from app.models.swipe import Swipe


class FeedService:
    """Service for building the item feed with pagination and exclusions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_feed(
        self,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
    ) -> list[Item]:
        """
        Return items for the feed:
        - Not owned by the user
        - Status is 'active' (not matched, not hidden)
        - Exclude items the user has already swiped on
        - Paginated
        """
        # Subquery: items the user already swiped on
        swiped_item_ids_subq = (
            select(Swipe.item_id)
            .where(Swipe.user_id == user_id)
            .subquery()
        )

        offset = (page - 1) * page_size

        query = (
            select(Item)
            .where(Item.owner_id != user_id)
            .where(Item.status == "active")
            .where(Item.id.notin_(select(swiped_item_ids_subq)))
            .options(selectinload(Item.owner))
            .order_by(Item.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())
