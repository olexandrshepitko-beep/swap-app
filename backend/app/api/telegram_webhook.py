import hmac
import logging

from fastapi import APIRouter, Header, HTTPException, Request, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.config import settings
from app.services import telegram_bot_service
from app.services.payment_service import PaymentService
from app.services.subscription_service import SubscriptionService

logger = logging.getLogger("telegram_webhook")

router = APIRouter(prefix="/telegram", tags=["telegram-webhook"])


def _verify_secret(secret_token: str | None) -> None:
    """
    Единственная граница доверия во всём платёжном флоу.
    Telegram кладёт сюда ровно то значение, что вы передали в setWebhook(secret_token=...).
    Никто другой этого значения не знает и не может его подобрать за разумное время
    (constant-time сравнение — чтобы не подсказывать через timing attack).
    """
    if not secret_token or not hmac.compare_digest(secret_token, settings.TELEGRAM_WEBHOOK_SECRET):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad secret token")


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    _verify_secret(x_telegram_bot_api_secret_token)

    update = await request.json()

    # --- 1. pre_checkout_query: подтвердить ДО списания денег, за <10 сек ---
    pcq = update.get("pre_checkout_query")
    if pcq:
        payload = pcq.get("invoice_payload", "")
        payer_telegram_id = pcq["from"]["id"]

        ok, reason = await _validate_payload_before_charge(db, payload, payer_telegram_id)
        await telegram_bot_service.answer_pre_checkout_query(
            pre_checkout_query_id=pcq["id"],
            ok=ok,
            error_message=None if ok else reason,
        )
        return {"status": "pre_checkout_handled"}

    # --- 2. successful_payment: деньги реально списаны, фиксируем в БД ---
    message = update.get("message")
    if message and "successful_payment" in message:
        sp = message["successful_payment"]
        payload = sp["invoice_payload"]
        charge_id = sp["telegram_payment_charge_id"]  # уникальный ID — используем для идемпотентности
        payer_telegram_id = message["from"]["id"]

        await _settle_payment(db, payload, charge_id, payer_telegram_id)
        return {"status": "payment_settled"}

    # Прочие типы апдейтов (текстовые сообщения боту и т.п.) сюда не относятся —
    # если бот их тоже обрабатывает, это отдельный роут/хендлер.
    return {"status": "ignored"}


async def _validate_payload_before_charge(
    db: AsyncSession, payload: str, payer_telegram_id: int
) -> tuple[bool, str]:
    kind, *rest = payload.split(":")

    if kind == "match":
        match_id, user_id = int(rest[0]), int(rest[1])
        pay_svc = PaymentService(db)
        valid = await pay_svc.can_accept_payment(match_id=match_id, user_id=user_id)
        if not valid:
            return False, "Матч не найден или оплата уже выполнена"
        return True, ""

    if kind == "sub":
        subscription_id, user_id = int(rest[0]), int(rest[1])
        sub_svc = SubscriptionService(db)
        valid = await sub_svc.can_accept_payment(subscription_id=subscription_id, user_id=user_id)
        if not valid:
            return False, "Подписка не найдена или уже активна"
        return True, ""

    logger.warning("Unknown invoice payload kind: %s", payload)
    return False, "Неизвестный тип платежа"


async def _settle_payment(
    db: AsyncSession, payload: str, charge_id: str, payer_telegram_id: int
) -> None:
    kind, *rest = payload.split(":")

    if kind == "match":
        match_id, user_id = int(rest[0]), int(rest[1])
        pay_svc = PaymentService(db)
        await pay_svc.settle(match_id=match_id, user_id=user_id, provider_payment_id=charge_id)
        return

    if kind == "sub":
        subscription_id, user_id = int(rest[0]), int(rest[1])
        sub_svc = SubscriptionService(db)
        await sub_svc.settle(
            subscription_id=subscription_id, user_id=user_id, provider_payment_id=charge_id
        )
        return

    # Деньги пришли, но payload не распознан — НЕ теряем это молча.
    # В проде: положить в отдельную таблицу "unmatched_payments" и алертить,
    # а не просто логировать — это реальные деньги пользователя.
    logger.error("UNMATCHED successful_payment: charge_id=%s payload=%s", charge_id, payload)
