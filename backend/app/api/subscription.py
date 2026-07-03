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
