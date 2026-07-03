from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db_session
from app.models.item import Item
from app.models.swipe import Swipe
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


class ReceivedLikeItemInfo(BaseModel):
    id: int
    title: str
    video_url: str
    category: Optional[str] = None
    condition: str


class ReceivedLikeResponse(BaseModel):
    swiped_at: datetime
    liked_item: ReceivedLikeItemInfo  # ваша вещь, которую лайкнули
    liker_id: int  # telegram-владелец лайка (кто хочет с вами меняться)


@router.get("/received", response_model=list[ReceivedLikeResponse])
async def get_received_likes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    «Меня выбрали» — кто лайкнул мои вещи, но взаимного мэтча ещё нет
    (то есть я либо ещё не смотрел эту вещь, либо ещё не свайпнул её).

    Раньше эта вкладка на фронте была полностью фейковым генератором —
    теперь это реальный запрос.
    """
    my_items_q = select(Item.id).where(Item.owner_id == current_user.id)
    my_item_ids = [row[0] for row in (await db.execute(my_items_q)).all()]
    if not my_item_ids:
        return []

    likes_q = (
        select(Swipe)
        .where(and_(Swipe.item_id.in_(my_item_ids), Swipe.direction == "like"))
        .options(selectinload(Swipe.item))
        .order_by(Swipe.created_at.desc())
    )
    likes = list((await db.execute(likes_q)).scalars().all())

    # Исключаем тех, с кем уже есть матч (item уже matched) — если вещь
    # matched, она и так пропадёт из ленты; просто фильтруем по статусу вещи.
    out: list[ReceivedLikeResponse] = []
    for like in likes:
        if like.item.status == "matched":
            continue
        out.append(
            ReceivedLikeResponse(
                swiped_at=like.created_at,
                liked_item=ReceivedLikeItemInfo(
                    id=like.item.id,
                    title=like.item.title,
                    video_url=f"/media/item/{like.item.id}",
                    category=like.item.category,
                    condition=like.item.condition,
                ),
                liker_id=like.user_id,
            )
        )
    return out
