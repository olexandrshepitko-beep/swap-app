from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.match import Match
from app.models.payment import Payment
from app.models.chat import Chat


class PaymentService:
    """Service for handling match payments and chat unlock logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def init_payment(self, match_id: int, user_id: int) -> Payment:
        """
        Создаёт (или возвращает существующую) запись Payment в статусе 'init'.
        Реальная invoice-ссылка создаётся отдельно в api-слое через
        telegram_bot_service.create_invoice_link — этот метод только резервирует строку в БД.
        """
        match = await self.db.get(Match, match_id)
        if not match:
            raise ValueError("Match not found")

        if match.user_a_id != user_id and match.user_b_id != user_id:
            raise ValueError("User is not part of this match")

        existing = await self._get_payment(match_id, user_id)
        if existing:
            return existing

        payment = Payment(
            match_id=match_id,
            user_id=user_id,
            amount=settings.MATCH_PRICE,
            currency=settings.CURRENCY,
            provider="telegram",
            status="init",
        )
        self.db.add(payment)
        await self.db.flush()
        return payment

    async def can_accept_payment(self, match_id: int, user_id: int) -> bool:
        """
        Вызывается из pre_checkout_query — ДО списания денег.
        Проверяем, что платёж реально ожидается и ещё не оплачен
        (защита от повторного списания при повторной оплате уже закрытого счёта).
        """
        payment = await self._get_payment(match_id, user_id)
        return payment is not None and payment.status == "init"

    async def settle(
        self, match_id: int, user_id: int, provider_payment_id: str
    ) -> Optional[Payment]:
        """
        Вызывается из successful_payment — деньги уже реально списаны Telegram'ом.
        Идемпотентно: повторная доставка того же webhook не задвоит эффект.
        """
        payment = await self._get_payment(match_id, user_id)
        if not payment:
            return None

        if payment.status == "paid":
            # Уже обработан (Telegram может ретраить доставку) — просто подтверждаем ещё раз
            return payment

        payment.status = "paid"
        payment.provider_payment_id = provider_payment_id
        await self.db.flush()

        await self._check_both_paid_and_unlock(match_id)
        return payment

    async def _get_payment(self, match_id: int, user_id: int) -> Optional[Payment]:
        query = select(Payment).where(
            and_(Payment.match_id == match_id, Payment.user_id == user_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _check_both_paid_and_unlock(self, match_id: int) -> bool:
        match = await self.db.get(Match, match_id)
        if not match:
            return False

        payments_query = select(Payment).where(Payment.match_id == match_id)
        result = await self.db.execute(payments_query)
        payments = list(result.scalars().all())

        paid_user_ids = {p.user_id for p in payments if p.status == "paid"}
        required = {match.user_a_id, match.user_b_id}

        if paid_user_ids == required:
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
        return await self._get_payment(match_id, user_id)
