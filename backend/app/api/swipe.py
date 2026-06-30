from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session
from app.models.user import User

router = APIRouter(prefix="/swipe", tags=["swipe"])


class SwipeRequest(BaseModel):
    item_id: int
    direction: str  # "like" or "pass"


class SwipeResponse(BaseModel):
    match_id: Optional[int] = None
    message: str = "Swipe recorded"


@router.post("", response_model=SwipeResponse)
async def process_swipe(
    req: SwipeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Process a swipe (like or pass) on an item."""
    if req.direction not in ("like", "pass"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Direction must be 'like' or 'pass'",
        )

    from app.services.match_service import MatchService
    from app.services.anti_fraud_service import AntiFraudService

    # Check daily limits
    fraud_service = AntiFraudService(db)
    limits = await fraud_service.apply_limits(current_user.id)
    if not limits["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily limit reached",
        )

    match_service = MatchService(db)
    match_id = await match_service.process_swipe(
        user_id=current_user.id,
        item_id=req.item_id,
        direction=req.direction,
    )

    if match_id:
        return SwipeResponse(match_id=match_id, message="It's a match!")
    return SwipeResponse(match_id=None, message="Swipe recorded")
