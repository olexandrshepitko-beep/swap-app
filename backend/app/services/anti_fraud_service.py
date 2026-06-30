from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.item import Item
from app.models.swipe import Swipe


class AntiFraudService:
    """Service for fraud detection, risk scoring, and user limits."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_before_payment(self, user_id: int) -> tuple[bool, str]:
        """
        Check if a user is allowed to proceed with payment.
        Returns (allow, reason).
        """
        user = await self.db.get(User, user_id)
        if not user:
            return False, "User not found"

        # Shadow-ban check
        if user.is_shadow_banned:
            return False, "User is shadow banned"

        # Account age check (>3 days)
        account_age = datetime.now(timezone.utc) - user.created_at.replace(tzinfo=timezone.utc)
        if account_age < timedelta(days=3):
            return False, "Account too new (less than 3 days old)"

        # Check if user has at least one item with video
        items_query = select(Item).where(
            and_(Item.owner_id == user_id, Item.video_file_id.isnot(None))
        )
        items_result = await self.db.execute(items_query)
        items = list(items_result.scalars().all())
        if not items:
            return False, "No items with video found"

        # Check if user has made any swipes
        swipes_query = select(Swipe).where(Swipe.user_id == user_id).limit(1)
        swipes_result = await self.db.execute(swipes_query)
        if not swipes_result.scalar_one_or_none():
            return False, "No swipe activity detected"

        # Risk score threshold
        if user.risk_score >= 80:
            return False, f"Risk score too high ({user.risk_score})"

        return True, "OK"

    async def compute_risk_score(self, user_id: int) -> int:
        """
        Recompute risk score for a user based on:
        - Cancelled/expired matches
        - Unopened chats
        - Reports/complaints (via tags in ratings)
        Returns 0-100 score.
        """
        score = 0

        # Factor 1: Cancelled/expired matches
        from app.models.match import Match

        expired_count_query = select(func.count(Match.id)).where(
            and_(
                Match.status == "expired",
                (Match.user_a_id == user_id) | (Match.user_b_id == user_id),
            )
        )
        result = await self.db.execute(expired_count_query)
        expired_count = result.scalar() or 0
        score += min(expired_count * 10, 30)  # max 30 points

        # Factor 2: Unopened chats
        from app.models.chat import Chat

        unopened_query = (
            select(func.count(Chat.id))
            .join(Match, Chat.match_id == Match.id)
            .where(
                and_(
                    Chat.status.in_(["locked", "expired"]),
                    (Match.user_a_id == user_id) | (Match.user_b_id == user_id),
                )
            )
        )
        result = await self.db.execute(unopened_query)
        unopened_count = result.scalar() or 0
        score += min(unopened_count * 15, 30)  # max 30 points

        # Factor 3: Low ratings received
        from app.models.rating import Rating

        low_rating_query = (
            select(func.count(Rating.id))
            .join(Match, Rating.match_id == Match.id)
            .where(
                and_(
                    Rating.rating <= 2,
                    (Match.user_a_id == user_id) | (Match.user_b_id == user_id),
                    Rating.rater_user_id != user_id,
                )
            )
        )
        result = await self.db.execute(low_rating_query)
        low_rating_count = result.scalar() or 0
        score += min(low_rating_count * 20, 40)  # max 40 points

        score = min(score, 100)
        return score

    async def apply_limits(self, user_id: int) -> dict:
        """
        Check daily limits for a user.
        Returns dict with limit info.
        """
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        # Daily swipe limit (100 per day for free, 500 for pro)
        user = await self.db.get(User, user_id)
        if not user:
            return {"allowed": False, "reason": "User not found"}

        daily_swipe_limit = 500 if user.is_pro else 100

        swipe_count_query = select(func.count(Swipe.id)).where(
            and_(
                Swipe.user_id == user_id,
                Swipe.created_at >= today_start,
            )
        )
        result = await self.db.execute(swipe_count_query)
        swipe_count = result.scalar() or 0

        # Daily match limit (10 for free, unlimited for pro)
        from app.models.match import Match

        daily_match_limit = 10 if not user.is_pro else 999999

        match_count_query = select(func.count(Match.id)).where(
            and_(
                (Match.user_a_id == user_id) | (Match.user_b_id == user_id),
                Match.created_at >= today_start,
            )
        )
        result = await self.db.execute(match_count_query)
        match_count = result.scalar() or 0

        return {
            "allowed": swipe_count < daily_swipe_limit and match_count < daily_match_limit,
            "daily_swipes_used": swipe_count,
            "daily_swipe_limit": daily_swipe_limit,
            "daily_matches_used": match_count,
            "daily_match_limit": daily_match_limit,
        }
