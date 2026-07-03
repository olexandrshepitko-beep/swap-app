"""
Верификация оплаты через TON Connect.

В отличие от Telegram Payments, TON не присылает нам webhook — оплата это
просто транзакция в блокчейне на наш кошелёк. Подтверждение работает через
ОПРОС (polling): фронт после отправки транзакции зовёт наш /verify эндпоинт,
а мы сверяем последние входящие транзакции на TON_WALLET_ADDRESS с ожидаемым
комментарием и суммой.

Используется REST API toncenter.com (v2). Комментарий (memo) в транзакции —
это тот же формат payload, что и в Telegram-инвойсах: "match:{id}:{user_id}"
или "sub:{id}:{user_id}" — так проще держать оба способа оплаты в одной логике.
"""

import httpx

from app.core.config import settings

NANOTON = 10**9


class TonVerificationError(RuntimeError):
    pass


def to_nanoton(amount_ton: float) -> int:
    return int(round(amount_ton * NANOTON))


async def find_matching_transaction(
    expected_comment: str,
    min_amount_nanoton: int,
    lookback: int = 30,
) -> str | None:
    """
    Ищет среди последних `lookback` входящих транзакций на TON_WALLET_ADDRESS
    такую, где текстовый комментарий совпадает и сумма >= ожидаемой.

    Возвращает transaction hash (используем как provider_payment_id) или None.
    """
    if not settings.TON_WALLET_ADDRESS:
        raise TonVerificationError("TON_WALLET_ADDRESS is not configured")

    params: dict[str, str | int] = {
        "address": settings.TON_WALLET_ADDRESS,
        "limit": lookback,
        "archival": "true",
    }
    headers = {"X-API-Key": settings.TON_API_KEY} if settings.TON_API_KEY else {}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{settings.TON_API_BASE}/getTransactions", params=params, headers=headers
        )
    data = resp.json()

    if not data.get("ok"):
        raise TonVerificationError(f"toncenter error: {data.get('error')}")

    for tx in data.get("result", []):
        in_msg = tx.get("in_msg") or {}
        comment = (in_msg.get("message") or "").strip()
        value = int(in_msg.get("value") or 0)

        if comment == expected_comment and value >= min_amount_nanoton:
            # transaction_id.hash — base64, уникален для транзакции, годится
            # как идемпотентный provider_payment_id
            tx_hash = (tx.get("transaction_id") or {}).get("hash")
            if tx_hash:
                return f"ton:{tx_hash}"

    return None
