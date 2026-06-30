#!/usr/bin/env bash
# ===================================================================
# Barter App — Development Starter
# Запускает backend (FastAPI) + frontend (Vite) одной командой
# ===================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Barter App — Dev Mode                          ║"
echo "╚══════════════════════════════════════════════════════════╝"

# ---- Backend ----
echo ""
echo "[1/4] Проверка backend зависимостей..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    echo "  → Создаю venv..."
    python3 -m venv venv
fi
source venv/bin/activate
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "  ⚠️  Создан .env из .env.example — заполните BOT_TOKEN и SECRET_KEY!"
    fi
fi
pip install -q -r requirements.txt 2>/dev/null || pip install -r requirements.txt

echo "[2/4] Запуск backend (uvicorn)..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  → Backend PID: $BACKEND_PID (http://localhost:8000)"

# ---- Frontend ----
echo ""
echo "[3/4] Проверка frontend зависимостей..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "  → Устанавливаю npm зависимости..."
    npm install
fi
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
fi

echo "[4/4] Запуск frontend (Vite)..."
npx vite --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!
echo "  → Frontend PID: $FRONTEND_PID (http://localhost:3000)"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Готово!                                            ║"
echo "║                                                         ║"
echo "║  Frontend:  http://localhost:3000                       ║"
echo "║  Backend:   http://localhost:8000                       ║"
echo "║  API docs:  http://localhost:8000/docs                  ║"
echo "║  Health:    http://localhost:8000/health                ║"
echo "║                                                         ║"
echo "║  Для остановки: kill $BACKEND_PID $FRONTEND_PID        ║"
echo "╚══════════════════════════════════════════════════════════╝"

# Ждём нажатия Ctrl+C
trap "echo ''; echo 'Останавливаю...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
