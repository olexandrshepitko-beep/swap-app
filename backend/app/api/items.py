from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db_session
from app.models.item import Item
from app.models.user import User
from app.services import telegram_bot_service

router = APIRouter(prefix="/items", tags=["items"])

MAX_VIDEO_BYTES = 50 * 1024 * 1024  # лимит sendVideo в Bot API


class ItemResponse(BaseModel):
    id: int
    owner_id: int
    owner_username: Optional[str] = None
    video_url: str  # проксируемый URL (/media/item/{id}), не сырой file_id
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    condition: str
    status: str
    created_at: datetime

    @staticmethod
    def from_item(item: Item) -> "ItemResponse":
        return ItemResponse(
            id=item.id,
            owner_id=item.owner_id,
            owner_username=item.owner.username if item.owner else None,
            video_url=f"/media/item/{item.id}",
            title=item.title,
            description=item.description,
            category=item.category,
            condition=item.condition,
            status=item.status,
            created_at=item.created_at,
        )


class ItemFeedResponse(BaseModel):
    items: list[ItemResponse]
    page: int
    page_size: int
    total: Optional[int] = None


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    condition: str = Form("good"),
    video: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Создать товар: видео принимается как файл, конвертируется в Telegram file_id."""
    video_bytes = await video.read()
    if len(video_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty video")
    if len(video_bytes) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video exceeds {MAX_VIDEO_BYTES // (1024*1024)}MB limit",
        )

    try:
        file_id = await telegram_bot_service.upload_video(
            video_bytes, video.filename or "item.mp4"
        )
    except telegram_bot_service.TelegramBotAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Video upload failed: {e}",
        )

    item = Item(
        owner_id=current_user.id,
        video_file_id=file_id,
        title=title,
        description=description,
        category=category,
        condition=condition,
        status="active",
    )
    db.add(item)
    await db.flush()
    await db.refresh(item, attribute_names=["owner"])
    return ItemResponse.from_item(item)


@router.get("/feed", response_model=ItemFeedResponse)
async def get_feed(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    from app.services.feed_service import FeedService

    service = FeedService(db)
    items = await service.get_feed(user_id=current_user.id, page=page, page_size=page_size)

    return ItemFeedResponse(
        items=[ItemResponse.from_item(item) for item in items],
        page=page,
        page_size=page_size,
        total=None,
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    query = select(Item).where(Item.id == item_id).options(selectinload(Item.owner))
    result = await db.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    return ItemResponse.from_item(item)
