from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.security import decode_jwt_token, verify_telegram_hash, get_telegram_user_from_init_data
from app.core.config import settings
from app.models.user import User


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_telegram_init_data: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_session),
) -> User:
    """
    Get current user from JWT Bearer token or Telegram init data.
    Priority: JWT > Telegram init data.
    """
    user: Optional[User] = None

    # Try JWT first
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
        payload = decode_jwt_token(token)
        if payload:
            telegram_id = payload.get("telegram_id")
            if telegram_id:
                from sqlalchemy import select
                query = select(User).where(User.telegram_id == telegram_id)
                result = await db.execute(query)
                user = result.scalar_one_or_none()

    # Fallback to Telegram init data
    if user is None and x_telegram_init_data:
        parsed = verify_telegram_hash(x_telegram_init_data, settings.BOT_TOKEN)
        if parsed:
            user_data = get_telegram_user_from_init_data(parsed)
            if user_data:
                from sqlalchemy import select
                query = select(User).where(User.telegram_id == user_data["id"])
                result = await db.execute(query)
                user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication",
        )

    return user


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields a DB session."""
    async for session in get_async_session():
        yield session
