from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db_session
from app.models.chat import Chat
from app.models.match import Match
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatUnlockResponse(BaseModel):
    unlocked: bool
    deep_link: Optional[str] = None
    message: str


@router.get("/unlock/{match_id}", response_model=ChatUnlockResponse)
async def unlock_chat(
    match_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get chat deep link if the match chat is unlocked."""
    # Verify match belongs to user
    match_query = select(Match).where(
        Match.id == match_id,
        (Match.user_a_id == current_user.id) | (Match.user_b_id == current_user.id),
    )
    result = await db.execute(match_query)
    match = result.scalar_one_or_none()

    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    # Get chat for this match
    chat_query = select(Chat).where(Chat.match_id == match_id)
    result = await db.execute(chat_query)
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found for this match",
        )

    if chat.status != "unlocked":
        return ChatUnlockResponse(
            unlocked=False,
            deep_link=None,
            message="Chat is locked. Both users need to pay to unlock.",
        )

    # Generate deep link (Telegram bot deep link)
    from app.core.config import settings

    bot_username = settings.BOT_TOKEN.split(":")[0] if settings.BOT_TOKEN else None
    if not bot_username:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="BOT_TOKEN not configured",
        )

    deep_link = (
        f"https://t.me/{bot_username}"
        f"?start=chat_{match_id}"
    )

    return ChatUnlockResponse(
        unlocked=True,
        deep_link=deep_link,
        message="Chat is unlocked",
    )
