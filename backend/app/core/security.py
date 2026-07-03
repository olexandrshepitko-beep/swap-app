import hashlib
import hmac
import json
import time
from typing import Optional
from urllib.parse import parse_qsl

import jwt

from app.core.config import settings


def verify_telegram_hash(init_data: str, bot_token: str) -> Optional[dict]:
    """
    Единственная функция верификации init_data (раньше была продублирована
    двумя почти идентичными версиями — это и привело к рассинхрону,
    когда deps.py по ошибке звал вариант с пустым bot_token).

    bot_token обязателен и не должен быть пустой строкой — вызывающий код
    должен передавать settings.BOT_TOKEN явно.
    """
    if not bot_token:
        raise ValueError("bot_token must not be empty")

    try:
        # parse_qsl корректно снимает URL-encoding (Telegram шлёт init_data
        # как query-string; ручной split('=')/split('&') ломался на %XX-последовательностях)
        parsed = dict(parse_qsl(init_data, strict_parsing=True))
    except Exception:
        return None

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))

    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        return None

    auth_date = int(parsed.get("auth_date", "0"))
    if time.time() - auth_date > 86400:
        return None

    return parsed


def get_telegram_user_from_init_data(parsed: dict) -> Optional[dict]:
    user_json = parsed.get("user")
    if not user_json:
        return None
    try:
        return json.loads(user_json)
    except (json.JSONDecodeError, TypeError):
        return None


def create_jwt_token(telegram_id: int, user_id: int) -> str:
    payload = {
        "telegram_id": telegram_id,
        "user_id": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400 * 30,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
