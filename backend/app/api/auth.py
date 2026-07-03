from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.security import verify_telegram_hash, get_telegram_user_from_init_data, create_jwt_token
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    init_data: str


class AuthResponse(BaseModel):
    token: str
    user_id: int
    telegram_id: int
    first_name: str
    username: Optional[str] = None
    is_new: bool = False


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(
    req: AuthRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Authenticate via Telegram WebApp init data.
    Creates user if not exists. Returns JWT token.
    """
    # Verify init data
    parsed = verify_telegram_hash(req.init_data, settings.BOT_TOKEN or "")
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram init data",
        )

    user_data = get_telegram_user_from_init_data(parsed)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse user data from init data",
        )

    telegram_id = user_data["id"]
    first_name = user_data.get("first_name", "")
    username = user_data.get("username")

    # Find or create user
    query = select(User).where(User.telegram_id == telegram_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    is_new = False
    if not user:
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        is_new = True
    else:
        # Update info
        if username:
            user.username = username
        if first_name:
            user.first_name = first_name
        await db.flush()

    # Create JWT
    token = create_jwt_token(telegram_id=telegram_id, user_id=user.id)

    return AuthResponse(
        token=token,
        user_id=user.id,
        telegram_id=telegram_id,
        first_name=first_name,
        username=username,
        is_new=is_new,
    )
