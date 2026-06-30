# LIMITATIONS AND RISKS — Glorix ТН ВЭД Classifier

**Версия:** v9  
**Дата:** 2026-06-30

## КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ

### 1. Нет production embeddings (РИСК: КРИТИЧЕСКИЙ)
- `MOCK_EMBEDDER=1` генерирует случайные векторы
- Vector similarity search бессмысленна в mock-режиме
- BM25 частично компенсирует, но не заменяет семантический поиск
- **Решение:** установить Ollama и реальную модель embeddings

### 2. Неполная база ТН ВЭД (РИСК: КРИТИЧЕСКИЙ)
- `mini_tnved.xlsx` содержит 6 тестовых кодов
- Полная ТН ВЭД — более 11 000 десятизначных кодов
- **Любой production-вывод на основе этой базы недостоверен**
- **Решение:** загрузить полную выгрузку ТН ВЭД ЕАЭС

### 3. Embedded Qdrant ограничен (РИСК: ВЫСОКИЙ)
- `USE_EMBEDDED_QDRANT=1` — одиночный процесс, эксклюзивная блокировка хранилища
- `/rebuild` через API запрещён (HTTP 409) — только офлайн через терминал
- Не масштабируется горизонтально
- **Решение:** внешний Qdrant (`QDRANT_URL=http://qdrant:6333`)

### 4. Нет Ollama LLM (РИСК: ВЫСОКИЙ)
- `MOCK_LLM=1` — LLM не вызывается
- Классификация основана только на BM25 + rule engine
- **Решение:** `ollama pull qwen2.5:7b-instruct-q4_K_M`

## АРХИТЕКТУРНЫЕ ОГРАНИЧЕНИЯ

### 5. Chapter detection — эвристика (#HEURISTIC)
- `CHAPTER_PATTERN` — regex по тексту PDF
- Извлечение из имени файла (`ru.73_2022.pdf` → "73")
- Не все PDF содержат явное упоминание главы
- **Текущее покрытие:** 3212/3260 чанков с главой (98.5%)

### 6. text_quality_score — эвристика (#HEURISTIC)
- Ratio нормальных символов (не цифры/спецсимволы)
- Порог 0.40 может пропускать OCR-артефакты
- **Текущий результат:** 0 low-quality chunks из 3260 (0%) — возможно, порог слишком низкий

### 7. Evidence threshold
- По умолчанию `EVIDENCE_MIN_SCORE` в `evidence_builder.py`
- Снижение через env — только для dev/test режима
- В production нельзя возвращать код если `evidence.is_sufficient=false`

## ПРАВИЛА БЕЗОПАСНОСТИ (НЕИЗМЕННЫ)

- **Цена ошибки: миллионы долларов** — неверный ТН ВЭД код → штрафы, задержки на таможне
- Если `evidence.is_sufficient=false` → **отказ от классификации**, не гадание
- Если confidence < threshold → **requires_clarification=true**
- Система НЕ использует OpenAI API, НЕ использует Claude API
- Система работает полностью локально (при наличии Ollama)
- "Если что-то не работает — не пиши 'готово'"

## ЧТО НУЖНО ДЛЯ PRODUCTION

```bash
# 1. Установить Ollama
curl https://ollama.ai/install.sh | sh
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull nomic-embed-text

# 2. Загрузить полную базу ТН ВЭД
# Скачать официальную выгрузку с сайта ФТС/ЕЭК
# Поместить в data/excel/tnved_full.xlsx

# 3. Построить базу знаний (офлайн, до запуска API)
EXCEL_DIR=./data/excel \
PDF_DIRS=../docs/explanations \
STRICT_BUILD=1 REQUIRE_EXCEL=1 REQUIRE_PDF=1 \
python3 build_knowledge_base.py

# 4. Запустить API
uvicorn api.main:app --host 0.0.0.0 --port 8000

# 5. Проверить /health — убедиться что codes_count > 1000
```
