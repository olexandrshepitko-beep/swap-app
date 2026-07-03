# Что изменилось (v2 — полная связка фронт/бэк) и как выкатывать

## 1. Файлы патча (наложить поверх репозитория, пути сохранены)

### Backend
```
core/config.py            — BOT_TOKEN/SECRET_KEY без дефолтов, +Telegram Payments, +BOT_USERNAME, +STORAGE_CHAT_ID
core/security.py          — убран дубль verify-функций, fix URL-decode, constant-time compare
api/deps.py                — fix auth bypass (пустой bot_token → settings.BOT_TOKEN)
api/auth.py                 — БЕЗ ИЗМЕНЕНИЙ, но теперь реально вызывается фронтом при старте
api/items.py                — POST /items теперь принимает multipart (видео-файл), не JSON с готовым file_id;
                               GET /items/feed — реальная пагинированная лента; video_url — проксируемый путь
api/media.py                 — НОВЫЙ. GET /media/item/{id} — стримит видео из Telegram, токен не покидает сервер
api/swipe.py                 — + GET /swipe/received («меня выбрали», раньше фейковый генератор на фронте)
api/match.py                  — GET /matches теперь отдаёт обогащённые данные (вещи + оппонент), а не голые ID
api/chat.py                   — deep link через BOT_USERNAME (раньше t.me/<числовой_id> — невалидная ссылка)
api/payment.py               — /payment/init выдаёт invoice_link, /payment/webhook удалён
api/subscription.py         — /subscription/create выдаёт invoice_link, /subscription/webhook удалён
api/telegram_webhook.py      — НОВЫЙ. Единственная точка подтверждения оплаты (pre_checkout_query + successful_payment)
models/match.py               — + relationship item_a/item_b (нужны для обогащённого /matches)
models/swipe.py                — + relationship item (нужен для /swipe/received)
services/payment_service.py    — settle()/can_accept_payment() вместо process_webhook()
services/subscription_service.py — НОВЫЙ
services/telegram_bot_service.py — НОВЫЙ: createInvoiceLink, answerPreCheckoutQuery, upload_video, getFile
services/ton_service.py          — НОВЫЙ: верификация TON-транзакций через toncenter API (polling, не webhook)
api/payment.py, api/subscription.py — + /ton/info и /ton/verify эндпоинты (второй способ оплаты)
main.py                        — подключены media + telegram_webhook, удалён /debug
```

### Frontend
```
App.tsx                        — обязательный auth-bootstrap (authTelegram) до рендера остального приложения
services/api.ts                 — ПОЛНОСТЬЮ переписан: реальные пути бэкенда, реальные типы, JWT-токен
telegram/init.ts, TelegramProvider.tsx — + openInvoice
pages/FeedPage.tsx               — реальная лента (/items/feed) и реальный свайп (/swipe) вместо demoData
pages/LikedPage.tsx              — вкладка «меня выбрали» — реальный /swipe/received вместо генератора
pages/MatchPage.tsx              — реальные /matches вместо DEMO_MATCHES, только 2 реальных статуса (pending/active)
pages/CreateItemPage.tsx         — handleSubmit реально вызывает API (раньше — console.log и переход в /feed)
pages/PaymentPage.tsx            — реальный флоу + реальный deep link на чат (был захардкожен BarterMarketBot)
pages/ProPage.tsx                — реальная подписка через openInvoice вместо setTimeout
components/CardSwiper.tsx        — video_url вместо videoUrl, убран несуществующий в бэкенде isPro-бейдж
main.tsx                         — обёрнут в TonConnectUIProvider
services/tonPayment.ts           — НОВЫЙ: сборка и отправка TON-транзакции с комментарием (memo)
public/tonconnect-manifest.json  — НОВЫЙ: обязателен для TonConnect, отдаётся статикой на gh-pages
pages/PaymentPage.tsx, pages/ProPage.tsx — + переключатель способа оплаты Telegram/TON
```

### Удалить вручную (патч не удаляет файлы, только добавляет/заменяет)
```
rm frontend/src/components/SwipeableCard.tsx   # мёртвый код, нигде не импортировался
rm frontend/src/services/demoData.ts           # больше нигде не используется
```

## 2. Переменные окружения (Railway → Variables)

```
BOT_TOKEN=<токен от BotFather>
BOT_USERNAME=<username бота без @, например BarterMarketBot>
SECRET_KEY=<python -c "import secrets;print(secrets.token_urlsafe(32))">
TELEGRAM_WEBHOOK_SECRET=<то же самое, отдельным значением>
TELEGRAM_PROVIDER_TOKEN=<из BotFather /mybots → Payments, ПУСТО если платите Stars>
CURRENCY=XTR
STORAGE_CHAT_ID=<см. пункт 3>
```

`BOT_TOKEN` и `SECRET_KEY` — без дефолтов, сервис не стартует без них (осознанно,
см. предыдущее сообщение про CRITICAL #5).

## 3. STORAGE_CHAT_ID — куда бот складывает видео

Видео вещей хранятся не на вашем сервере, а в Telegram (бесплатно, через
sendVideo → file_id). Нужен приватный канал/чат, куда бот шлёт видео:

1. Создайте приватный Telegram-канал (например "Barter Storage").
2. Добавьте вашего бота туда админом (Add Admin → права на отправку сообщений).
3. Перешлите любое сообщение из этого канала боту @getidsbot — он вернёт chat_id
   (отрицательное число вида `-1001234567890`).
4. `STORAGE_CHAT_ID=-1001234567890` в Railway.

Ограничение: sendVideo через Bot API — до 50 МБ на файл (в коде уже есть проверка).

## 3а. TON Connect — настройка второго способа оплаты

1. Заведите TON-кошелёк, который будет принимать платежи (например через
   Tonkeeper), скопируйте его адрес.
2. Переменные окружения:
   ```
   TON_API_KEY=<опционально, получить на toncenter.com — без ключа жёсткий rate limit>
   TON_WALLET_ADDRESS=<адрес вашего кошелька>
   TON_MATCH_PRICE=0.15   # в TON, подберите под актуальный курс
   TON_PRO_PRICE=3.0
   ```
3. `frontend/public/tonconnect-manifest.json` — уже создан в патче, но
   **проверьте поле `iconUrl`**: он указывает на `icon-192.png`, которого
   может не быть в вашей сборке. Без реально доступной иконки некоторые
   кошельки откажутся показывать приложение в UI подключения.
4. Проверьте импорт `beginCell` в `frontend/src/services/tonPayment.ts` —
   написан под пакет `ton@13.9.0` из вашего `package.json`, но не
   прогонялся через реальный `tsc` (в этой среде нет `node_modules` и
   отключена сеть, так что не мог проверить компиляцию TS/TSX). Если
   сборка упадёт на этом импорте — экспорт `beginCell` нужно брать из
   `ton-core` вместо `ton`.
5. Механизм подтверждения — **поллинг, не webhook**: TON не может сам
   постучаться к вам, поэтому после отправки транзакции фронт каждые 6
   секунд (до ~20 попыток) спрашивает бэкенд «подтвердилась ли», а бэкенд
   спрашивает toncenter «была ли на моём кошельке транзакция с таким-то
   комментарием и суммой». Это нормальный паттерн для TON Mini Apps, но
   он не мгновенный — обычно 5-30 секунд на подтверждение в сети.

## 4. Разовая настройка Telegram-webhook

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://589-production.up.railway.app/telegram/webhook",
    "secret_token": "<тот же TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["pre_checkout_query", "message"]
  }'
```

Проверка: `GET https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo`

## 5. Что осталось за скобками (сознательно не трогал)

- **DB-миграции**: если используете Alembic — новые relationships в моделях
  не требуют новых колонок (только Python-уровня relationship), миграция не
  нужна. Если используете `create_all()` при старте — тоже ок, схема таблиц
  не менялась.
- **Кэширование file_path**: `/media/item/{id}` резолвит file_path у Telegram
  на каждый запрос видео (getFile). Для 20-30 одновременных пользователей это
  не проблема, но при росте нагрузки стоит кэшировать file_path в Redis на
  ~50 минут (Telegram отдаёт ссылку, живущую час).
- **Realtime чат**: разблокировка чата сейчас = deep link в личку/бота
  Telegram, отдельного in-app чата в системе нет — это соответствует
  изначальному дизайну (`chat.py` только генерирует deep link).
- **PRO-скидка на MATCH_PRICE** (в ProPage написано «$0.25 вместо $0.5 для
  PRO») — эта логика нигде не реализована на бэкенде, `payment_service.py`
  всегда берёт `settings.MATCH_PRICE` без учёта `user.is_pro`. Если это
  реальное намерение — отдельная небольшая доработка `init_payment`.
