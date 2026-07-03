from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db_session
from app.models.item import Item
from app.models.match import Match
from app.models.user import User

router = APIRouter(prefix="/matches", tags=["matches"])


class MatchItemInfo(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    condition: str
    video_url: str


class MatchOpponentInfo(BaseModel):
    id: int
    username: Optional[str] = None
    first_name: str


class MatchResponse(BaseModel):
    id: int
    status: str
    created_at: datetime
    my_item: MatchItemInfo
    their_item: MatchItemInfo
    opponent: MatchOpponentInfo


@router.get("", response_model=list[MatchResponse])
async def get_matches(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Матчи текущего пользователя с данными, достаточными для отрисовки карточки."""
    query = (
        select(Match)
        .where((Match.user_a_id == current_user.id) | (Match.user_b_id == current_user.id))
        .options(
            selectinload(Match.item_a).selectinload(Item.owner),
            selectinload(Match.item_b).selectinload(Item.owner),
        )
    )
    if status_filter:
        query = query.where(Match.status == status_filter)
    query = query.order_by(Match.created_at.desc())

    result = await db.execute(query)
    matches = list(result.scalars().all())

    out: list[MatchResponse] = []
    for m in matches:
        i_am_a = m.user_a_id == current_user.id
        my_item_obj = m.item_a if i_am_a else m.item_b
        their_item_obj = m.item_b if i_am_a else m.item_a
        opponent_user = their_item_obj.owner

        out.append(
            MatchResponse(
                id=m.id,
                status=m.status,
                created_at=m.created_at,
                my_item=MatchItemInfo(
                    id=my_item_obj.id,
                    title=my_item_obj.title,
                    description=my_item_obj.description,
                    category=my_item_obj.category,
                    condition=my_item_obj.condition,
                    video_url=f"/media/item/{my_item_obj.id}",
                ),
                their_item=MatchItemInfo(
                    id=their_item_obj.id,
                    title=their_item_obj.title,
                    description=their_item_obj.description,
                    category=their_item_obj.category,
                    condition=their_item_obj.condition,
                    video_url=f"/media/item/{their_item_obj.id}",
                ),
                opponent=MatchOpponentInfo(
                    id=opponent_user.id,
                    username=opponent_user.username,
                    first_name=opponent_user.first_name,
                ),
            )
        )

    return out
