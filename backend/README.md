# Glorix — Классификатор ТН ВЭД ЕАЭС v7

**Локальная AI-система** классификации товаров по кодам ТН ВЭД ЕАЭС.
Работает полностью офлайн — без OpenAI API, без Claude API, без внешних сервисов.

---

## Архитектура

```
Описание товара
     ↓
[1] Извлечение признаков (LLM)
[2] Hint главы ТН ВЭД
[3] Retrieval из Qdrant (Excel + PDF)
[4] TOP-10 кандидатов (RRF)
[5] LLM-классификация с OPI
[6] Сборка доказательств (Evidence First)
[7] Rule Engine (ОПИ 1–6)
[8] Validator (OPI/GRI)
[9] Devil Advocate
[10] Независимая верификация
[11] Порог уверенности → ответ / отказ
[12] Журнал аудита
```

**Evidence First:** система ЗАПРЕЩЕНА возвращать код если `evidence.evidence_score < threshold`.

---

## Требования

- Python 3.10+
- [Ollama](https://ollama.com/) + модель `qwen2.5:7b-instruct-q4_K_M`
- ~8 GB RAM (для Ollama)

```bash
pip install -r requirements.txt
ollama pull qwen2.5:7b-instruct-q4_K_M
```

---

## Данные (ВАЖНО)

**`data/` — пустая директория по умолчанию.** Тестовые файлы хранятся только в `tests/fixtures/`.

Вам нужно добавить реальные данные:

### Excel с кодами ТН ВЭД
```
data/excel/tnved_full.xlsx   ← реальный Excel (13 289+ записей)
```
Источник: ФТС России или ЕЭК ЕАЭС (официальный Excel ТН ВЭД).

### PDF-пояснения ЕЭК
```
docs/explanations/ru.01_2022.pdf   ← Глава 01
docs/explanations/ru.02_2022.pdf   ← Глава 02
...
docs/explanations/ru.97_2022.pdf   ← Глава 97
```
100 файлов от ЕЭК ЕАЭС (пояснения к ТН ВЭД ЕАЭС, 2022).

---

## Построение базы знаний

```bash
# Без PDF (только Excel):
python build_knowledge_base.py

# С PDF-пояснениями (рекомендуется):
export PDF_DIRS=./data/pdf,./docs/explanations
python build_knowledge_base.py
```

Что делает:
- Парсит все `.xlsx` из `EXCEL_DIR` (default: `data/excel/`)
- Читает все `.pdf` из `PDF_DIRS` рекурсивно
- Строит multilingual-e5-base embeddings
- Сохраняет в Qdrant embedded (`qdrant_storage/`)

**Время выполнения (CPU):** ~1 час (Excel + 100 PDF).

---

## Запуск API

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Эндпоинты:
- `POST /classify` — классификация товара
- `POST /classify/explain` — с полным audit trail
- `GET /health` — статус системы
- `POST /rebuild` — переиндексация

---

## Переменные окружения

| Переменная | Значение по умолчанию | Описание |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Адрес Ollama |
| `OLLAMA_MODEL` | `qwen2.5:7b-instruct-q4_K_M` | Модель Ollama |
| `DATA_DIR` | `./data` | Корневая папка данных |
| `EXCEL_DIR` | `$DATA_DIR/excel` | Папка с Excel |
| `PDF_DIRS` | `$DATA_DIR/pdf` | PDF-директории (через запятую) |
| `USE_EMBEDDED_QDRANT` | `0` | `1` = встроенный Qdrant |
| `QDRANT_HOST` | `localhost` | Хост внешнего Qdrant |
| `QDRANT_PORT` | `6333` | Порт внешнего Qdrant |
| `EVIDENCE_MIN_SCORE` | `0.3` | Порог достаточности доказательств |

### Для разработки (без Ollama/реальных данных)
```bash
export MOCK_LLM=1
export MOCK_EMBEDDER=1
export USE_EMBEDDED_QDRANT=1
export EVIDENCE_MIN_SCORE=0.1
```

---

## Тесты

```bash
# Dev-mode (без Ollama, с тестовыми данными):
MOCK_LLM=1 MOCK_EMBEDDER=1 USE_EMBEDDED_QDRANT=1 EVIDENCE_MIN_SCORE=0.1 \
  pytest tests/ -x -q

# Бенчмарк с реальными кейсами:
python tests/benchmark.py --cases tests/real_cases_template.xlsx
```

---

## Статус

| Режим | Статус |
|---|---|
| Dev-mode (MOCK_LLM=1, MOCK_EMBEDDER=1) | ✅ Пройден, 127/127 тестов |
| Real-mode (Ollama + реальный Excel + PDF) | ⏳ Pending (требует Ollama + данные) |

---

## Ограничения

Подробно: [LIMITATIONS_AND_RISKS.md](LIMITATIONS_AND_RISKS.md)

Ключевые ограничения:
- Real-mode не верифицирован без Ollama и реального Excel
- `text_quality_score < 0.40` — PDF-чанки с нечитаемым текстом отбраковываются
- Evidence threshold по умолчанию `0.30` — не откалиброван на реальных данных
- LLM (qwen2.5:7b) может галлюцинировать; система блокирует вывод без доказательств

---

## Docker

```bash
# Требует Ollama на хосте
docker build -t glorix-backend .
docker run -p 8000:8000 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/qdrant_storage:/app/qdrant_storage \
  glorix-backend
```
