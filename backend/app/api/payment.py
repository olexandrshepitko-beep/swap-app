from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.core.config import settings
from app.models.user import User
from app.services import telegram_bot_service

router = APIRouter(prefix="/payment", tags=["payment"])


class PaymentInitRequest(BaseModel):
    match_id: int


class PaymentInitResponse(BaseModel):
    payment_id: int
    match_id: int
    amount: float
    currency: str
    status: str
    invoice_link: str  # открывается фронтом через Telegram.WebApp.openInvoice(link)


class PaymentStatusResponse(BaseModel):
    match_id: int
    user_id: int
    amount: float
    status: str
    provider_payment_id: Optional[str] = None

    model_config = {"from_attributes": True}


@router.post("/init", response_model=PaymentInitResponse)
async def init_payment(
    req: PaymentInitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Инициализировать оплату матча и выдать invoice-ссылку."""
    from app.services.payment_service import PaymentService
    from app.services.anti_fraud_service import AntiFraudService

    fraud_service = AntiFraudService(db)
    allow, reason = await fraud_service.check_before_payment(current_user.id)
    if not allow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Payment blocked: {reason}",
        )

    payment_service = PaymentService(db)
    try:
        payment = await payment_service.init_payment(
            match_id=req.match_id,
            user_id=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if payment.status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already paid")

    # amount в минимальных единицах: для XTR — целое число звёзд как есть,
    # для фиатных валют (USD/RUB) — умножить на 100 (центы/копейки)
    amount_minor = (
        int(payment.amount) if settings.CURRENCY == "XTR" else int(round(float(payment.amount) * 100))
    )

    invoice_link = await telegram_bot_service.create_invoice_link(
        title="Открыть чат с владельцем вещи",
        description="Разовая оплата за разблокировку чата по матчу",
        payload=f"match:{req.match_id}:{current_user.id}",
        amount_minor_units=amount_minor,
        label="Разблокировка чата",
    )

    return PaymentInitResponse(
        payment_id=payment.id,
        match_id=payment.match_id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
        invoice_link=invoice_link,
    )


class TonPaymentInfoResponse(BaseModel):
    address: str
    amount_nanoton: int
    amount_ton: float
    comment: str


class TonVerifyResponse(BaseModel):
    verified: bool
    message: str


@router.get("/ton/info/{match_id}", response_model=TonPaymentInfoResponse)
async def get_ton_payment_info(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Данные для отправки TON-транзакции с фронта через TonConnect."""
    from app.services.payment_service import PaymentService

    payment_service = PaymentService(db)
    try:
        payment = await payment_service.init_payment(match_id=match_id, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if payment.status == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already paid")

    if not settings.TON_WALLET_ADDRESS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TON payments are not configured",
        )

    from app.services.ton_service import to_nanoton

    return TonPaymentInfoResponse(
        address=settings.TON_WALLET_ADDRESS,
        amount_nanoton=to_nanoton(settings.TON_MATCH_PRICE),
        amount_ton=settings.TON_MATCH_PRICE,
        comment=f"match:{match_id}:{current_user.id}",
    )


@router.post("/ton/verify/{match_id}", response_model=TonVerifyResponse)
async def verify_ton_payment(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Вызывается фронтом после отправки TON-транзакции. Сверяет с блокчейном
    и, если найдена подходящая транзакция, сразу помечает оплату как paid
    (той же идемпотентной логикой, что и Telegram webhook — settle()).
    """
    from app.services.payment_service import PaymentService
    from app.services.ton_service import find_matching_transaction, to_nanoton, TonVerificationError

    expected_comment = f"match:{match_id}:{current_user.id}"
    min_amount = to_nanoton(settings.TON_MATCH_PRICE)

    try:
        tx_hash = await find_matching_transaction(expected_comment, min_amount)
    except TonVerificationError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    if not tx_hash:
        return TonVerifyResponse(
            verified=False,
            message="Транзакция пока не найдена в блокчейне — подождите и попробуйте снова",
        )

    payment_service = PaymentService(db)
    payment = await payment_service.settle(
        match_id=match_id, user_id=current_user.id, provider_payment_id=tx_hash
    )
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    return TonVerifyResponse(verified=True, message="Оплата подтверждена")


@router.get("/status/{match_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    from app.services.payment_service import PaymentService

    payment_service = PaymentService(db)
    payment = await payment_service.get_payment_status(
        match_id=match_id, user_id=current_user.id
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payment found for this match and user",
        )
    return payment


# ВНИМАНИЕ: POST /payment/webhook и POST /subscription/webhook — УДАЛЕНЫ.
# Подтверждение оплаты теперь приходит ТОЛЬКО через защищённый
# /telegram/webhook (см. api/telegram_webhook.py), т.к. это единственный
# канал, для которого Telegram реально ставит проверяемую подпись
# (X-Telegram-Bot-Api-Secret-Token). Публичный webhook с телом,
# которое присылает сам клиент, невозможно защитить в принципе —
# это доверие к данным от того, кто пытается подтвердить свой же платёж.
