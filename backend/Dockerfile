# Glorix v7 — ТН ВЭД Classifier
# Требует внешних сервисов: Qdrant, Ollama

FROM python:3.11-slim

LABEL maintainer="murodakbarov40@gmail.com"
LABEL version="7.0"
LABEL description="Glorix ТН ВЭД ЕАЭС Classifier — локальная RAG-система"

WORKDIR /app

# Системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Исходный код
COPY . .

# Данные монтируются как volume
VOLUME ["/app/data"]

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -sf http://localhost:8000/health || exit 1

# Production запуск
CMD ["python", "-m", "uvicorn", "api.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--log-level", "info"]
