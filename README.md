# Barter Mini App — Telegram Маркетплейс Обмена

**Приватный репозиторий** — `XRPLedgercity/barter-app`

Telegram Mini App для бартерного обмена: TikTok-style видео-лента, Tinder-style свайпы, скрытая идентичность до оплаты, Telegram Payments. **23 языка** в интерфейсе.

---

## 🏗 Архитектура

```
Telegram Mini App (React/Vite) ──axios──→ Backend API (FastAPI) ──→ PostgreSQL
         ↕                                        ↕
  Telegram WebApp SDK                     Anti-fraud Service
         ↕                                        ↕
   Language Selector                      Telegram Payments Webhook
   (23 языка, автоопределение)
```

## 📦 Состав

| Компонент | Технологии | Статус |
|---|---|---|
| Backend API | FastAPI + SQLAlchemy 2.0 async | ✅ 67 тестов, production-ready |
| Frontend | React 18 + TypeScript + Vite 5 | ✅ WebApp + 23 языка |
| Telegram Bot | (требуется реализация — aiogram 3.x) | ⚠️ Бот для /start + payments |
| CI/CD | GitHub Actions | ✅ lint + test |
| Deploy | Railway (Docker multi-stage) | ✅ готово |

## 🌐 Мультиязычность (23 языка)

Автоопределение через Telegram `language_code`. Выбор сохраняется в `localStorage`.
Кнопка 🌐 на StartPage и FeedPage.

| Регион | Языки |
|---|---|
| СНГ | Русский, Украинский, Казахский, Белорусский, Узбекский, Таджикский, Азербайджанский, Армянский, Грузинский, Молдавский, Киргизский, Туркменский |
| Прибалтика | Литовский, Латышский, Эстонский |
| Азия | Китайский, Японский, Корейский |
| Европа | English, Polish, Deutsch, Français, Español |

## 🚀 Быстрый старт (dev)

```bash
# 1. Клонировать
git clone https://github.com/XRPLedgercity/barter-app.git
cd barter-app

# 2. Backend
cd backend
cp .env.example .env       # заполнить BOT_TOKEN и SECRET_KEY
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Frontend (в новом терминале)
cd frontend
cp .env.example .env
npm install
npx vite --host 0.0.0.0 --port 3000
```

**ИЛИ одной командой:**
```bash
./start-dev.sh
```

## ⚙️ Переменные окружения (Backend — `.env`)

| Переменная | Обязательно | Описание |
|---|---|---|
| `BOT_TOKEN` | ✅ | Токен Telegram бота (от @BotFather) |
| `SECRET_KEY` | ✅ | Секретный ключ для JWT |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | — | Redis (опционально) |
| `TON_API_KEY` | — | Для TON Connect |
| `PRO_PRICE` | — | Цена PRO подписки (default: 10.0) |
| `MATCH_PRICE` | — | Цена открытия контакта (default: 0.5) |

## 🧪 Тесты

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v --tb=short
```

## 🔐 Security

- BOT_TOKEN не имеет дефолта — только через env
- SECRET_KEY не имеет дефолта — только через env
- Webhook подписки не принимает `user_id` из тела запроса
- /debug endpoint удалён
- telegram_id: BigInteger (а не Integer)
- Payment.amount: Decimal (а не float)
- CORS заголовки явно перечислены

## 🔗 Ссылки

- GitHub: https://github.com/XRPLedgercity/barter-app 🔒
- Railway: https://railway.app/project/stunning-dream
- Telegram Bot: (требуется создать и запустить)
