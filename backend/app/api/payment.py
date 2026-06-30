from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.models.user import User
from app.models.payment import Payment
from app.models.match import Match

router = APIRouter(prefix="/payment", tags=["payment"])


class PaymentInitRequest(BaseModel):
    match_id: int


class PaymentInitResponse(BaseModel):
    payment_id: int
    match_id: int
    amount: float
    currency: str
    status: str


class WebhookRequest(BaseModel):
    provider_payment_id: str
    status: str  # paid, refunded, failed


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
    """Initialize a payment for a match."""
    from app.services.payment_service import PaymentService
    from app.services.anti_fraud_service import AntiFraudService

    # Anti-fraud check
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PaymentInitResponse(
        payment_id=payment.id,
        match_id=payment.match_id,
        amount=float(payment.amount),
        currency=payment.currency,
        status=payment.status,
    )


@router.post("/webhook", response_model=dict)
async def payment_webhook(
    req: WebhookRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """Process a payment webhook callback."""
    from app.services.payment_service import PaymentService

    payment_service = PaymentService(db)
    payment = await payment_service.process_webhook(
        provider_payment_id=req.provider_payment_id,
        status=req.status,
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return {"status": "ok", "payment_status": payment.status}


@router.get("/status/{match_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get payment status for a match."""
    from app.services.payment_service import PaymentService

    payment_service = PaymentService(db)
    payment = await payment_service.get_payment_status(
        match_id=match_id,
        user_id=current_user.id,
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No payment found for this match and user",
        )

    return payment
