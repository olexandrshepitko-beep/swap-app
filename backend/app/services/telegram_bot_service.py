"""
Минимальный клиент к Telegram Bot API для Payments-флоу.

Используются два метода Bot API:
  - createInvoiceLink  — создать ссылку на инвойс (открывается через
                          Telegram.WebApp.openInvoice() на фронте)
  - answerPreCheckoutQuery — обязателен в ответ на pre_checkout_query,
                          иначе Telegram отменит платёж через 10 секунд

Документация: https://core.telegram.org/bots/api#payments
"""

from typing import Any

import httpx

from app.core.config import settings


class TelegramBotAPIError(RuntimeError):
    pass


async def _call(method: str, payload: dict) -> Any:
    token = settings.BOT_TOKEN
    if not token:
        raise TelegramBotAPIError("BOT_TOKEN not configured")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"https://api.telegram.org/bot{token}/{method}", json=payload)
    data = resp.json()
    if not data.get("ok"):
        raise TelegramBotAPIError(
            f"Telegram Bot API {method} failed: {data.get('description')}"
        )
    return data["result"]


async def create_invoice_link(
    title: str,
    description: str,
    payload: str,
    amount_minor_units: int,
    label: str,
) -> str:
    """
    Создаёт invoice link.

    amount_minor_units — цена в минимальных единицах валюты
    (копейки/центы; для XTR (Stars) — просто целое число звёзд, "minor units" не применяются).
    payload — произвольная строка ДО 128 байт, вернётся вам же в
              successful_payment.invoice_payload. Не показывается пользователю.
    """
    body = {
        "title": title[:32],
        "description": description[:255],
        "payload": payload,
        "currency": settings.CURRENCY,
        "prices": [{"label": label, "amount": amount_minor_units}],
    }
    if settings.CURRENCY != "XTR":
        # Провайдер обязателен для фиатных валют, не нужен для Stars
        body["provider_token"] = settings.TELEGRAM_PROVIDER_TOKEN

    # createInvoiceLink возвращает строку-ссылку прямо в поле "result"
    return await _call("createInvoiceLink", body)


async def answer_pre_checkout_query(
    pre_checkout_query_id: str,
    ok: bool,
    error_message: str | None = None,
) -> None:
    body = {"pre_checkout_query_id": pre_checkout_query_id, "ok": ok}
    if not ok and error_message:
        body["error_message"] = error_message
    await _call("answerPreCheckoutQuery", body)


async def set_webhook(url: str) -> None:
    """
    Разовая настройка — вызывается вручную из скрипта/консоли, не из рантайма.
    Регистрирует webhook URL и секрет, который Telegram будет присылать
    в заголовке X-Telegram-Bot-Api-Secret-Token на каждый запрос.
    """
    await _call(
        "setWebhook",
        {
            "url": url,
            "secret_token": settings.TELEGRAM_WEBHOOK_SECRET,
            "allowed_updates": ["pre_checkout_query", "message"],
        },
    )


async def upload_video(file_bytes: bytes, filename: str) -> str:
    """
    Загружает видео в STORAGE_CHAT_ID через sendVideo и возвращает file_id.
    Это способ бесплатно использовать Telegram как видео-хранилище —
    file_id постоянный, сам файл лежит на серверах Telegram.

    Ограничение Bot API: до 50 МБ на файл через этот метод.
    """
    token = settings.BOT_TOKEN
    if not token:
        raise TelegramBotAPIError("BOT_TOKEN not configured")
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{token}/sendVideo",
            data={"chat_id": settings.STORAGE_CHAT_ID, "supports_streaming": "true"},
            files={"video": (filename, file_bytes, "video/mp4")},
        )
    data = resp.json()
    if not data.get("ok"):
        raise TelegramBotAPIError(f"sendVideo failed: {data.get('description')}")

    video = data["result"].get("video")
    if not video:
        raise TelegramBotAPIError("sendVideo response has no video object")
    return video["file_id"]


async def get_file_path(file_id: str) -> str:
    """Резолвит file_id в актуальный file_path (годен ~1 час)."""
    result = await _call("getFile", {"file_id": file_id})
    return result["file_path"]


def file_download_url(file_path: str) -> str:
    """
    Внимание: этот URL содержит BOT_TOKEN в открытом виде.
    НИКОГДА не отдавать его напрямую клиенту — только использовать
    server-side для проксирования байтов (см. api/media.py).
    """
    return f"https://api.telegram.org/file/bot{settings.BOT_TOKEN}/{file_path}"
