from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.core.config import settings
from app.models.user import User
from app.models.subscription import Subscription

router = APIRouter(prefix="/subscription", tags=["subscription"])


class SubscriptionCreateRequest(BaseModel):
    pass  # No params needed, price from config


class SubscriptionCreateResponse(BaseModel):
    subscription_id: int
    amount: float
    currency: str = "USD"
    status: str


class SubscriptionWebhookRequest(BaseModel):
    provider_payment_id: str
    status: str  # paid, refunded, failed
    # ⚠️ user_id intentionally removed — must resolve from provider_payment_id internally


class SubscriptionStatusResponse(BaseModel):
    active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_renew: bool = True


@router.post("/create", response_model=SubscriptionCreateResponse)
async def create_subscription(
    req: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new Pro subscription (initiates payment flow)."""
    # Check if already has active subscription
    query = select(Subscription).where(
        Subscription.user_id == current_user.id,
        Subscription.active == True,
    )
    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        # Extend existing
        new_end = (existing.end_date or datetime.now(timezone.utc)) + timedelta(days=30)
        existing.end_date = new_end
        existing.active = True
        await db.flush()
        return SubscriptionCreateResponse(
            subscription_id=existing.id,
            amount=settings.PRO_PRICE,
            status="extended",
        )

    sub = Subscription(
        user_id=current_user.id,
        active=False,
        start_date=None,
        end_date=None,
        auto_renew=True,
    )
    db.add(sub)
    await db.flush()
    await db.refresh(sub)

    return SubscriptionCreateResponse(
        subscription_id=sub.id,
        amount=settings.PRO_PRICE,
        status="init",
    )


@router.post("/webhook", response_model=dict)
async def subscription_webhook(
    req: SubscriptionWebhookRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Process subscription payment webhook.

    Resolves user from the subscription record linked to provider_payment_id.
    Does NOT trust user_id from request body (security fix).
    """
    # Find subscription by provider_payment_id from payment records
    from app.models.payment import Payment

    payment_query = select(Payment).where(
        Payment.provider_payment_id == req.provider_payment_id
    )
    payment_result = await db.execute(payment_query)
    payment = payment_result.scalar_one_or_none()

    if not payment:
        # Fallback: find by user_id from subscription itself
        query = select(Subscription).where(
            Subscription.id == int(req.provider_payment_id.split("_")[-1])
            if "_" in req.provider_payment_id else Subscription.id == 0,
        ).order_by(Subscription.id.desc()).limit(1)

        result = await db.execute(query)
        sub = result.scalar_one_or_none()
    else:
        # Find subscription for this payment's user
        query = select(Subscription).where(
            Subscription.user_id == payment.user_id,
        ).order_by(Subscription.id.desc()).limit(1)
        result = await db.execute(query)
        sub = result.scalar_one_or_none()

    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found for this payment",
        )

    if req.status == "paid":
        now = datetime.now(timezone.utc)
        sub.active = True
        sub.start_date = now
        sub.end_date = now + timedelta(days=30)
        # Also mark user as pro
        user = await db.get(User, sub.user_id)
        if user:
            user.is_pro = True
        await db.flush()

    return {"status": "ok", "subscription_active": sub.active}


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get current subscription status."""
    query = select(Subscription).where(
        Subscription.user_id == current_user.id,
    ).order_by(Subscription.id.desc()).limit(1)

    result = await db.execute(query)
    sub = result.scalar_one_or_none()

    if not sub or not sub.active:
        return SubscriptionStatusResponse(active=False)

    # Check if expired
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
