# Что изменилось и как выкатывать

## 1. Файлы патча (наложить поверх репозитория, пути сохранены)

```
backend/app/core/config.py           — BOT_TOKEN/SECRET_KEY без дефолтов, +Telegram Payments настройки
backend/app/core/security.py         — убран дубль verify-функций, fix URL-decode, constant-time compare
backend/app/api/deps.py              — fix auth bypass (пустой bot_token → settings.BOT_TOKEN)
backend/app/api/payment.py           — /payment/init теперь выдаёт invoice_link, /payment/webhook удалён
backend/app/api/subscription.py      — /subscription/create выдаёт invoice_link, /subscription/webhook удалён
backend/app/api/telegram_webhook.py  — НОВЫЙ. Единственная точка подтверждения оплаты.
backend/app/services/payment_service.py       — settle()/can_accept_payment() вместо process_webhook()
backend/app/services/subscription_service.py  — НОВЫЙ, та же логика для подписки
backend/app/services/telegram_bot_service.py  — НОВЫЙ, клиент к Bot API (createInvoiceLink и т.п.)
backend/app/main.py                  — подключён telegram_webhook, удалён /debug

frontend/src/services/api.ts             — payment/subscription методы на реальных путях бэкенда
frontend/src/telegram/init.ts            — +openInvoice в типах
frontend/src/telegram/TelegramProvider.tsx — +openInvoice в контексте
frontend/src/pages/PaymentPage.tsx        — реальный флоу вместо setTimeout-заглушки
```

## 2. Переменные окружения (Railway → Variables)

```
BOT_TOKEN=<токен от BotFather>
SECRET_KEY=<сгенерировать: python -c "import secrets;print(secrets.token_urlsafe(32))">
TELEGRAM_WEBHOOK_SECRET=<сгенерировать так же, отдельным значением>
TELEGRAM_PROVIDER_TOKEN=<из BotFather /mybots → Payments, ПУСТО если платите Stars>
CURRENCY=XTR    # или USD/RUB и т.п., если платите через провайдера, не Stars
```

Важно: `BOT_TOKEN` и `SECRET_KEY` в новом `config.py` **без дефолтов** — сервис
теперь не стартует, если их забыли задать в Railway. Это осознанно: раньше
дефолтный `SECRET_KEY` был публично виден в репозитории, и приложение тихо
работало на нём, если забыть env — теперь вместо тихой дыры получите падение
при деплое, что и нужно.

## 3. Разовая настройка webhook (сделать один раз руками, не из кода)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://589-production.up.railway.app/telegram/webhook",
    "secret_token": "<тот же TELEGRAM_WEBHOOK_SECRET, что в env>",
    "allowed_updates": ["pre_checkout_query", "message"]
  }'
```

Проверить, что встало: `GET https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo`

## 4. Если платите через Telegram Stars (CURRENCY=XTR)

- `TELEGRAM_PROVIDER_TOKEN` не нужен вообще.
- Цены (`PRO_PRICE`, `MATCH_PRICE`) — целые числа звёзд, не доллары. Сейчас в
  конфиге `0.5` и `10.0` — это остатки от старой (нерабочей) схемы, нужно
  пересчитать под реальный прайсинг в звёздах (Telegram сам не позволит
  дробные Stars).

## 5. Что осталось за скобками этого патча

При аудите фронтенда всплыло, что **`frontend/src/services/api.ts` в
значительной части вызывает пути, которых у бэкенда нет вообще**:
`getFeed` → `/feed` (бэкенд: `/items/feed`), `likeItem` →
`/items/{id}/like` (бэкенд: `/swipe` с body `{item_id, direction}`),
`getMatches` — сверить `/matches` (кажется, ок) и т.д. То есть кроме
платежей, вероятно, не связана вообще и лента/свайпы/матчи — это отдельная
задача, payment-патч её не касается. Если фронт сейчас всё ещё работает
через `demoData.ts`, а не реальный бэкенд — это объясняет, почему
несоответствие путей никто не заметил в проде.
