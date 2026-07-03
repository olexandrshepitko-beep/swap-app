from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.core.config import settings
from app.models.user import User
from app.services import telegram_bot_service
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscription", tags=["subscription"])


class SubscriptionCreateResponse(BaseModel):
    subscription_id: int
    amount: float
    currency: str
    status: str
    invoice_link: str


class SubscriptionStatusResponse(BaseModel):
    active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_renew: bool = True


@router.post("/create", response_model=SubscriptionCreateResponse)
async def create_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    svc = SubscriptionService(db)

    existing = await svc.get_status(current_user.id)
    if existing and existing.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already PRO")

    sub = existing if (existing and not existing.active) else await svc.create_pending(current_user.id)

    amount_minor = (
        int(settings.PRO_PRICE)
        if settings.CURRENCY == "XTR"
        else int(round(settings.PRO_PRICE * 100))
    )

    invoice_link = await telegram_bot_service.create_invoice_link(
        title="Barter PRO — подписка на 30 дней",
        description="Безлимитные лайки и матчи",
        payload=f"sub:{sub.id}:{current_user.id}",
        amount_minor_units=amount_minor,
        label="PRO подписка",
    )

    return SubscriptionCreateResponse(
        subscription_id=sub.id,
        amount=settings.PRO_PRICE,
        currency=settings.CURRENCY,
        status="init",
        invoice_link=invoice_link,
    )


class SubscriptionTonInfoResponse(BaseModel):
    subscription_id: int
    address: str
    amount_nanoton: int
    amount_ton: float
    comment: str


class SubscriptionTonVerifyResponse(BaseModel):
    verified: bool
    message: str


@router.get("/ton/info", response_model=SubscriptionTonInfoResponse)
async def get_subscription_ton_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    svc = SubscriptionService(db)
    existing = await svc.get_status(current_user.id)
    if existing and existing.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already PRO")

    sub = existing if (existing and not existing.active) else await svc.create_pending(current_user.id)

    if not settings.TON_WALLET_ADDRESS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TON payments are not configured",
        )

    from app.services.ton_service import to_nanoton

    return SubscriptionTonInfoResponse(
        subscription_id=sub.id,
        address=settings.TON_WALLET_ADDRESS,
        amount_nanoton=to_nanoton(settings.TON_PRO_PRICE),
        amount_ton=settings.TON_PRO_PRICE,
        comment=f"sub:{sub.id}:{current_user.id}",
    )


@router.post("/ton/verify/{subscription_id}", response_model=SubscriptionTonVerifyResponse)
async def verify_subscription_ton_payment(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    from app.services.ton_service import find_matching_transaction, to_nanoton, TonVerificationError

    expected_comment = f"sub:{subscription_id}:{current_user.id}"
    min_amount = to_nanoton(settings.TON_PRO_PRICE)

    try:
        tx_hash = await find_matching_transaction(expected_comment, min_amount)
    except TonVerificationError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

    if not tx_hash:
        return SubscriptionTonVerifyResponse(
            verified=False,
            message="Транзакция пока не найдена в блокчейне — подождите и попробуйте снова",
        )

    svc = SubscriptionService(db)
    sub = await svc.settle(
        subscription_id=subscription_id, user_id=current_user.id, provider_payment_id=tx_hash
    )
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    return SubscriptionTonVerifyResponse(verified=True, message="Оплата подтверждена")


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    svc = SubscriptionService(db)
    sub = await svc.get_status(current_user.id)

    if not sub or not sub.active:
        return SubscriptionStatusResponse(active=False)

    if sub.end_date and sub.end_date < datetime.now(timezone.utc):
        sub.active = False
        await db.flush()
        return SubscriptionStatusResponse(active=False)

    return SubscriptionStatusResponse(
        active=sub.active,
        start_date=sub.start_date,
        end_date=sub.end_date,
        auto_renew=sub.auto_renew,
    )
