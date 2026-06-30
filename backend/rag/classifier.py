"""
classifier.py v5 — Промышленный модуль классификации ТН ВЭД ЕАЭС.

Pipeline v4 (14 шагов):
  Шаг  1: Разбор описания и проверка входных данных
  Шаг  2: Извлечение признаков товара (ProductFeatureExtractor)
  Шаг  3: Определение chapter_hint из признаков
  Шаг  4: Hybrid Retrieval (BM25+dense, top-20) — все источники
  Шаг  5: TOP-20 → TOP-10 кандидатов с программным анализом
  Шаг  6: Первичная LLM классификация (с полным контекстом)
  Шаг  7: Evidence Builder — документальная база для каждого утверждения
  Шаг  8: Rule Engine — ОПИ 1–6 как Python-объекты с журналом
  Шаг  9: Validator — формат, галлюцинация-защита, исключения, конкуренты
  Шаг 10: Devil Advocate — независимый модуль опровержения
  Шаг 11: Независимая LLM верификация (если Devil WARN или BLOCK)
  Шаг 12: Финальный порог уверенности
  Шаг 13: Отказ или Ответ
  Шаг 14: Компиляция журнала решений (explainability)

Запреты (архитектурные ограничения):
  - LLM не может выдумать код — он обязан присутствовать в search results
  - Нельзя возвращать код при confidence < MIN_CONFIDENCE_TO_ANSWER
  - Нельзя игнорировать Devil BLOCK без явного override
  - if/else/keyword-matching — не основная логика, только вспомогательная
"""

from __future__ import annotations
import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from .retriever    import HybridRetriever, get_retriever
from .llm_client   import classify_with_llm, LLMResponse
from .validator    import validate_classification, ValidationResult
# АРХИТЕКТУРНОЕ РЕШЕНИЕ v5:
# opi_checker.py (v3) УДАЛЁН из pipeline. Используется ТОЛЬКО rule_engine.py (v5).
# Причина: дублирование логики давало артефакт — усреднение двух независимых delta
# (строка "combined_opi_delta = (opi_delta + rule_delta) / 2") снижало вес каждого
# правила вдвое без обоснования. Теперь один источник OPI-вердиктов.
from .evidence_builder import build_evidence, build_refusal_questions, Evidence
from .devil_advocate         import check_classification as devil_check, DevilResult
from .rule_engine            import run_rule_engine, RuleEngineReport, FullOPIReport
from .product_feature_extractor import extract_features, ProductFeatures

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

logger = logging.getLogger(__name__)

try:
    from config import (
        MIN_CONFIDENCE_TO_ANSWER,
        RETRIEVAL_TOP_K,
        TOP_N_CANDIDATES,
        DEFAULT_LLM_MODEL,
    )
except ImportError:
    MIN_CONFIDENCE_TO_ANSWER = 0.45
    RETRIEVAL_TOP_K = 20
    TOP_N_CANDIDATES = 10
    DEFAULT_LLM_MODEL = "qwen2.5:7b-instruct-q4_K_M"

# Флаги поведения (не меняются без пересмотра архитектуры)
DEVIL_BLOCK_OVERRIDE = True   # devil BLOCK всегда = отказ
EVIDENCE_REQUIRED    = True   # недостаточные доказательства = отказ


# ── Типы данных ──────────────────────────────────────────────────────────

@dataclass
class CandidateAnalysis:
    """Анализ одного кода-кандидата из TOP-10."""
    rank: int
    code: str
    description: str
    chapter: str
    rrf_score: float
    reasons_for: list[str]
    reasons_against: list[str]
    opi_note: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "rank": self.rank,
            "code": self.code,
            "description": self.description[:120],
            "chapter": self.chapter,
            "rrf_score": round(self.rrf_score, 4),
            "reasons_for": self.reasons_for,
            "reasons_against": self.reasons_against,
            "opi_note": self.opi_note,
        }


@dataclass
class ClassificationResult:
    """Итоговый результат классификации."""
    # Основной результат
    code: Optional[str]
    confidence: float
    requires_clarification: bool
    clarification_message: Optional[str]
    clarification_questions: list[str]

    # TOP-10 анализ
    top10_candidates: list[CandidateAnalysis]

    # Доказательства
    evidence: Optional[Evidence]

    # OPI / Rule Engine
    opi_report: Optional[FullOPIReport]
    rule_engine_report: Optional[RuleEngineReport] = None
    product_features: Optional[ProductFeatures] = None

    # Аудит второго мнения
    devil_result: Optional[DevilResult]

    # Первичная LLM
    llm_response: Optional[LLMResponse]
    validation_result: Optional[ValidationResult]

    # Метаданные
    reasoning: str
    sources_used: list[str]
    opi_rule_applied: str
    processing_time_ms: int
    audit_trail: list[dict]

    def to_dict(self, include_audit: bool = False) -> dict:
        base = {
            "code": self.code,
            "confidence": round(self.confidence, 3),
            "requires_clarification": self.requires_clarification,
            "clarification_message": self.clarification_message,
            "clarification_questions": self.clarification_questions,
            "reasoning": self.reasoning,
            "opi_rule_applied": self.opi_rule_applied,
            "sources_used": self.sources_used,
            "processing_time_ms": self.processing_time_ms,
            "top10_candidates": [c.to_dict() for c in self.top10_candidates],
            "evidence": self.evidence.to_dict() if self.evidence else None,
            "devil_advocate": self.devil_result.to_dict() if self.devil_result else None,
            "opi_checks": self.opi_report.to_dict() if self.opi_report else None,
            "rule_engine": self.rule_engine_report.to_dict() if self.rule_engine_report else None,
            "product_features": self.product_features.to_dict() if self.product_features else None,
        }
        if include_audit:
            base["audit_trail"] = self.audit_trail
        return base


# ── Главная функция ──────────────────────────────────────────────────────

def classify(
    description: str,
    chapter_hint: Optional[str] = None,
    include_audit: bool = False,
    model: str = "qwen2.5:7b-instruct-q4_K_M",
) -> ClassificationResult:
    """
    Классифицировать товар по ТН ВЭД ЕАЭС.

    Args:
        description:   Описание товара (обязательно)
        chapter_hint:  Подсказка главы (опционально)
        include_audit: Включить полный audit trail в ответ
        model:         LLM-модель

    Returns:
        ClassificationResult
    """
    start_ms = int(time.time() * 1000)
    audit: list[dict] = []
    description = description.strip()

    def _stamp(step: str, data: dict) -> None:
        audit.append({"step": step, "ts_ms": int(time.time() * 1000) - start_ms, **data})

    # ── Шаг 1: Разбор и проверка входных данных ─────────────────────
    if not description or len(description) < 5:
        return _error_result("Описание товара слишком короткое", start_ms, audit)
    _stamp("input", {"description_len": len(description), "chapter_hint": chapter_hint})

    # ── Шаг 2: Извлечение признаков товара (без LLM) ─────────────────
    features = extract_features(description)
    _stamp("feature_extraction", {
        "materials": features.materials,
        "functions": features.functions,
        "dominant_chapter": features.dominant_chapter,
        "standards": features.standards,
        "missing": features.missing_for_classification,
    })

    # ── Шаг 3: Определить boost_chapter ───────────────────────────────
    # Приоритет: явный chapter_hint от пользователя > features.dominant_chapter
    # Мягкий буст (×1.15 в retriever), НИКОГДА не фильтр/исключение
    boost_chapter = chapter_hint or features.dominant_chapter
    _stamp("chapter_hint", {"boost_chapter": boost_chapter, "source":
        "user" if chapter_hint else ("features" if features.dominant_chapter else "none")})

    # ── Шаг 4: Hybrid Retrieval (BM25+dense, top-20) ─────────────────
    try:
        retriever = get_retriever()           # singleton с initialized BM25
        retrieved = retriever.retrieve(
            query=description,
            top_k=RETRIEVAL_TOP_K,
            boost_chapter=boost_chapter,
        )
    except Exception as e:
        logger.error(f"Retriever failed: {e}")
        return _error_result(f"Ошибка поиска: {e}", start_ms, audit)

    codes      = retrieved.get("codes", [])
    pdf_chunks = retrieved.get("pdf_chunks", [])
    _stamp("retrieval", {"codes_found": len(codes), "pdf_chunks_found": len(pdf_chunks)})

    if not codes:
        return _clarification_result(
            "База данных пуста или не найдено подходящих позиций",
            ["Загрузите данные ТН ВЭД (запустите build_knowledge_base.py)"],
            [], None, None, None, start_ms, audit
        )

    # ── Шаг 5: TOP-10 анализ (без LLM) ──────────────────────────────────
    top10 = _analyze_top10(codes[:TOP_N_CANDIDATES], description, pdf_chunks)
    _stamp("top10_analysis", {"candidates": [c.code for c in top10]})

    # ── Шаг 6: Первичная LLM классификация ──────────────────────────────
    try:
        llm_resp: LLMResponse = classify_with_llm(
            description=description,
            retrieved_codes=codes,
            retrieved_pdf_chunks=pdf_chunks,
            model=model,
        )
    except Exception as e:
        logger.error(f"LLM failed: {e}")
        return _clarification_result(
            f"LLM недоступна: {e}",
            ["Запустите Ollama: ollama serve"],
            top10, None, None, None, start_ms, audit
        )

    _stamp("llm_primary", {
        "proposed_code": llm_resp.code,
        "raw_confidence": llm_resp.confidence,
        "requires_clarification": llm_resp.requires_clarification,
    })

    # ── Шаг 6а: Ранний выход если LLM не уверена ────────────────────────
    if llm_resp.requires_clarification or not llm_resp.code:
        missing = llm_resp.missing_information or []
        questions = build_refusal_questions(
            Evidence(proposed_code=""), top10[:5], description  # type: ignore[arg-type]
        )
        return _clarification_result(
            llm_resp.clarification_message or "LLM запросила уточнение",
            questions,
            top10, None, None, None, start_ms, audit
        )

    proposed_code = llm_resp.code
    raw_confidence = llm_resp.confidence

    # ── Шаг 7: Evidence Builder ──────────────────────────────────────────
    evidence = build_evidence(
        proposed_code=proposed_code,
        retrieved_codes=codes,
        retrieved_pdf_chunks=pdf_chunks,
        product_description=description,
    )
    _stamp("evidence", {
        "excel_records": len(evidence.excel_records),
        "pdf_chunks": len(evidence.pdf_chunks),
        "evidence_score": evidence.evidence_score,
        "is_sufficient": evidence.is_sufficient,
    })

    if EVIDENCE_REQUIRED and not evidence.is_sufficient:
        questions = build_refusal_questions(evidence, codes[:5], description)
        return _clarification_result(
            "Недостаточно документальных доказательств для выбранного кода: "
            + "; ".join(evidence.insufficiency_reasons),
            questions + evidence.missing_information,
            top10, evidence, None, None, start_ms, audit
        )

    # ── Шаг 8: Rule Engine (ОПИ 1–6 как Python-объекты) ─────────────────
    # v5: используется ТОЛЬКО rule_engine.py. opi_checker.py удалён из pipeline.
    # Причина: см. комментарий к импортам выше.
    rule_engine_report = run_rule_engine(
        proposed_code=proposed_code,
        product_description=description,
        top_candidates=codes[:10],
        pdf_chunks=pdf_chunks,
    )
    _stamp("rule_engine", {
        "verdict": rule_engine_report.overall_verdict.value,
        "primary_rule": rule_engine_report.primary_rule,
        "delta": rule_engine_report.total_confidence_delta,
        "rules_applied": rule_engine_report.rules_applied,
        "rules_skipped": rule_engine_report.rules_skipped,
        "blocking_issues": rule_engine_report.blocking_issues,
        "heuristics_used": rule_engine_report.heuristics_used,
    })

    # Rule Engine delta применяется непосредственно к raw_confidence
    adj_confidence_opi = min(1.0, max(0.0,
        raw_confidence + rule_engine_report.total_confidence_delta
    ))

    # Если Rule Engine нашёл блокирующие проблемы — ранний отказ
    if rule_engine_report.blocking_issues:
        questions = build_refusal_questions(evidence, codes[:5], description)
        return _clarification_result(
            "Rule Engine обнаружил блокирующие проблемы: "
            + "; ".join(rule_engine_report.blocking_issues[:2]),
            questions,
            top10, evidence, None, None, start_ms, audit
        )

    # ── Шаг 9: Validator ─────────────────────────────────────────────────
    validation = validate_classification(
        proposed_code=proposed_code,
        raw_confidence=adj_confidence_opi,
        product_description=description,
        retrieved_codes=codes,
        pdf_chunks=pdf_chunks,
    )
    _stamp("validation", {
        "passed": validation.passed,
        "adjusted_confidence": validation.adjusted_confidence,
        "issues": validation.issues,
        "warnings": validation.warnings,
    })

    if not validation.passed:
        questions = build_refusal_questions(evidence, codes[:5], description)
        return _clarification_result(
            "Валидация не пройдена: " + "; ".join(validation.issues),
            questions,
            top10, evidence, None, None, start_ms, audit
        )

    adj_confidence = validation.adjusted_confidence

    # ── Шаг 10: Devil Advocate (независимое опровержение) ───────────────
    # Попытаться подключить Ollama клиент для adversarial LLM проверки
    _ollama_client = None
    try:
        import ollama as _ollama_mod
        _ollama_client = _ollama_mod
    except Exception:
        logger.warning("Ollama не доступен — devil advocate работает только в статическом режиме")

    devil = devil_check(
        proposed_code=proposed_code,
        product_description=description,
        top_candidates=codes[:10],
        pdf_chunks=pdf_chunks,
        ollama_client=_ollama_client,
        model=model,
    )
    _stamp("devil_advocate", {
        "verdict": devil.verdict,
        "issues": devil.reasons_against,
        "confidence_delta": devil.confidence_delta,
    })

    adj_confidence_final = max(0.0, adj_confidence + devil.confidence_delta)

    if DEVIL_BLOCK_OVERRIDE and devil.blocks:
        questions = build_refusal_questions(evidence, codes[:5], description)
        return _clarification_result(
            "Независимая проверка обнаружила серьёзные противоречия: "
            + "; ".join(devil.reasons_against[:2]),
            questions,
            top10, evidence, None, devil, start_ms, audit
        )

    # ── Шаг 11: Независимая LLM верификация (при WARN) ────────────────────
    # При Devil WARN — второй LLM-запрос для независимого подтверждения
    secondary_verification = None
    if devil.verdict == "WARN" and _ollama_client is not None:
        try:
            secondary = classify_with_llm(
                description=description,
                retrieved_codes=codes,
                retrieved_pdf_chunks=pdf_chunks,
                model=model,
                extra_context=(
                    f"ВНИМАНИЕ: Первичный анализ предложил код {proposed_code}, "
                    f"но независимая проверка обнаружила сомнения: "
                    + "; ".join(devil.reasons_against[:2]) +
                    f". Перепроверьте код."
                ),
            )
            secondary_verification = secondary
            _stamp("independent_verification", {
                "secondary_code": secondary.code,
                "secondary_confidence": secondary.confidence,
                "agrees": secondary.code == proposed_code,
            })
            # Если независимый LLM предлагает другой код — снизить уверенность
            if secondary.code and secondary.code != proposed_code:
                adj_confidence_final = adj_confidence_final * 0.7
                logger.warning(
                    f"Independent LLM suggests {secondary.code} vs primary {proposed_code}. "
                    f"Lowering confidence to {adj_confidence_final:.2f}"
                )
        except Exception as e:
            logger.debug(f"Secondary verification skipped: {e}")

    # ── Шаг 12: Финальный порог уверенности ─────────────────────────────
    if adj_confidence_final < MIN_CONFIDENCE_TO_ANSWER:
        questions = build_refusal_questions(evidence, codes[:5], description)
        return _clarification_result(
            f"Недостаточная уверенность: {adj_confidence_final:.2f} "
            f"(порог {MIN_CONFIDENCE_TO_ANSWER}). "
            f"Проблемы: {'; '.join(devil.reasons_against[:1] + validation.warnings[:1])}",
            questions,
            top10, evidence, None, devil, start_ms, audit
        )

    # ── Шаг 13: Успешный ответ (Шаг 14 = журнал решений в audit_trail) ──
    sources = _collect_sources(evidence)
    _stamp("success", {"final_code": proposed_code, "final_confidence": adj_confidence_final})

    return ClassificationResult(
        code=proposed_code,
        confidence=adj_confidence_final,
        product_features=features,
        rule_engine_report=rule_engine_report,
        requires_clarification=False,
        clarification_message=None,
        clarification_questions=[],
        top10_candidates=top10,
        evidence=evidence,
        opi_report=None,        # v5: opi_checker удалён, используется rule_engine
        devil_result=devil,
        llm_response=llm_resp,
        validation_result=validation,
        reasoning=llm_resp.reasoning or "",
        sources_used=sources,
        opi_rule_applied=rule_engine_report.primary_rule,  # v5: из rule_engine
        processing_time_ms=int(time.time() * 1000) - start_ms,
        audit_trail=audit,
    )


# ── TOP-10 анализ ────────────────────────────────────────────────────────

def _analyze_top10(
    candidates: list[dict],
    description: str,
    pdf_chunks: list[dict],
) -> list[CandidateAnalysis]:
    """
    Программный анализ топ-10 кандидатов.
    Для каждого: причины выбора + причины отклонения.
    Без вызова LLM.
    """
    import re as _re
    desc_tokens = set(_re.findall(r"[а-яёa-z]{3,}", description.lower()))

    # Главы всех кандидатов
    chapter_counts: dict[str, int] = {}
    for c in candidates:
        ch = c.get("chapter", c.get("code", "")[:2])
        chapter_counts[ch] = chapter_counts.get(ch, 0) + 1
    dominant_chapter = max(chapter_counts, key=lambda k: chapter_counts[k]) if chapter_counts else ""

    # Максимальный score для нормализации
    max_score = max((c.get("rrf_score", c.get("score", 0)) for c in candidates), default=1.0)

    results = []
    for i, c in enumerate(candidates[:TOP_N_CANDIDATES]):
        code  = c.get("code", "")
        desc  = c.get("description", "")
        ch    = c.get("chapter", code[:2])
        score = c.get("rrf_score", c.get("score", 0.0))

        # Токены наименования кода
        code_tokens = set(_re.findall(r"[а-яёa-z]{3,}", desc.lower()))
        overlap = len(desc_tokens & code_tokens)

        reasons_for  = []
        reasons_against = []

        # Причины ЗА
        if i == 0:
            reasons_for.append(f"Наивысший поисковый score: {score:.4f}")
        if ch == dominant_chapter and chapter_counts.get(ch, 0) >= 2:
            reasons_for.append(f"Преобладающая глава среди кандидатов: {ch}")
        if overlap >= 3:
            reasons_for.append(f"Высокое пересечение терминов с описанием: {overlap} совпадений")
        if c.get("chapter_boosted"):
            reasons_for.append("Подтверждена подсказка главы (soft boost)")
        if score >= max_score * 0.90:
            reasons_for.append(f"Score ≥ 90% от лучшего ({score/max_score*100:.0f}%)")
        if not reasons_for:
            reasons_for.append(f"Найден в гибридном поиске (BM25+dense), rank={i+1}")

        # Причины ПРОТИВ
        if i > 0:
            top_score = max_score
            reasons_against.append(
                f"Score {score:.4f} на {(1 - score/top_score)*100:.0f}% ниже лидера"
            )
        if ch != dominant_chapter and chapter_counts.get(dominant_chapter, 0) >= 2:
            reasons_against.append(
                f"Глава {ch} менее представлена, чем {dominant_chapter}"
            )
        # Проверить исключения из PDF
        for chunk in pdf_chunks[:3]:
            chunk_ch = chunk.get("chapter", "")
            if chunk_ch == ch:
                text = chunk.get("text", "").lower()
                if any(w in text for w in ["не включа", "исключа", "кроме"]):
                    reasons_against.append(f"PDF: возможное исключение в главе {ch}")
                    break
        if not reasons_against and i > 0:
            reasons_against.append("Ниже по рейтингу — отклонён в пользу более высокого score")

        results.append(CandidateAnalysis(
            rank=i + 1,
            code=code,
            description=desc,
            chapter=ch,
            rrf_score=score,
            reasons_for=reasons_for[:3],
            reasons_against=reasons_against[:3],
        ))

    return results


# ── Вспомогательные функции ──────────────────────────────────────────────
# REMOVED v5: _suggest_chapter_embedding — была определена, но никогда не вызывалась.
# Dead code удалён при аудите. Если понадобится — восстановить из git.


def _collect_sources(evidence: Evidence) -> list[str]:
    """Собрать список источников для ответа."""
    sources = []
    for r in evidence.excel_records[:3]:
        sources.append(f"Excel ТН ВЭД: {r.code} — {r.description[:60]}")
    for c in evidence.pdf_chunks[:3]:
        sources.append(f"PDF {c.source_file} стр.{c.page}")
    for n in evidence.notes_found[:2]:
        sources.append(f"Примечание ({n.note_type}): {n.source}")
    return sources


def _clarification_result(
    message: str,
    questions: list[str],
    top10: list[CandidateAnalysis],
    evidence: Optional[Evidence],
    opi_report: Optional[FullOPIReport],
    devil: Optional[DevilResult],
    start_ms: int,
    audit: list[dict],
) -> ClassificationResult:
    return ClassificationResult(
        code=None,
        confidence=0.0,
        requires_clarification=True,
        clarification_message=message,
        clarification_questions=list(dict.fromkeys(questions)),  # дедупликация
        top10_candidates=top10,
        evidence=evidence,
        opi_report=opi_report,
        devil_result=devil,
        llm_response=None,
        validation_result=None,
        reasoning="",
        sources_used=[],
        opi_rule_applied="",
        processing_time_ms=int(time.time() * 1000) - start_ms,
        audit_trail=audit,
    )


def _error_result(message: str, start_ms: int, audit: list[dict]) -> ClassificationResult:
    return ClassificationResult(
        code=None,
        confidence=0.0,
        requires_clarification=True,
        clarification_message=f"Ошибка: {message}",
        clarification_questions=[],
        top10_candidates=[],
        evidence=None,
        opi_report=None,
        devil_result=None,
        llm_response=None,
        validation_result=None,
        reasoning="",
        sources_used=[],
        opi_rule_applied="",
        processing_time_ms=int(time.time() * 1000) - start_ms,
        audit_trail=audit,
    )
