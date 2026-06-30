from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db_session
from app.models.match import Match
from app.models.user import User

router = APIRouter(prefix="/matches", tags=["matches"])


class MatchItemInfo(BaseModel):
    id: int
    title: str
    video_file_id: str


class MatchUserInfo(BaseModel):
    id: int
    username: Optional[str] = None
    first_name: str


class MatchResponse(BaseModel):
    id: int
    item_a_id: int
    item_b_id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MatchDetailResponse(BaseModel):
    id: int
    item_a_id: int
    item_b_id: int
    user_a_id: int
    user_b_id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[MatchResponse])
async def get_matches(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get all matches for the current user."""
    query = select(Match).where(
        (Match.user_a_id == current_user.id) | (Match.user_b_id == current_user.id)
    )

    if status_filter:
        query = query.where(Match.status == status_filter)

    query = query.order_by(Match.created_at.desc())
    result = await db.execute(query)
    matches = list(result.scalars().all())

    return matches
