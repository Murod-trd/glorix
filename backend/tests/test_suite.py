"""
tests/test_suite.py — Автоматическое тестирование ТН ВЭД классификатора.

Набор: 15 товаров с известными правильными кодами ТН ВЭД ЕАЭС.
Проверяет первые N цифр кода (prefix-совпадение), так как
точная субпозиция зависит от данных пользователя.

Статусы:
  PASS         — код начинается с ожидаемого префикса
  FAIL         — код получен, но не соответствует ожидаемому
  CLARIFICATION — система запросила уточнения (нет кода)
  ERROR        — исключение при вызове classify()

Запуск:
  cd backend && python tests/test_suite.py
  python tests/test_suite.py --model phi3.5 --output report.json
"""

from __future__ import annotations
import sys
import time
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from rag.classifier import classify


# ── Адаптер совместимости classify() → dict ──────────────────────────────────
# classify() возвращает ClassificationResult (dataclass), а не dict.
# Этот адаптер нормализует оба варианта на случай будущих изменений.
def _normalize_classify_result(result):
    if isinstance(result, dict):
        return {
            "code": result.get("recommended_code") or result.get("code"),
            "confidence": float(result.get("confidence", 0.0)),
            "requires_clarification": bool(result.get("requires_clarification", False)),
            "warnings": (result.get("validation") or {}).get("warnings", []),
            "questions": result.get("clarification_questions", []) or [],
            "reasoning": result.get("reasoning", "") or "",
        }
    validation = getattr(result, "validation_result", None)
    return {
        "code": getattr(result, "code", None),
        "confidence": float(getattr(result, "confidence", 0.0)),
        "requires_clarification": bool(getattr(result, "requires_clarification", False)),
        "warnings": getattr(validation, "warnings", []) if validation else [],
        "questions": getattr(result, "clarification_questions", []) or [],
        "reasoning": getattr(result, "reasoning", "") or "",
    }

# ── Тест-набор ────────────────────────────────────────────────────────
# (описание, ожидаемый_префикс_кода, комментарий)
TEST_CASES: list[tuple[str, str, str]] = [
    (
        "Болт крепёжный стальной с шестигранной головкой М10×30мм, оцинкованный, класс прочности 8.8",
        "7318",
        "Болты стальные",
    ),
    (
        "Гайка шестигранная стальная М10, оцинкованная, DIN 934",
        "7318",
        "Гайки стальные",
    ),
    (
        "Смартфон Samsung Galaxy A54 5G, 128GB, экран 6.4\", Android 13",
        "8517",
        "Смартфоны",
    ),
    (
        "Ноутбук HP EliteBook 840 G10, Intel Core i7-1355U, 16GB RAM, 512GB SSD, 14\"",
        "8471",
        "Ноутбуки / портативные компьютеры",
    ),
    (
        "Водка «Absolut» 40% алк., бутылка 0.5 литра, Швеция",
        "2208",
        "Водка / дистиллированные спиртные напитки",
    ),
    (
        "Нефть сырая из Тенгизского месторождения, плотность 0.845 г/см³, сернистая",
        "2709",
        "Нефть сырая",
    ),
    (
        "Пшеница мягкая продовольственная 3-го класса, влажность 14%, 2024 урожай",
        "1001",
        "Пшеница",
    ),
    (
        "Ферросилиций с содержанием кремния 75%, в слитках",
        "7202",
        "Ферросплавы / ферросилиций",
    ),
    (
        "Пробки корковые натуральные для бутылок, обработанные, диаметр 24мм, длина 44мм",
        "4501",
        "Натуральная пробка / изделия из пробки",
    ),
    (
        "Ткань хлопчатобумажная отбелённая, полотняное переплетение, поверхностная плотность 185 г/м², ширина 150 см",
        "5208",
        "Хлопчатобумажная ткань < 200 г/м²",
    ),
    (
        "Таблетки парацетамол 500мг №20, расфасованы для розничной продажи, жаропонижающее",
        "3004",
        "Лекарства расфасованные для розничной продажи",
    ),
    (
        "Кофе натуральный жареный молотый, арабика 100%, 250 г, вакуумная упаковка",
        "0901",
        "Кофе жареный",
    ),
    (
        "Кабель силовой медный ВВГ 3×2.5 мм², напряжение 0.66 кВ, ГОСТ 16442, длина 100 м",
        "8544",
        "Изолированные провода и кабели",
    ),
    (
        "Трансформатор силовой масляный трёхфазный 160 кВА, напряжение 10/0.4 кВ",
        "8504",
        "Силовые трансформаторы",
    ),
    (
        "Квасцы алюмокалиевые (алюминиево-калиевые), технические, KAl(SO4)2·12H2O, мешки по 50 кг",
        "2833",
        "Квасцы / сульфаты алюминия",
    ),
]


@dataclass
class TestResult:
    description: str
    expected_prefix: str
    comment: str
    status: str            # PASS / FAIL / CLARIFICATION / ERROR
    got_code: Optional[str] = None
    confidence: float = 0.0
    elapsed_sec: float = 0.0
    reasoning_preview: str = ""
    clarification_questions: list[str] = field(default_factory=list)
    validation_warnings: list[str] = field(default_factory=list)
    error: str = ""


def run_tests(
    model: str = "qwen2.5:7b-instruct-q4_K_M",
    verbose: bool = True,
) -> dict:
    """
    Запустить все тесты. Возвращает отчёт.

    Args:
        model: Ollama-модель
        verbose: Печатать прогресс в stdout

    Returns:
        Словарь с результатами и метриками.
    """
    test_results: list[TestResult] = []
    counts = {"pass": 0, "fail": 0, "clarification": 0, "error": 0}

    if verbose:
        print("=" * 65)
        print(f"  ТН ВЭД КЛАССИФИКАТОР — АВТОМАТИЧЕСКИЙ ТЕСТ ({len(TEST_CASES)} товаров)")
        print(f"  Модель: {model}")
        print("=" * 65)

    for i, (description, expected_prefix, comment) in enumerate(TEST_CASES, 1):
        if verbose:
            print(f"\n[{i:02d}/{len(TEST_CASES)}] {comment}")
            print(f"  Товар: {description[:70]}...")

        t0 = time.time()
        try:
            result = classify(description, model=model)
            elapsed = round(time.time() - t0, 1)

            normalized = _normalize_classify_result(result)
            code       = normalized["code"]
            confidence = normalized["confidence"]
            requires   = normalized["requires_clarification"]
            warnings   = normalized["warnings"]
            questions  = normalized["questions"]

            if requires or code is None:
                status = "CLARIFICATION"
                counts["clarification"] += 1
            elif code.startswith(expected_prefix):
                status = "PASS"
                counts["pass"] += 1
            else:
                status = "FAIL"
                counts["fail"] += 1

            tr = TestResult(
                description=description[:80],
                expected_prefix=expected_prefix,
                comment=comment,
                status=status,
                got_code=code,
                confidence=confidence,
                elapsed_sec=elapsed,
                reasoning_preview=normalized["reasoning"][:200],
                clarification_questions=questions[:2],
                validation_warnings=warnings[:2],
            )

            if verbose:
                icon = {"PASS": "✓", "FAIL": "✗", "CLARIFICATION": "?"}[status]
                print(f"  {icon} {status}: {code or '(нет)'} "
                      f"(ожидалось {expected_prefix}*) | "
                      f"conf={confidence:.0%} | {elapsed}с")
                if status == "CLARIFICATION" and questions:
                    print(f"    Вопрос: {questions[0][:80]}")
                if warnings:
                    print(f"    ⚠ {warnings[0][:80]}")

        except Exception as e:
            elapsed = round(time.time() - t0, 1)
            counts["error"] += 1
            tr = TestResult(
                description=description[:80],
                expected_prefix=expected_prefix,
                comment=comment,
                status="ERROR",
                elapsed_sec=elapsed,
                error=str(e)[:300],
            )
            if verbose:
                print(f"  ✗ ERROR: {e}")

        test_results.append(tr)

    # ── Итоги ─────────────────────────────────────────────────────────
    total    = len(TEST_CASES)
    passed   = counts["pass"]
    accuracy = passed / total * 100 if total > 0 else 0.0

    if verbose:
        print("\n" + "=" * 65)
        print("  ИТОГОВЫЙ ОТЧЁТ")
        print("=" * 65)
        print(f"  Всего тестов:       {total}")
        print(f"  ✓ PASS:             {passed}")
        print(f"  ✗ FAIL:             {counts['fail']}")
        print(f"  ? CLARIFICATION:    {counts['clarification']}")
        print(f"  ✗ ERROR:            {counts['error']}")
        print(f"  Точность (PASS/%):  {accuracy:.1f}%")
        print("=" * 65)

        fails = [r for r in test_results if r.status in ("FAIL", "ERROR")]
        if fails:
            print("\n  ПРОВАЛИВШИЕСЯ ТЕСТЫ:")
            for r in fails:
                print(f"    [{r.status}] {r.comment}")
                print(f"      Ожидалось: {r.expected_prefix}*")
                print(f"      Получено:  {r.got_code or 'N/A'}")
                if r.status == "FAIL" and r.reasoning_preview:
                    print(f"      Рассуждение: {r.reasoning_preview[:100]}")
                if r.error:
                    print(f"      Ошибка: {r.error[:100]}")

        clarifs = [r for r in test_results if r.status == "CLARIFICATION"]
        if clarifs:
            print("\n  ЗАПРОСЫ УТОЧНЕНИЙ (не ошибка — система отказалась гадать):")
            for r in clarifs:
                print(f"    [?] {r.comment}")
                if r.clarification_questions:
                    print(f"       Вопрос: {r.clarification_questions[0][:80]}")

    return {
        "model": model,
        "total": total,
        "passed": passed,
        "failed": counts["fail"],
        "clarification_requested": counts["clarification"],
        "errors": counts["error"],
        "accuracy_percent": round(accuracy, 1),
        "summary": (
            f"Точность: {passed}/{total} ({accuracy:.1f}%) | "
            f"Уточнения: {counts['clarification']} | "
            f"Ошибки: {counts['error']}"
        ),
        "details": [
            {
                "comment": r.comment,
                "description": r.description,
                "expected_prefix": r.expected_prefix,
                "got_code": r.got_code,
                "confidence": r.confidence,
                "status": r.status,
                "elapsed_sec": r.elapsed_sec,
                "reasoning_preview": r.reasoning_preview,
                "clarification_questions": r.clarification_questions,
                "validation_warnings": r.validation_warnings,
                "error": r.error,
            }
            for r in test_results
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Тест ТН ВЭД классификатора")
    parser.add_argument(
        "--model", default="qwen2.5:7b-instruct-q4_K_M",
        help="Ollama-модель"
    )
    parser.add_argument(
        "--output", default=None,
        help="Сохранить JSON-отчёт в файл"
    )
    parser.add_argument(
        "--quiet", action="store_true",
        help="Не выводить прогресс (только итоги)"
    )
    args = parser.parse_args()

    report = run_tests(model=args.model, verbose=not args.quiet)

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nОтчёт сохранён: {out_path.resolve()}")
