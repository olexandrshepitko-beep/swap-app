from typing import Optional
import logging

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.match import Match
from app.models.payment import Payment
from app.models.chat import Chat

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for handling match payments and chat unlock logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def init_payment(self, match_id: int, user_id: int) -> Payment:
        """
        Initialize a payment for a match.
        Returns the Payment record (status='init').
        """
        match = await self.db.get(Match, match_id)
        if not match:
            raise ValueError("Match not found")

        if match.user_a_id != user_id and match.user_b_id != user_id:
            raise ValueError("User is not part of this match")

        # Check if payment already exists for this user+match
        existing = await self._get_payment(match_id, user_id)
        if existing:
            return existing

        payment = Payment(
            match_id=match_id,
            user_id=user_id,
            amount=settings.MATCH_PRICE,
            currency="USD",
            provider="telegram",
            status="init",
        )
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def process_webhook(
        self,
        provider_payment_id: str,
        status: str,
    ) -> Optional[Payment]:
        """
        Process a payment webhook (e.g., from Telegram Payments).
        Status transition: init -> paid -> (check both) -> unlock chat.
        """
        query = select(Payment).where(
            Payment.provider_payment_id == provider_payment_id
        )
        result = await self.db.execute(query)
        payment = result.scalar_one_or_none()

        if not payment:
            return None

        # Validate status transition
        if payment.status == "init" and status == "paid":
            payment.status = "paid"
        elif payment.status == "paid" and status == "refunded":
            payment.status = "refunded"
        elif status == "failed":
            payment.status = "failed"
        else:
            # Invalid transition, log duplicate
            logger.warning(
                f"Duplicate or invalid webhook: payment_id={payment.id}, "
                f"current_status={payment.status}, incoming_status={status}"
            )
            return payment

        await self.db.flush()

        # Check if both users have paid -> unlock chat
        if status == "paid":
            await self._check_both_paid_and_unlock(payment.match_id)

        return payment

    async def check_both_paid(self, match_id: int) -> bool:
        """
        Check if both users in a match have paid.
        """
        return await self._check_both_paid_and_unlock(match_id)

    async def _get_payment(
        self, match_id: int, user_id: int
    ) -> Optional[Payment]:
        query = select(Payment).where(
            and_(
                Payment.match_id == match_id,
                Payment.user_id == user_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _check_both_paid_and_unlock(self, match_id: int) -> bool:
        """Check if both payments are paid; if so, unlock chat."""
        match = await self.db.get(Match, match_id)
        if not match:
            return False

        payments_query = select(Payment).where(Payment.match_id == match_id)
        result = await self.db.execute(payments_query)
        payments = list(result.scalars().all())

        paid_user_ids = {p.user_id for p in payments if p.status == "paid"}
        required = {match.user_a_id, match.user_b_id}

        if paid_user_ids == required:
            # Both paid — unlock chat
            chat_query = select(Chat).where(Chat.match_id == match_id)
            chat_result = await self.db.execute(chat_query)
            chat = chat_result.scalar_one_or_none()

            if chat and chat.status == "locked":
                from datetime import datetime, timezone

                chat.status = "unlocked"
                chat.unlocked_at = datetime.now(timezone.utc)
                match.status = "active"
                await self.db.flush()
            return True

        return False

    async def get_payment_status(self, match_id: int, user_id: int) -> Optional[Payment]:
        """Get payment status for a specific user + match."""
        return await self._get_payment(match_id, user_id)
