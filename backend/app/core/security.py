import hashlib
import hmac
import json
import time
from typing import Optional

import jwt
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings


class TelegramUserData(BaseModel):
    id: int
    first_name: str
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


def verify_telegram_init_data(init_data: str) -> Optional[TelegramUserData]:
    """
    Verify Telegram WebApp init data using HMAC-SHA256.
    Returns parsed user data if valid, None otherwise.
    """
    try:
        parsed = dict(param.split("=", 1) for param in init_data.split("&"))
    except Exception:
        return None

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    # Build data check string: sorted params key=value, newline-separated
    items = sorted(parsed.items())
    data_check_string = "\n".join(f"{k}={v}" for k, v in items)

    # Secret key: HMAC_SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        settings.BOT_TOKEN.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    # Computed hash
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if computed_hash != received_hash:
        return None

    # Check auth_date freshness (max 1 day)
    auth_date = int(parsed.get("auth_date", "0"))
    if time.time() - auth_date > 86400:
        return None

    user_json = parsed.get("user")
    if not user_json:
        return None

    try:
        user_data = json.loads(user_json)
    except (json.JSONDecodeError, TypeError):
        return None

    return TelegramUserData(
        id=user_data["id"],
        first_name=user_data.get("first_name", ""),
        username=user_data.get("username"),
        photo_url=user_data.get("photo_url"),
        auth_date=auth_date,
        hash=received_hash,
    )


def create_jwt_token(telegram_id: int, user_id: int) -> str:
    """Create a JWT token for internal use."""
    payload = {
        "telegram_id": telegram_id,
        "user_id": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 30,  # 30 days
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_jwt_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None


def verify_telegram_hash(init_data: str, bot_token: str) -> Optional[dict]:
    """
    Low-level verification returning the full parsed data dict.
    Used by the auth endpoint.
    """
    try:
        parsed = dict(param.split("=", 1) for param in init_data.split("&"))
    except Exception:
        return None

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    items = sorted(parsed.items())
    data_check_string = "\n".join(f"{k}={v}" for k, v in items)

    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if computed_hash != received_hash:
        return None

    auth_date = int(parsed.get("auth_date", "0"))
    if time.time() - auth_date > 86400:
        return None

    return parsed


def get_telegram_user_from_init_data(parsed: dict) -> Optional[dict]:
    """Extract user dict from verified init data."""
    user_json = parsed.get("user")
    if not user_json:
        return None
    try:
        return json.loads(user_json)
    except (json.JSONDecodeError, TypeError):
        return None
