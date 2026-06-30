# Glorix v7 — Классификатор ТН ВЭД ЕАЭС (локальный, без внешних API)

Инструмент для классификации товаров по ТН ВЭД ЕАЭС на основе локальной LLM и векторного поиска.

**Важно:** Система является инструментом помощи декларанту, а не заменой сертифицированного таможенного брокера. Финальное решение о классификации принимает человек. Цена ошибки — штрафы и задержание груза.

---

## Что система делает

- Принимает текстовое описание товара
- Находит релевантные коды ТН ВЭД в вашей Excel-базе (векторный + BM25 поиск)
- Проверяет соответствие по PDF-пояснениям к ТН ВЭД (если загружены)
- Применяет правила ОПИ 1–6 (программно, с явной маркировкой эвристик)
- Запускает независимую проверку (Devil Advocate)
- Возвращает код с уверенностью, обоснованием и audit trail

## Что система НЕ делает

Читайте `LIMITATIONS_AND_RISKS.md` полностью перед production-использованием.

---

## Системные требования

| Компонент | Минимум |
|-----------|---------|
| Python | 3.10+ |
| RAM | 8 ГБ (для sentence-transformers) |
| Диск | 10+ ГБ (модели + Qdrant) |
| Ollama | запущен локально |
| Модель | qwen2.5:7b-instruct-q4_K_M (~4.7 ГБ) |

---

## Быстрый старт

### 1. Установить зависимости

```bash
cd backend
pip install -r requirements.txt
```

### 2. Скопировать и настроить .env

```bash
cp .env.example .env
# Отредактировать .env: задать REBUILD_TOKEN, пути к данным
```

### 3. Установить Ollama и скачать модель

```bash
# Установка Ollama: https://ollama.com/download
ollama pull qwen2.5:7b-instruct-q4_K_M
```

### 4. Положить данные в папку data/

```
data/
  excel/   ← Excel-файлы выгрузки ТН ВЭД (одна колонка кодов + описание)
  pdf/     ← PDF-пояснения к ТН ВЭД (опционально)
```

### 5. Проиндексировать базу знаний

```bash
python build_knowledge_base.py
```

### 6. Запустить API

```bash
USE_EMBEDDED_QDRANT=1 uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 7. Проверить

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/classify/explain \
  -H "Content-Type: application/json" \
  -d '{"description": "Болт М10x40 ГОСТ 7798 стальной оцинкованный", "include_audit": true}'
```

---

## Dev-mode (без Ollama и sentence-transformers)

Для проверки pipeline без тяжёлых ML-зависимостей:

```bash
export MOCK_EMBEDDER=1   # mock-эмбеддинги (SHA-256 хэш)
export MOCK_LLM=1        # top-1 candidate без вызова Ollama
export USE_EMBEDDED_QDRANT=1

python build_knowledge_base.py
uvicorn api.main:app --port 8000

curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "ноутбук портативный 15 дюймов"}'
```

**MOCK-режим НЕ проверяет качество классификации.** В ответе будет код, но он не является таможенным решением.

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
|-----------|-------------|---------|
| `USE_EMBEDDED_QDRANT` | `0` | `1` = встроенный Qdrant (без Docker) |
| `QDRANT_STORAGE_PATH` | `./qdrant_storage` | Путь к embedded Qdrant |
| `QDRANT_HOST` | `localhost` | Хост внешнего Qdrant |
| `QDRANT_PORT` | `6333` | Порт внешнего Qdrant |
| `OLLAMA_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | LLM модель |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Адрес Ollama |
| `DATA_DIR` | `./data` | Корневая папка данных |
| `EXCEL_DIR` | `./data/excel` | Excel-файлы ТН ВЭД |
| `PDF_DIR` | `./data/pdf` | PDF-пояснения |
| `REBUILD_TOKEN` | ⚠️ **задать обязательно** | Токен для POST /rebuild |
| `MOCK_EMBEDDER` | `0` | `1` = mock-эмбеддинги (dev only) |
| `MOCK_LLM` | `0` | `1` = mock LLM без Ollama (dev only) |
| `CORS_ALLOW_ORIGINS` | `http://localhost:5173,...` | Разрешённые origins |

---

## API Endpoints

| Метод | URL | Описание |
|-------|-----|---------|
| `GET` | `/health` | Статус Qdrant, Ollama, коллекций |
| `POST` | `/classify` | Классификация (краткий ответ) |
| `POST` | `/classify/audit` | То же + полный audit_trail |
| `POST` | `/classify/explain` | Полный журнал всех шагов pipeline |
| `POST` | `/rebuild` | Пересобрать базу знаний (требует X-Rebuild-Token) |

---

## Запуск тестов

```bash
# Все тесты в dev-mode (не требуют Ollama)
MOCK_LLM=1 MOCK_EMBEDDER=1 USE_EMBEDDED_QDRANT=1 \
  python -m pytest tests/test_refusals.py tests/test_rule_engine_v2.py tests/test_e2e_fixture.py -v

# Unit-тесты (чистые, без ML)
python tests/unit_tests.py

# Контрактные тесты API (требуют fastapi[testclient] + httpx)
MOCK_LLM=1 MOCK_EMBEDDER=1 \
  python -m pytest tests/test_api_contract.py -v
```

---

## Структура проекта

```
backend/
  api/main.py              — FastAPI endpoints
  rag/
    classifier.py          — 14-шаговый pipeline
    llm_client.py          — Ollama client + MOCK_LLM
    retriever.py           — Hybrid retriever (dense + BM25)
    evidence_builder.py    — Сборка доказательной базы
    devil_advocate.py      — Независимая проверка
    validator.py           — Валидация кода кандидата
    rule_engine.py         — Программные правила ОПИ 1–6
  ingestion/
    excel_parser.py        — Парсер Excel ТН ВЭД
    pdf_extractor.py       — Извлечение чанков из PDF
    embedder.py            — sentence-transformers + MOCK_EMBEDDER
  store/qdrant_store.py    — Qdrant client (embedded/external)
  config.py                — Константы и веса
  build_knowledge_base.py  — Индексация данных
  tests/
    test_e2e_fixture.py    — E2E тесты на mock-данных
    test_api_contract.py   — Контракт API
    test_refusals.py       — Тесты политики отказа
    test_rule_engine_v2.py — Тесты Rule Engine
```

---

## Честный ответ на вопрос о PDF

**Да**, система читает PDF пользователя в `/classify/explain` — если:
1. PDF файлы помещены в `data/pdf/`
2. Запущен `python build_knowledge_base.py` после добавления PDF
3. В ответе `/health` поле `qdrant.pdf_chunks_count > 0`

**Нет (только Excel)**, если `pdf_chunks_count = 0` в `/health`. В этом случае поле `evidence.pdf_chunks` в ответе будет пустым, а `audit_trail[step=retrieval].pdf_chunks_found = 0`.
