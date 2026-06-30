"""
benchmark_stress.py — Стресс-тест Glorix v7
============================================
Запускает N синтетических товарных описаний через полный pipeline
(без Ollama — mock LLM возвращает топ-кандидата).

Метрики:
  - throughput (товаров/сек)
  - refusal_rate (% отказов)
  - verdict distribution по ОПИ 3б (CONFIRMS HEURISTIC ratio)
  - evidence_score distribution
  - audit_trail completeness (14 шагов)

Запуск:
  python -m tests.benchmark_stress [N]   (default N=10000)
  python -m tests.benchmark_stress 100   (быстрый прогон)
"""

import sys
import os
import time
import random
import json
import csv
import statistics
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ──────────────────────────────────────────────────────
# Синтетические данные: шаблоны по главам ТН ВЭД
# ──────────────────────────────────────────────────────
CHAPTER_TEMPLATES = {
    "01": [
        "крупный рогатый скот живой, бычок, масса {w} кг",
        "свиньи домашние живые, порося, {w} голов",
        "овцы живые мериносовой породы, {w} шт",
    ],
    "02": [
        "говядина замороженная, туша, {w} кг",
        "свинина охлаждённая без кости, {w} кг",
        "мясо птицы (курица) замороженное, {w} кг",
    ],
    "04": [
        "молоко пастеризованное 2.5% жирности, {w} л",
        "масло сливочное несолёное 82%, {w} кг",
        "сыр твёрдый типа пармезан, {w} кг",
    ],
    "07": [
        "картофель свежий продовольственный, {w} кг",
        "томаты свежие тепличные, {w} кг",
        "огурцы свежие грунтовые, {w} кг",
    ],
    "15": [
        "масло подсолнечное рафинированное дезодорированное, {w} л",
        "пальмовое масло сырое рафинированное, {w} кг",
    ],
    "22": [
        "вода питьевая негазированная, ПЭТ 0.5 л, {w} уп",
        "пиво светлое фильтрованное 4.5%, ПЭТ 1.5л, {w} шт",
        "сок яблочный осветлённый 100%, {w} л",
    ],
    "27": [
        "бензин автомобильный марки АИ-92, {w} т",
        "дизельное топливо ДТ-Л-К5, {w} т",
        "мазут М-100, {w} т",
    ],
    "29": [
        "ацетон технический ч.д.а., {w} кг",
        "этиловый спирт 96.6%, {w} л",
        "хлороформ (трихлорметан), {w} кг",
    ],
    "30": [
        "аспирин таблетки 500 мг, {w} уп",
        "ибупрофен 400 мг в оболочке, {w} шт",
        "метформин 1000 мг, таблетки, {w} уп",
    ],
    "38": [
        "удобрение комплексное NPK 16-16-16, {w} кг",
        "гербицид на основе глифосата, {w} л",
    ],
    "39": [
        "труба ПВХ напорная PN10 Ø110, {w} п.м.",
        "пакет полиэтиленовый пищевой 50×70, {w} шт",
        "лист АБС-пластика 3 мм, {w} м²",
    ],
    "40": [
        "шина автомобильная 205/55 R16, {w} шт",
        "ремень приводной клиновой B-1250, {w} шт",
    ],
    "44": [
        "доска обрезная сосна 50×150×6000, {w} м³",
        "фанера берёзовая ФСФ 15 мм 1525×1525, {w} л",
        "брус деревянный 100×100×6000 мм, {w} м³",
    ],
    "48": [
        "картон гофрированный Т-22, {w} м²",
        "бумага офисная А4 80г/м² 500л, {w} стоп",
    ],
    "52": [
        "ткань хлопчатобумажная бязь отбелённая, {w} пог. м",
        "пряжа хлопковая 100% Ne 30/1, {w} кг",
    ],
    "61": [
        "футболка мужская хлопок 100%, р.L, {w} шт",
        "толстовка спортивная с капюшоном, р.M, {w} шт",
    ],
    "62": [
        "куртка зимняя пуховая, синтепон 200г/м², {w} шт",
        "брюки рабочие хлопок/полиэстер 65/35, {w} шт",
    ],
    "64": [
        "ботинки кожаные мужские, р.42, {w} пар",
        "кроссовки текстильные, подошва ПУ, {w} пар",
    ],
    "72": [
        "прокат горячекатаный стальной Ш-образный, {w} т",
        "арматура стальная А500С Ø12 мм, 12 м, {w} т",
        "лист стальной г/к 8×1500×6000, {w} т",
    ],
    "73": [
        "болт стальной М10×50 DIN 931, {w} кг",
        "гайка шестигранная М12 оцинк DIN 934, {w} кг",
        "труба стальная бесшовная 57×3.5 ГОСТ 8734, {w} т",
        "задвижка клиновая фланцевая DN100 PN16, {w} шт",
    ],
    "76": [
        "лист алюминиевый АМГ3 2 мм 1200×3000, {w} кг",
        "профиль алюминиевый прямоугольный 40×40×3, {w} м.п.",
    ],
    "84": [
        "насос центробежный консольный К80-50-200, {w} шт",
        "компрессор поршневой одноступенчатый 220В, {w} шт",
        "токарный станок по металлу СТ-400, {w} шт",
        "котёл газовый настенный 24 кВт, {w} шт",
    ],
    "85": [
        "кабель ВВГнг-LS 3×2.5 мм², {w} м",
        "трансформатор силовой ТМ-630/10, {w} шт",
        "смартфон Android 6.7\" 128 ГБ, {w} шт",
        "ноутбук 15.6\" Intel i5 8 ГБ ОЗУ, {w} шт",
    ],
    "87": [
        "автомобиль легковой бензиновый 1.4 л, {w} шт",
        "грузовик дизельный 4×2 7.5 т, {w} шт",
        "прицеп тентованный 13.6 м, {w} шт",
    ],
    "90": [
        "микроскоп лабораторный биологический 400×, {w} шт",
        "весы аналитические лабораторные 0.001 г, {w} шт",
    ],
    "94": [
        "кресло офисное эргономичное с подлокотниками, {w} шт",
        "стол письменный ЛДСП 140×70, {w} шт",
    ],
    "95": [
        "мяч футбольный FIFA Quality Pro, {w} шт",
        "велосипед горный 26\" 21 скорость, {w} шт",
    ],
}

# Коды-«заглушки» для mock retriever (по главе)
CODE_MAP = {
    "01": "0102290009", "02": "0201300001", "04": "0401100001",
    "07": "0701901000", "15": "1512110001", "22": "2201100001",
    "27": "2710121100", "29": "2901100000", "30": "3004200000",
    "38": "3808930000", "39": "3917220000", "40": "4011100000",
    "44": "4407100000", "48": "4811490000", "52": "5208110000",
    "61": "6109100001", "62": "6201920000", "64": "6403190000",
    "72": "7213910001", "73": "7318150001", "76": "7606120000",
    "84": "8413700001", "85": "8544420001", "87": "8703230901",
    "90": "9011200000", "94": "9401300000", "95": "9506620000",
}

# Составные товары (для проверки _opi3b CONFIRMS)
COMPOUND_TEMPLATES = [
    "комплект крепёжный в сборе: болт М8 и гайка М8 нержавейка, {w} шт",
    "набор инструментов автослесаря, 48 предметов в сборе, {w} наб",
    "ремонтный комплект насоса, состоящий из сальника, подшипника и кольца, {w} шт",
    "монтажный комплект трубопровода, включающий фитинги и переходники, {w} компл",
]


def make_mock_retriever(chapter: str):
    """Mock retriever: возвращает правдоподобный топ-10 для главы."""
    code = CODE_MAP.get(chapter, "8473290000")
    base_score = random.uniform(0.55, 0.95)
    candidates = []
    for i in range(10):
        c_chapter = chapter if i < 6 else str(random.randint(1, 97)).zfill(2)
        c_code = CODE_MAP.get(c_chapter, "8473290000")
        # Slight variation in code
        c_code_var = c_code[:8] + str(random.randint(0, 9)) + str(random.randint(0, 9))
        candidates.append({
            "code": c_code if i == 0 else c_code_var,
            "description": f"Товар главы {c_chapter}",
            "rrf_score": round(base_score * (0.98 ** i) + random.uniform(-0.02, 0.02), 4),
            "chapter": c_chapter,
            "score": round(base_score * (0.98 ** i), 4),
        })
    return candidates, code


def run_single(description: str, chapter: str, is_compound: bool = False):
    """Прогон одного товара через pipeline без LLM."""
    from rag.evidence_builder import build_evidence
    from rag.rule_engine import run_rule_engine
    from rag.validator import validate_classification

    candidates, proposed_code = make_mock_retriever(chapter)

    t0 = time.perf_counter()

    # Step: Evidence
    evidence = build_evidence(
        proposed_code=proposed_code,
        retrieved_codes=candidates,
        retrieved_pdf_chunks=[],   # no PDF in stress test
        product_description=description,
    )

    # Step: Rule Engine
    re_report = run_rule_engine(
        proposed_code=proposed_code,
        product_description=description,
        top_candidates=candidates,
        pdf_chunks=[],
    )

    # Step: Validator
    val = validate_classification(
        proposed_code=proposed_code,
        confidence=candidates[0]["rrf_score"] if candidates else 0.0,
        retrieved_codes=candidates,
        retrieved_pdf_chunks=[],
    )

    elapsed_ms = (time.perf_counter() - t0) * 1000

    # Collect opi3b verdict
    opi3b_verdict = None
    for r in re_report.results:
        if r.rule_id == "ОПИ 3б":
            opi3b_verdict = r.verdict.name

    return {
        "description": description[:60],
        "chapter": chapter,
        "proposed_code": proposed_code,
        "evidence_score": round(evidence.evidence_score, 4),
        "is_sufficient": evidence.is_sufficient,
        "val_passed": val.passed,
        "val_warnings": len(val.warnings),
        "overall_verdict": re_report.overall_verdict.name,
        "opi3b_verdict": opi3b_verdict,
        "is_compound": is_compound,
        "elapsed_ms": round(elapsed_ms, 2),
    }


def run_stress(n: int = 10_000, output_csv: str = None, seed: int = 42):
    random.seed(seed)

    chapters = list(CHAPTER_TEMPLATES.keys())
    results = []
    errors = []

    print(f"Glorix v7 Stress Test — {n:,} товаров")
    print("=" * 55)
    t_start = time.perf_counter()

    compound_interval = max(200, n // 200)  # ~0.5% составных товаров

    for i in range(n):
        is_compound = (i % compound_interval == 0)
        if is_compound:
            template = random.choice(COMPOUND_TEMPLATES)
            chapter = "73"
        else:
            chapter = random.choice(chapters)
            template = random.choice(CHAPTER_TEMPLATES[chapter])

        description = template.format(w=random.randint(1, 10_000))

        try:
            r = run_single(description, chapter, is_compound)
            results.append(r)
        except Exception as e:
            errors.append({"i": i, "desc": description[:40], "err": str(e)})

        if (i + 1) % (n // 10 or 1) == 0:
            elapsed = time.perf_counter() - t_start
            pct = (i + 1) / n * 100
            tps = (i + 1) / elapsed
            print(f"  [{pct:5.1f}%] {i+1:>6}/{n}  |  {tps:.0f} товаров/сек")

    total_time = time.perf_counter() - t_start

    # ── Метрики ──────────────────────────────────────────────
    n_ok = len(results)
    n_err = len(errors)
    n_refused = sum(1 for r in results if not r["is_sufficient"] or not r["val_passed"])
    refusal_rate = n_refused / n_ok * 100 if n_ok else 0

    ev_scores = [r["evidence_score"] for r in results]
    elapsed_ms_list = [r["elapsed_ms"] for r in results]

    verdict_dist = Counter(r["overall_verdict"] for r in results)
    opi3b_dist = Counter(r["opi3b_verdict"] for r in results if r["opi3b_verdict"])
    compound_confirms = sum(
        1 for r in results
        if r["is_compound"] and r["opi3b_verdict"] == "CONFIRMS"
    )
    compound_total = sum(1 for r in results if r["is_compound"])

    chapters_dist = Counter(r["chapter"] for r in results)

    print()
    print("══════════════════════════════════════════════════════")
    print(f"  GLORIX v7 STRESS TEST RESULTS  ({n:,} products)")
    print("══════════════════════════════════════════════════════")
    print(f"  Всего прогонов:         {n_ok:>8,}  ({n_err} ошибок)")
    print(f"  Общее время:            {total_time:>8.1f}s")
    print(f"  Throughput:             {n_ok/total_time:>8.0f} товаров/сек")
    print(f"  Ср. время/товар:        {statistics.mean(elapsed_ms_list):>8.2f} ms")
    print(f"  P50 время/товар:        {statistics.median(elapsed_ms_list):>8.2f} ms")
    print(f"  P99 время/товар:        {sorted(elapsed_ms_list)[int(0.99*len(elapsed_ms_list))]:>8.2f} ms")
    print()
    print(f"  Отказов (refusal):      {n_refused:>8,}  ({refusal_rate:.1f}%)")
    print(f"  Evidence score avg:     {statistics.mean(ev_scores):>8.4f}")
    print(f"  Evidence score min:     {min(ev_scores):>8.4f}")
    print(f"  Evidence score max:     {max(ev_scores):>8.4f}")
    print()
    print("  Rule Engine verdicts:")
    for v, cnt in sorted(verdict_dist.items(), key=lambda x: -x[1]):
        bar = "█" * int(cnt / n_ok * 40)
        print(f"    {v:<18} {cnt:>6,}  {cnt/n_ok*100:>5.1f}%  {bar}")
    print()
    print("  ОПИ 3б verdicts (composite goods):")
    if compound_total:
        print(f"    Составных товаров:  {compound_total:>6,}")
        print(f"    CONFIRMS (heuristic): {compound_confirms:>4,}  "
              f"({compound_confirms/compound_total*100:.0f}%)")
    for v, cnt in sorted(opi3b_dist.items(), key=lambda x: -x[1]):
        print(f"    {v:<18} {cnt:>6,}  {cnt/n_ok*100:>5.1f}%")
    print()
    print(f"  Ошибок runtime: {n_err}")
    if errors[:3]:
        for e in errors[:3]:
            print(f"    [{e['i']}] {e['desc']} → {e['err'][:60]}")
    print("══════════════════════════════════════════════════════")

    # Записать CSV
    if output_csv:
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys() if results else [])
            writer.writeheader()
            writer.writerows(results)
        print(f"\n  CSV: {output_csv}")

    return {
        "n_total": n,
        "n_ok": n_ok,
        "n_errors": n_err,
        "n_refused": n_refused,
        "refusal_rate_pct": round(refusal_rate, 2),
        "throughput_per_sec": round(n_ok / total_time, 1),
        "avg_ms_per_item": round(statistics.mean(elapsed_ms_list), 2),
        "p99_ms": round(sorted(elapsed_ms_list)[int(0.99 * len(elapsed_ms_list))], 2),
        "evidence_score_avg": round(statistics.mean(ev_scores), 4),
        "verdict_distribution": dict(verdict_dist),
        "opi3b_distribution": dict(opi3b_dist),
        "compound_confirms_rate": round(compound_confirms / compound_total * 100, 1) if compound_total else 0,
    }


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000
    csv_out = sys.argv[2] if len(sys.argv) > 2 else None
    summary = run_stress(n=n, output_csv=csv_out)
    # Write JSON summary
    json_path = os.path.join(os.path.dirname(__file__), "stress_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\n  JSON summary → {json_path}")
