from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.subscription import Subscription
from app.models.user import User


class SubscriptionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_pending(self, user_id: int) -> Subscription:
        """Создаёт неактивную запись-заявку на подписку, ждущую оплаты."""
        sub = Subscription(
            user_id=user_id,
            active=False,
            start_date=None,
            end_date=None,
            auto_renew=True,
        )
        self.db.add(sub)
        await self.db.flush()
        await self.db.refresh(sub)
        return sub

    async def can_accept_payment(self, subscription_id: int, user_id: int) -> bool:
        sub = await self.db.get(Subscription, subscription_id)
        return sub is not None and sub.user_id == user_id and not sub.active

    async def settle(
        self, subscription_id: int, user_id: int, provider_payment_id: str
    ) -> Optional[Subscription]:
        sub = await self.db.get(Subscription, subscription_id)
        if not sub or sub.user_id != user_id:
            return None

        if sub.active:
            # Идемпотентность на повторную доставку webhook
            return sub

        now = datetime.now(timezone.utc)
        base = sub.end_date if (sub.end_date and sub.end_date > now) else now
        sub.active = True
        sub.start_date = sub.start_date or now
        sub.end_date = base + timedelta(days=30)
        await self.db.flush()

        user = await self.db.get(User, user_id)
        if user:
            user.is_pro = True
            await self.db.flush()

        return sub

    async def get_status(self, user_id: int) -> Optional[Subscription]:
        query = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.id.desc())
            .limit(1)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
