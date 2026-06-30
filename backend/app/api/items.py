from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db_session
from app.models.item import Item
from app.models.user import User

router = APIRouter(prefix="/items", tags=["items"])


# --- Pydantic schemas ---

class ItemCreateRequest(BaseModel):
    video_file_id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    condition: str = "good"  # new, like_new, good, fair


class ItemResponse(BaseModel):
    id: int
    owner_id: int
    video_file_id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    condition: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemFeedResponse(BaseModel):
    items: list[ItemResponse]
    page: int
    page_size: int
    total: Optional[int] = None


# --- Endpoints ---

@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    req: ItemCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new item listing."""
    item = Item(
        owner_id=current_user.id,
        video_file_id=req.video_file_id,
        title=req.title,
        description=req.description,
        category=req.category,
        condition=req.condition,
        status="active",
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.get("/feed", response_model=ItemFeedResponse)
async def get_feed(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Get the item feed for the current user."""
    from app.services.feed_service import FeedService

    service = FeedService(db)
    items = await service.get_feed(
        user_id=current_user.id,
        page=page,
        page_size=page_size,
    )

    return ItemFeedResponse(
        items=[ItemResponse.model_validate(item) for item in items],
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
    """Get a single item by ID."""
    query = (
        select(Item)
        .where(Item.id == item_id)
        .options(selectinload(Item.owner))
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return item
