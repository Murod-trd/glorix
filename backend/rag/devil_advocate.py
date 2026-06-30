"""
devil_advocate.py v5 — Второй независимый модуль проверки классификации.

Архитектурный принцип:
  - Первый модуль (classifier + LLM): «Почему ЭТОТ код правильный?»
  - Этот модуль:                      «Почему ЭТОТ код может быть НЕПРАВИЛЬНЫМ?»

Работает в двух режимах:
  Режим 1 (статический, всегда):  программные проверки без LLM.
  Режим 2 (LLM, опционально): второй вызов LLM с adversarial промптом.

Результат:
  APPROVE — противоречий не найдено
  WARN    — есть сомнения, возвращается с предупреждениями
  BLOCK   — серьёзное противоречие, код НЕ возвращается

═══════════════════════════════════════════════════════════════════════════
ЗАДОКУМЕНТИРОВАННЫЕ ЭВРИСТИКИ (v5):
  - DEVIL_COMPETING_SCORE_RATIO=0.80: конкурент «с высоким score» — порог
    выбран эмпирически. Нет нормативного обоснования.
  - _is_static_block: блокировка при наличии слова "КРИТИЧНО" в тексте
    проблемы. Хрупкая проверка — исправлена на проверку кода-отсутствия.
  - Порог >=2 конкурирующих глав для WARNING — эмпирический.
═══════════════════════════════════════════════════════════════════════════


ОГРАНИЧЕНИЕ: без запущенного Ollama модуль выполняет только статические проверки.
LLM-верификация (динамический анализ) недоступна без локальной модели.
"""

from __future__ import annotations
import json
import logging
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

MOCK_LLM: bool = os.getenv("MOCK_LLM", "0") == "1"

try:
    from config import (
        DEVIL_TEMPERATURE,
        DEVIL_MAX_TOKENS,
        DEVIL_TIMEOUT_SEC,
        BLOCK_CONFIDENCE_DROP,
        WARN_CONFIDENCE_DROP,
        DEVIL_COMPETING_SCORE_RATIO,
    )
except ImportError:
    DEVIL_TEMPERATURE      = 0.2
    DEVIL_MAX_TOKENS       = 1024
    DEVIL_TIMEOUT_SEC      = 45
    BLOCK_CONFIDENCE_DROP  = 0.20
    WARN_CONFIDENCE_DROP   = 0.08
    DEVIL_COMPETING_SCORE_RATIO = 0.80  # HEURISTIC


@dataclass
class DevilResult:
    """Результат проверки devil advocate."""
    verdict: str                        # "APPROVE" | "WARN" | "BLOCK"
    reasons_against: list[str]          # конкретные причины сомнений
    alternative_code: Optional[str]     # альтернативный код если есть
    missing_info: list[str]             # что нужно для уверенной классификации
    confidence_delta: float             # изменение confidence (отрицательное)
    static_checks_passed: bool          # результат статических проверок (без LLM)
    static_issues: list[str]            # проблемы найденные статически
    raw_llm_response: Optional[str] = None
    llm_check_performed: bool = False  # True если Ollama была вызвана

    @property
    def blocks(self) -> bool:
        return self.verdict == "BLOCK"

    def to_dict(self) -> dict:
        return {
            "verdict": self.verdict,
            "reasons_against": self.reasons_against,
            "alternative_code": self.alternative_code,
            "missing_info": self.missing_info,
            "confidence_delta": self.confidence_delta,
            "static_checks_passed": self.static_checks_passed,
            "static_issues": self.static_issues,
            "llm_check_performed": self.llm_check_performed,
        }


# ── Главная функция ─────────────────────────────────────────────────────

def check_classification(
    proposed_code: str,
    product_description: str,
    top_candidates: list[dict],
    pdf_chunks: list[dict],
    ollama_client=None,      # передаётся из classifier, опционален
    model: str = "qwen2.5:7b-instruct-q4_K_M",
) -> DevilResult:
    """
    Запустить двойную проверку: статическую + LLM (если доступна).

    Args:
        proposed_code:       Предложенный код из первичной классификации
        product_description: Описание товара
        top_candidates:      Топ-кандидаты из retriever
        pdf_chunks:          Найденные PDF-фрагменты
        ollama_client:       Клиент Ollama (None → только статические проверки)
        model:               Модель для второго вызова

    Returns:
        DevilResult с вердиктом и обоснованием
    """
    # ── Этап 1: Статические проверки (всегда выполняются) ────────────
    static_passed, static_issues = _run_static_checks(
        proposed_code, top_candidates, pdf_chunks
    )

    # Если статические проверки уже дают BLOCK — не нужно тратить LLM
    if not static_passed and _is_static_block(static_issues):
        return DevilResult(
            verdict="BLOCK",
            reasons_against=static_issues,
            alternative_code=_find_best_alternative(proposed_code, top_candidates),
            missing_info=["Устраните противоречия найденные при статической проверке"],
            confidence_delta=-BLOCK_CONFIDENCE_DROP,
            static_checks_passed=False,
            static_issues=static_issues,
        )

    # ── Этап 2: LLM-проверка (если доступна и не dev-mode) ─────────
    if MOCK_LLM:
        # MOCK_LLM=1 — пропускаем LLM devil advocate (нет Ollama)
        verdict = "WARN" if not static_passed else "APPROVE"
        confidence_delta = -WARN_CONFIDENCE_DROP if not static_passed else 0.0
        return DevilResult(
            verdict=verdict,
            reasons_against=static_issues,
            alternative_code=_find_best_alternative(proposed_code, top_candidates) if not static_passed else None,
            missing_info=["MOCK_LLM=1 — LLM devil advocate не вызывался"],
            confidence_delta=confidence_delta,
            static_checks_passed=static_passed,
            static_issues=static_issues,
            llm_check_performed=False,
        )

    if ollama_client is not None:
        llm_result = _run_llm_check(
            proposed_code, product_description,
            top_candidates, pdf_chunks,
            ollama_client, model,
        )
        if llm_result is not None:
            # Объединить статические и LLM-проблемы
            all_issues = static_issues + [
                r for r in llm_result.get("reasons_against", [])
                if r not in static_issues
            ]
            verdict = _determine_final_verdict(
                llm_result.get("verdict", "APPROVE"),
                static_passed,
                len(all_issues),
            )
            confidence_delta = (
                -BLOCK_CONFIDENCE_DROP if verdict == "BLOCK"
                else -WARN_CONFIDENCE_DROP if verdict == "WARN"
                else 0.0
            )
            return DevilResult(
                verdict=verdict,
                reasons_against=all_issues[:8],
                alternative_code=llm_result.get("recommended_alternative"),
                missing_info=llm_result.get("missing_info_to_confirm", []),
                confidence_delta=confidence_delta,
                static_checks_passed=static_passed,
                static_issues=static_issues,
                raw_llm_response=json.dumps(llm_result, ensure_ascii=False)[:500],
                llm_check_performed=True,
            )

    # ── Только статика, LLM недоступна ──────────────────────────────
    verdict = "WARN" if not static_passed else "APPROVE"
    confidence_delta = -WARN_CONFIDENCE_DROP if not static_passed else 0.0

    return DevilResult(
        verdict=verdict,
        reasons_against=static_issues,
        alternative_code=_find_best_alternative(proposed_code, top_candidates) if not static_passed else None,
        missing_info=["LLM-проверка недоступна — выполнены только статические проверки"] if not static_passed else [],
        confidence_delta=confidence_delta,
        static_checks_passed=static_passed,
        static_issues=static_issues,
    )


# ── Статические проверки ────────────────────────────────────────────────

def _run_static_checks(
    proposed_code: str,
    top_candidates: list[dict],
    pdf_chunks: list[dict],
) -> tuple[bool, list[str]]:
    """
    Статические проверки без LLM.
    Быстро, надёжно, всегда выполняются.

    Возвращает (all_passed, list_of_issues).
    """
    issues = []
    proposed_chapter = proposed_code[:2]
    proposed_heading = proposed_code[:4]

    # 1. Код присутствует в поиске?
    candidate_codes = {c.get("code", "").strip() for c in top_candidates}
    if proposed_code not in candidate_codes:
        issues.append(
            f"КРИТИЧНО: код {proposed_code} отсутствует в результатах семантического поиска. "
            "Возможная галлюцинация LLM."
        )

    # 2. Есть ли конкурент с более высоким score?
    proposed_score = 0.0
    for c in top_candidates:
        if c.get("code", "").strip() == proposed_code:
            proposed_score = c.get("rrf_score", c.get("score", 0.0))
            break

    if proposed_score > 0:
        for c in top_candidates:
            c_score = c.get("rrf_score", c.get("score", 0.0))
            c_code  = c.get("code", "").strip()
            if c_code != proposed_code and c_score > proposed_score * 1.15:
                issues.append(
                    f"Конкурент {c_code} имеет значительно более высокий score "
                    f"({c_score:.4f} vs {proposed_score:.4f})"
                )
                break

    # 3. Проверить исключения в PDF по главе
    exclusion_hint = _check_pdf_exclusions(proposed_chapter, proposed_heading, pdf_chunks)
    if exclusion_hint:
        issues.append(exclusion_hint)

    # 4. Конкурирующие главы
    competing_chapters = _find_competing_chapters(proposed_chapter, top_candidates)
    if len(competing_chapters) >= 2:
        issues.append(
            f"Конкурирующие главы: {', '.join(sorted(competing_chapters))} — "
            "требуется уточнение основного материала/функции"
        )

    # 5. Формат кода
    if not re.match(r"^\d{10}$", proposed_code):
        issues.append(f"Неверный формат кода: '{proposed_code}' (ожидается 10 цифр)")

    all_passed = len(issues) == 0
    return all_passed, issues


def _check_pdf_exclusions(chapter: str, heading: str, pdf_chunks: list[dict]) -> Optional[str]:
    """Поискать исключения в PDF для данной главы."""
    exclusion_re = re.compile(
        r"не\s+включа(?:ются|ет(?:ся)?)|исключа(?:ются|ет(?:ся)?)|кроме|за\s+исключением",
        re.IGNORECASE
    )
    for chunk in pdf_chunks:
        text = chunk.get("text", "")
        chunk_chapter = chunk.get("chapter", "")
        if chunk_chapter == chapter and exclusion_re.search(text):
            # Найдено исключение в главе предложенного кода
            snippet = text[:120].strip()
            return f"PDF: найдено исключение в главе {chapter}: «{snippet}…»"
    return None


def _find_competing_chapters(proposed_chapter: str, top_candidates: list[dict]) -> set[str]:
    """
    Найти главы конкурирующих позиций.

    ЭВРИСТИКА: порог DEVIL_COMPETING_SCORE_RATIO (=0.80 из config).
    Конкурент = другая глава с score ≥ 80% от лучшего score в предложенной главе.
    Порог выбран эмпирически, не откалиброван.
    """
    proposed_score = 0.0
    for c in top_candidates:
        if c.get("code", "")[:2] == proposed_chapter:
            s = c.get("rrf_score", c.get("score", 0.0))
            if s > proposed_score:
                proposed_score = s

    competing = set()
    for c in top_candidates:
        ch = c.get("code", "")[:2]
        if ch and ch != proposed_chapter:
            s = c.get("rrf_score", c.get("score", 0.0))
            if proposed_score > 0 and s >= proposed_score * DEVIL_COMPETING_SCORE_RATIO:
                competing.add(ch)
    return competing


def _is_static_block(issues: list[str]) -> bool:
    """
    Статические проблемы требуют блокировки?

    ИСПРАВЛЕНИЕ v5: убрана хрупкая проверка по строке "КРИТИЧНО".
    Блокировка происходит при конкретных технических условиях:
      1. Код отсутствует в retrieval results (возможная галлюцинация LLM).
      2. Код не соответствует формату 10 цифр.

    Предупреждения (WARN, не BLOCK):
      - Конкурирующие главы
      - Конкурент с более высоким score
      - Исключения в PDF
    """
    block_keywords = [
        "отсутствует в результатах семантического поиска",
        "Неверный формат кода",
    ]
    for issue in issues:
        if any(kw in issue for kw in block_keywords):
            return True
    return False


def _find_best_alternative(proposed_code: str, top_candidates: list[dict]) -> Optional[str]:
    """Найти лучший альтернативный код."""
    best_score = 0.0
    best_code = None
    for c in top_candidates:
        code = c.get("code", "").strip()
        score = c.get("rrf_score", c.get("score", 0.0))
        if code != proposed_code and score > best_score:
            best_score = score
            best_code = code
    return best_code


# ── LLM-проверка ────────────────────────────────────────────────────────

def _run_llm_check(
    proposed_code: str,
    product_description: str,
    top_candidates: list[dict],
    pdf_chunks: list[dict],
    ollama_client,
    model: str,
) -> Optional[dict]:
    """
    Второй вызов LLM с противоположным промптом.
    Возвращает dict или None при ошибке.
    """
    prompt = _build_adversarial_prompt(
        proposed_code, product_description, top_candidates, pdf_chunks
    )
    system = _ADVERSARIAL_SYSTEM_PROMPT

    try:
        resp = ollama_client.chat(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            options={
                "temperature": DEVIL_TEMPERATURE,
                "num_predict": DEVIL_MAX_TOKENS,
            },
        )
        raw = resp["message"]["content"].strip()
        return _parse_devil_response(raw)
    except Exception as e:
        logger.warning(f"Devil advocate LLM call failed: {e}")
        return None


def _build_adversarial_prompt(
    proposed_code: str,
    product_description: str,
    top_candidates: list[dict],
    pdf_chunks: list[dict],
) -> str:
    """Построить противоположный промпт — задача найти ПРОБЛЕМЫ."""
    # Топ-5 альтернативных кодов
    alternatives = [
        f"  {c.get('code')} — {c.get('description', '')[:80]} (score={c.get('rrf_score', 0):.3f})"
        for c in top_candidates[:5]
        if c.get("code", "").strip() != proposed_code
    ]

    # PDF с исключениями
    pdf_context = ""
    for chunk in pdf_chunks[:4]:
        text = chunk.get("text", "")[:200]
        page = chunk.get("page_num", chunk.get("page", "?"))
        pdf_context += f"\n[PDF глава {chunk.get('chapter','?')} стр.{page}]: {text}"

    return f"""ТОВАР ДЛЯ ПРОВЕРКИ:
{product_description}

ПРЕДЛОЖЕННЫЙ КОД: {proposed_code}

АЛЬТЕРНАТИВНЫЕ КОДЫ (от системы поиска):
{chr(10).join(alternatives) if alternatives else "  нет альтернатив"}

ИЗВЛЕЧЁННЫЕ ПРАВИЛА И ПРИМЕЧАНИЯ ИЗ ТН ВЭД:
{pdf_context if pdf_context else "  PDF не загружены"}

ЗАДАЧА: Найди причины, по которым код {proposed_code} может быть НЕВЕРНЫМ.
Проверь:
1. Нарушает ли этот код какое-либо примечание или исключение из приведённого контекста?
2. Есть ли более конкретная позиция среди альтернатив?
3. Указывает ли описание товара на другую главу (материал, функция, назначение)?
4. Есть ли неоднозначности в описании, которые делают классификацию ненадёжной?

Если противоречий нет — ответь APPROVE."""


_ADVERSARIAL_SYSTEM_PROMPT = """Ты — таможенный аудитор с 20-летним опытом.
Твоя задача — ОСПОРИТЬ классификацию, найти её слабые места.

ВАЖНО: ты НЕ помогаешь классифицировать. Ты ищешь ОШИБКИ.

Отвечай строго в JSON:
{
  "verdict": "APPROVE" | "WARN" | "BLOCK",
  "reasons_against": ["причина 1", "причина 2"],
  "recommended_alternative": null | "XXXXXXXXXX",
  "missing_info_to_confirm": ["что нужно уточнить"]
}

Вердикты:
  APPROVE — противоречий нет, код подтверждён
  WARN    — есть сомнения, но код приемлем с оговорками
  BLOCK   — серьёзное нарушение правил ТН ВЭД, код неверен

Отвечай ТОЛЬКО JSON без markdown."""


def _parse_devil_response(raw: str) -> Optional[dict]:
    """Разобрать ответ LLM-аудитора."""
    # Убрать markdown
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Найти JSON
    json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not json_match:
        logger.warning(f"Devil: no JSON in response: {raw[:200]}")
        return None
    try:
        data = json.loads(json_match.group())
        # Валидация
        if "verdict" not in data:
            data["verdict"] = "WARN"
        if data["verdict"] not in ("APPROVE", "WARN", "BLOCK"):
            data["verdict"] = "WARN"
        data.setdefault("reasons_against", [])
        data.setdefault("recommended_alternative", None)
        data.setdefault("missing_info_to_confirm", [])
        return data
    except json.JSONDecodeError:
        # Попытка восстановить
        try:
            fixed = cleaned.rstrip() + '"}}'
            data = json.loads(fixed)
            data.setdefault("verdict", "WARN")
            return data
        except Exception:
            logger.warning(f"Devil: failed to parse JSON: {raw[:200]}")
            return None


def _determine_final_verdict(
    llm_verdict: str,
    static_passed: bool,
    total_issues: int,
) -> str:
    """Определить итоговый вердикт с учётом обоих проверок."""
    if llm_verdict == "BLOCK":
        return "BLOCK"
    if not static_passed and total_issues >= 2:
        return "BLOCK"
    if llm_verdict == "WARN" or not static_passed:
        return "WARN"
    return "APPROVE"
