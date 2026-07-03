import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models.item import Item
from app.services import telegram_bot_service

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/item/{item_id}")
async def stream_item_video(item_id: int, db: AsyncSession = Depends(get_db_session)):
    """
    Проксирует видео товара из Telegram file storage.
    Публично доступен (видео в ленте и так публичны для всех авторизованных
    пользователей приложения) — но НЕ требует передавать BOT_TOKEN клиенту,
    в отличие от прямой ссылки api.telegram.org/file/bot<TOKEN>/...
    """
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    file_path = await telegram_bot_service.get_file_path(item.video_file_id)
    url = telegram_bot_service.file_download_url(file_path)

    async def proxy():
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("GET", url) as resp:
                async for chunk in resp.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk

    return StreamingResponse(proxy(), media_type="video/mp4")
