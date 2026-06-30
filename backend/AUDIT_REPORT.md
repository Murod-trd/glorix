# AUDIT REPORT — Glorix ТН ВЭД Classifier v6

**Версия:** v6  
**Дата:** 2026-06-30  
**Автор:** Murod (murodakbarov40@gmail.com)  
**Репозиторий:** https://github.com/Murod-trd/glorix

---

## 1. Назначение системы

Glorix — система автоматической классификации товаров по кодам ТН ВЭД ЕАЭС (10-значные коды таможенного союза).

**Абсолютный запрет:** система не возвращает код, если не уверена в результате.  
**Цена ошибки:** потенциально миллионы долларов (штрафы, задержание груза, перерасчёт пошлин).

---

## 2. Архитектура pipeline (14 шагов)

```
input → features → chapter_hint → retrieval → top10 →
llm → evidence → rule_engine → validation → devil →
verify → threshold → answer/refuse → journal
```

Каждый шаг записывается в `audit_trail` с timestamp (`ts_ms`).

---

## 3. Изменения v6 (текущая версия)

### 3.1 EVIDENCE_WEIGHTS — единый источник констант

**Файл:** `config.py`

```python
EVIDENCE_WEIGHTS: dict = {
    "excel": 0.40,   # Excel-база (основа)
    "pdf":   0.30,   # PDF-нормативы
    "notes": 0.15,   # Примечания к главам
    "rank":  0.15,   # Позиция в рейтинге
}
assert abs(sum(EVIDENCE_WEIGHTS.values()) - 1.0) < 1e-9
```

Ранее в `evidence_builder.py` были хардкодированы значения 0.40 / 0.30 / 0.15.  
Теперь единственный источник — `config.py`.

### 3.2 opi_checker.py — deprecated stub

**Файл:** `rag/opi_checker.py`

Модуль полностью заменён заглушкой. Вся OPI-логика находится в `rule_engine.py`.

- `OPIReport()` — возвращает stub с `overall_verdict="DEPRECATED"`
- `run_opi_checks()` — выдаёт `DeprecationWarning`, возвращает `OPIReport()`
- Планируется удаление в v7

### 3.3 Timestamps в audit_trail

**Файл:** `rag/classifier.py`

Каждый `_stamp()` вызов фиксирует `ts_ms` (миллисекунды от начала обработки):

```python
def _stamp(step: str, data: dict) -> None:
    audit.append({"step": step, "ts_ms": int(time.time() * 1000) - start_ms, **data})
```

Всего 14 точек аудита: input, feature_extraction, chapter_hint, retrieval,
top10_analysis, llm_primary, evidence, rule_engine, validation,
devil_advocate, independent_verification, threshold_check, success/refuse.

---

## 4. Тестовое покрытие

| Файл | Тип | Результат |
|------|-----|-----------|
| `tests/unit_tests.py` | Кастомный фреймворк | **101/101 PASS** |
| `tests/test_refusals.py` | pytest | **19/19 PASS** |
| `tests/test_rule_engine_v2.py` | pytest | **68/68 PASS** |
| **Итого** | | **188/188 PASS** |

### Покрытые сценарии отказа (test_refusals.py)

- **(а) Галлюцинация LLM:** код не в базе кандидатов → `passed=False`
- **(б) Низкая уверенность:** `confidence < MIN_CONFIDENCE_TO_ANSWER` → отказ
- **(в) Недостаточно доказательств:** нет Excel-записей → `is_sufficient=False`

---

## 5. Задокументированные ограничения и эвристики

### 5.1 Jaccard similarity (ОПИ 1, ОПИ 6)

```python
# HEURISTIC: Jaccard similarity не учитывает синонимы и морфологию.
# "компьютер" ≠ "компьютеры", "болт" ≠ "болтовое соединение".
# Порог подтверждения: OPI1_JACCARD_CONFIRM_THRESHOLD = 0.30
```

**Риск:** схожие по смыслу, но разные по форме описания могут дать INSUFFICIENT.

### 5.2 Specificity score (ОПИ 3а)

```python
# HEURISTIC: длина описания и наличие стандартов (ГОСТ, DIN) используются
# как прокси для "специфичности". Реальная специфичность юридически определяется
# текстом позиции ТН ВЭД, а не длиной строки.
```

### 5.3 Материальный приоритет (PFE)

```python
# HEURISTIC: список MATERIAL_DOMINANT_FUNCTIONS содержит слова (труба, лист,
# пруток), при которых материал считается определяющим признаком.
# Список неполный — реальный выбор требует анализа всей позиции ТН ВЭД.
```

### 5.4 ОПИ 4 и ОПИ 5 — не реализованы

ОПИ 4 требует доступа к решениям ФТС/ВТО по аналогичным товарам (внешняя база).  
ОПИ 5 требует анализа упаковки, которая не представлена в текущей базе данных.

Оба правила возвращают `RuleVerdict.SKIPPED` с явной документацией причины.

### 5.5 Морфология

Токенайзер не использует стемминг или лемматизацию. Разные формы одного слова
считаются разными токенами. Для корректного сравнения требуется интеграция
с pymorphy2 или аналогом (планируется в v7).

---

## 6. Константы конфигурации (config.py)

| Константа | Значение | Описание |
|-----------|----------|----------|
| `MIN_CONFIDENCE_TO_ANSWER` | 0.45 | Порог уверенности для ответа |
| `MIN_EVIDENCE_SCORE` | 0.30 | Минимальный score доказательств |
| `MIN_EXCEL_RECORDS` | 1 | Минимум Excel-записей |
| `OPI1_JACCARD_CONFIRM_THRESHOLD` | 0.30 | Порог Jaccard для ОПИ 1 |
| `EVIDENCE_WEIGHTS["excel"]` | 0.40 | Вес Excel-доказательств |
| `EVIDENCE_WEIGHTS["pdf"]` | 0.30 | Вес PDF-доказательств |
| `EVIDENCE_WEIGHTS["notes"]` | 0.15 | Вес примечаний |
| `EVIDENCE_WEIGHTS["rank"]` | 0.15 | Вес позиции в рейтинге |

Все числовые пороги помечены `# HEURISTIC` в исходном коде.

---

## 7. Запрещённые практики (архитектурные инварианты)

1. **Нет if/else/regex/keyword как основного метода** классификации  
2. **Нет обращения к OpenAI API или Claude API** — только локальная модель Ollama  
3. **Нет ответа при недостаточных данных** — система отказывает, а не угадывает  
4. **Нет кода вне базы кандидатов** — validator блокирует галлюцинации LLM  
5. **Нет хардкодированных весов** — все константы только в config.py (v6)

---

## 8. Версионная история

| Версия | Ключевые изменения |
|--------|-------------------|
| v1-v2 | Базовая RAG-классификация |
| v3 | evidence_builder, devil_advocate, opi_checker |
| v4 | rule_engine.py с явными вердиктами ОПИ 1-6 |
| v5 | 14-шаговый pipeline, Refusal Policy, validator |
| v6 | EVIDENCE_WEIGHTS в config, opi_checker→stub, timestamps, новые тесты |
