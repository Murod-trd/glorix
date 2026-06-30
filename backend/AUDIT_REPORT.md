# AUDIT REPORT — Glorix ТН ВЭД Classifier v9

**Дата:** 2026-06-30  
**Ветка:** fix/v7-critical-runtime  
**Статус:** dev-mode passed ✅ | real-mode pending (Ollama не запущен в sandbox)

---

## ДОКАЗАТЕЛЬСТВА (8 критериев)

### 1. Real Excel indexed ✅
- Файл: `data/excel/mini_tnved.xlsx` → 6 leaf-кодов
- Замечание: для production требуется полная выгрузка ТН ВЭД (>10 000 кодов)

### 2. Real PDFs from docs/explanations indexed ✅
- Директория: `docs/explanations/` — 100 PDF-файлов
- Результат: 3260 чанков (3212 с главой ТН ВЭД, 48 без главы, 0 низкого качества)
- Именование: `ru.NN_2022*.pdf` — глава извлечена из имени файла (#HEURISTIC)

### 3. /health — ненулевые счётчики ✅
```json
{
  "qdrant": {
    "codes_count": 6,
    "pdf_chunks_count": 3260,
    "collections_exist": true
  },
  "data_sources": {
    "pdf_dirs": ["../docs/explanations"],
    "pdf_files_found": 100,
    "docs_explanations_detected": true,
    "docs_explanations_included": true,
    "warnings": []
  }
}
```

### 4. /classify/explain — реальные excel_records ✅
```json
"evidence_excel_count": 1,
"excel_records": [
  {"code": "7318151001", "description": "Болты и шурупы из нержавеющей стали, с резьбой, диаметр ≤ 6 мм", ...}
]
```

### 5. /classify/explain — реальные pdf_chunks ✅
```json
"evidence_pdf_count": 1,
"pdf_chunks": [
  {"source_file": "Примечания к ЕТТ_27.04.2026.pdf", "text_quality_score": 0.995, ...}
]
```

### 6. sources_used содержит реальные PDF из docs/explanations ✅
```json
"sources_used": [
  "Excel ТН ВЭД: 7318151001 — Болты и шурупы...",
  "PDF Примечания к ЕТТ_27.04.2026.pdf стр.4",
  "ru.92_2022.pdf стр.1"
]
```

### 7. Все тесты проходят ✅
```
121 passed, 4 skipped, 1 warning
Тесты: test_refusals, test_rule_engine_v2, test_api_contract,
       test_rebuild_embedded_mode, test_data_sources, test_e2e_fixture
```

### 8. ZIP доставлен, коммит запушен ✅
- See below

---

## ИЗМЕНЕНИЯ В v9 (поверх v8)

### Критические исправления

| # | Файл | Изменение |
|---|------|-----------|
| 57 | `api/main.py` | `/rebuild` → HTTP 409 при `USE_EMBEDDED_QDRANT=1` |
| 58 | `build_knowledge_base.py` | `STRICT_BUILD=1` + `REQUIRE_EXCEL=1` + `REQUIRE_PDF=1` |
| 59 | `ingestion/pdf_extractor.py` | Полная перепись: `text_quality_score`, `CHAPTER_PATTERN` (#HEURISTIC) |
| 59 | `api/main.py` | `_DOCS_EXPL_PATH` как module-level переменная (тестируемо) |
| 59 | `api/main.py` | `data_sources.warnings` + `docs_explanations_detected/included` |
| 59 | `api/main.py` | `evidence_threshold_used`, `evidence_threshold_source`, `evidence_warnings` |

### Новые тесты

| Файл | Тесты | Покрытие |
|------|-------|---------|
| `test_rebuild_embedded_mode.py` | 4 | `/rebuild` 409 в embedded режиме |
| `test_data_sources.py` | 4 | `data_sources` в `/health` |
| `test_api_contract.py` | 14+10 | API контракт (с skip при пустой БД) |
| `test_e2e_fixture.py` | 6 | E2E с реальным build на fixtures |
| `tests/conftest.py` | autouse | Сброс Qdrant/Retriever синглтонов |

---

## ОГРАНИЧЕНИЯ (не изменились)

1. **MOCK_EMBEDDER=1** — в sandbox нет GPU/Ollama. В production нужен реальный embedder.
2. **mini_tnved.xlsx** содержит 6 кодов вместо >10 000. Точность классификации низкая.
3. **Retriever BM25** работает корректно; vector search с mock-эмбеддингами даёт случайные результаты.
4. **Embedded Qdrant** не поддерживает `/rebuild` через API (HTTP 409). Пересборка — только офлайн.
5. **chapter detection** — `#HEURISTIC`: regex в тексте + имя файла. Не гарантирован 100% охват.
6. **text_quality_score** рассчитывается по ratio нормальных символов — эвристика, не ground truth.

---

## ЧЕСТНЫЙ ИТОГОВЫЙ СТАТУС

**dev-mode passed** — все критерии доказаны с MOCK_EMBEDDER=1 и реальными 100 PDF.  
**real-mode pending** — Ollama недоступен в sandbox; для production требуется `ollama pull qwen2.5:7b-instruct-q4_K_M`.
