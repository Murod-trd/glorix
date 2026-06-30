#!/bin/bash
# Glorix v7 — Production startup script
# Использование: ./start.sh [dev|prod]

set -e

MODE=${1:-prod}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════════"
echo "  Glorix v7 ТН ВЭД Classifier"
echo "  Mode: $MODE"
echo "═══════════════════════════════════════════"

# Проверка зависимостей
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 не найден"
    exit 1
fi

if ! command -v ollama &>/dev/null; then
    echo "WARNING: ollama не найден — LLM-классификация будет недоступна"
fi

# Загрузка .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
    echo "  .env загружен"
else
    echo "  WARNING: .env не найден, используются дефолтные значения"
fi

# Проверка Qdrant
if [ "${USE_EMBEDDED_QDRANT:-0}" = "1" ]; then
    echo "  Qdrant: embedded mode (без внешнего сервера)"
else
    QDRANT_HOST=${QDRANT_HOST:-localhost}
    QDRANT_PORT=${QDRANT_PORT:-6333}
    if curl -sf "http://$QDRANT_HOST:$QDRANT_PORT/healthz" >/dev/null 2>&1; then
        echo "  Qdrant: OK (http://$QDRANT_HOST:$QDRANT_PORT)"
    else
        echo "  ERROR: Qdrant недоступен по http://$QDRANT_HOST:$QDRANT_PORT"
        echo "  Запустите: docker run -p 6333:6333 qdrant/qdrant"
        exit 1
    fi
fi

# Запуск API
cd "$SCRIPT_DIR"
if [ "$MODE" = "dev" ]; then
    echo "  Starting in DEV mode (auto-reload)..."
    python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "  Starting in PROD mode..."
    python3 -m uvicorn api.main:app \
        --host "${API_HOST:-0.0.0.0}" \
        --port "${API_PORT:-8000}" \
        --workers 1 \
        --log-level "${API_LOG_LEVEL:-info}" \
        --no-access-log
fi
