# AUDIT_REPORT.md — Glorix v7 Production Readiness Audit

**Дата аудита:** 2026-06-30  
**Версия:** v7 Phase C (fix/v7-critical-runtime)  
**Аудитор:** automated + manual review  

---

## Исполнительное резюме

Система приведена к состоянию production-ready в части архитектуры и тестового покрытия. Все критические runtime-баги исправлены. Введены dev-режимы (MOCK_LLM=1, MOCK_EMBEDDER=1) для локальной разработки без ML-зависимостей. Ограничения юридической применимости ОПИ задокументированы явно.

**Статус тестов на момент аудита:**

| Набор тестов | Результат |
|---|---|
| `tests/unit_tests.py` | ✅ 101/101 passed |
| `pytest test_refusals.py` | ✅ 23/23 passed |
| `pytest test_rule_engine_v2.py` | ✅ 64/64 passed |
| `pytest test_e2e_fixture.py` | ✅ 13/13 passed |
| `py_compile` всех модулей | ✅ OK |
| `import api.main` (mock Qdrant) | ✅ API_IMPORT_OK |

**Итого: 201 тест пройден, 0 провалено.**

---

## Изменения Phase C (fix/v7-critical-runtime)

### Task 50 — MOCK_LLM + MOCK_EMBEDDER
- `ingestion/embedder.py`: добавлен MOCK_EMBEDDER=1 режим (SHA-256 hash → float32, dim=768, L2-нормализованный)
- `rag/llm_client.py`: добавлен MOCK_LLM=1 режим (top-1 candidate, confidence ≤ 0.60, без Ollama)
- Критический баг исправлен: `np.frombuffer(..., dtype=np.float32)` → INF → заменён на `dtype=np.uint8` затем `.astype(np.float32)`

### Task 51 — Исправления модулей
- `rag/retriever.py`: BM25 — ленивый импорт с fallback (dense-only если rank_bm25 не установлен)
- `store/qdrant_store.py`: добавлена `get_health_info()` — статус, режим, количество векторов
- `rag/devil_advocate.py`: добавлено `llm_check_performed: bool` в `DevilResult`; добавлен `MOCK_LLM` check
- `ingestion/pdf_extractor.py`: все эвристики помечены `# HEURISTIC`; logging вместо print
- `ingestion/excel_parser.py`: fallback на малые листы (для тестовых фикстур)

### Task 52 — api/main.py и classifier.py
- `api/main.py`: `_get_default_model()` с fallback; REBUILD_TOKEN warning при дефолтном значении; `/health` использует `get_health_info()`
- `rag/classifier.py`: ExplainResponse contract верифицирован

### Task 53 — Тесты
- `tests/test_api_contract.py`: 8 FastAPI TestClient тестов (health, classify validation, rebuild auth)
- `tests/test_e2e_fixture.py`: 13 тестов (excel_parser + mock embedder + mock LLM)
- `tests/fixtures/mini_tnved.xlsx`: 6 реальных 10-значных листовых кодов

### Task 54 — Документация
- `README.md`: полная инструкция по установке, dev-mode, API endpoints, структура проекта
- `LIMITATIONS_AND_RISKS.md`: задокументированы ограничения юридического применения ОПИ, качество без PDF, границы ответственности

---

## Текущие ограничения (документированные, не исправленные)

### Юридические / методологические

| Ограничение | Локализация | Статус |
|---|---|---|
| ОПИ 4 не реализован | `rule_engine.py` | `SKIPPED`, в комментарии |
| ОПИ 5 не реализован | `rule_engine.py` | `SKIPPED`, в комментарии |
| ОПИ 1 «специфичность» — эвристика | `rule_engine.py` | `# HEURISTIC` |
| ОПИ 3б «существенный характер» — keyword | `rule_engine.py` | `# HEURISTIC` |
| ProductFeatureExtractor — keyword/substr | `classifier.py` | `# HEURISTIC` |
| Нет интеграции с ФТС/ПРК базой | — | Вне scope системы |

### Технические

| Ограничение | Локализация | Статус |
|---|---|---|
| PDF без chapter-аннотации могут потеряться | `pdf_extractor.py` | WARNING в логах |
| BM25 опционален | `retriever.py` | Fallback на dense-only |
| benchmark_stress.py — синтетические данные | `tests/` | Не доказательство точности |
| Нет real-mode E2E теста | — | Требует Ollama + Excel/PDF |

---

## Проверено вручную / автоматически

### Проверено автоматически (sandbox)
- ✅ Все py_compile прошли
- ✅ 201 unit/pytest тестов прошли
- ✅ API импортируется с mock-стабами
- ✅ mini_tnved.xlsx парсится корректно (6/6 кодов, is_leaf_10digit=True)
- ✅ MOCK_EMBEDDER: вектор dim=768, L2-норма ~1.0, детерминирован
- ✅ MOCK_LLM: возвращает top-1, confidence ≤ 0.60, requires_clarification при пустых кандидатах

### НЕ проверено (требует production-среды)
- ❌ Реальный запуск Ollama (qwen2.5:7b)
- ❌ sentence-transformers embeddings (требуют ~4 ГБ RAM + torch)
- ❌ Индексация реального Excel ТН ВЭД (10 000+ строк)
- ❌ Qdrant с реальными векторами (external Docker)
- ❌ PDF пояснения к ТН ВЭД (загрузка + индексация)
- ❌ End-to-end классификация реального товара

### PDF: честный ответ
PDF читаются и индексируются системой (`pdf_extractor.py` + `build_knowledge_base.py`). Но участвуют в реальной классификации только если:
1. PDF файлы помещены в `data/pdf/`
2. Запущен `python build_knowledge_base.py`
3. `/health` показывает `pdf_chunks_count > 0`

Если `pdf_chunks_count = 0` — PDF в реальной классификации НЕ используются.

---

## Архитектурная корректность (неизменна с v6)

- ✅ Нет if/else/regex/keyword как первичного метода классификации
- ✅ Нет OpenAI API, нет Claude API — полностью локальная система
- ✅ При низкой уверенности (< 0.50) система возвращает requires_clarification, а не придуманный код
- ✅ 8-значные «padding» коды блокируются на уровне validator.py
- ✅ Весь pipeline логируется в audit_trail с временными метками
