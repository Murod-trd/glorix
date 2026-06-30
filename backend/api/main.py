"""
main.py v3 — FastAPI backend для ТН ВЭД классификатора.

Новые поля ответа v3:
  - top10_candidates: анализ TOP-10 кодов с pro/con
  - evidence: документальные доказательства
  - devil_advocate: результат второй независимой проверки
  - opi_checks: программные проверки ОПИ
  - clarification_questions: конкретные вопросы при отказе
"""

from __future__ import annotations
import logging
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Добавить корневой каталог в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rag.classifier import classify, ClassificationResult

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="ТН ВЭД ЕАЭС Классификатор v3",
    description="AI-классификация товаров по ТН ВЭД с двойной проверкой и документальными доказательствами",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()],
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Путь к docs/explanations — module-level переменная для testability (монкей-патч в тестах)
_DOCS_EXPL_PATH = Path(__file__).parent.parent.parent / "docs" / "explanations"


def _get_default_model() -> str:
    """Взять модель из env OLLAMA_MODEL или из config.DEFAULT_LLM_MODEL."""
    try:
        from config import DEFAULT_LLM_MODEL
        return os.getenv("OLLAMA_MODEL", DEFAULT_LLM_MODEL)
    except ImportError:
        return os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct-q4_K_M")

REBUILD_TOKEN = os.getenv("REBUILD_TOKEN", "change-this-token")
if REBUILD_TOKEN == "change-this-token":
    logger.warning(
        "REBUILD_TOKEN не задан в .env — использован небезопасный дефолт. "
        "Установите REBUILD_TOKEN в .env перед production-деплоем."
    )


# ── Pydantic схемы ───────────────────────────────────────────────────────

# ── Pydantic-модели для Explainability Mode ────────────────────────────

class ProductFeaturesInfo(BaseModel):
    """Структурированные признаки товара (Step 2 pipeline)."""
    materials: list[str] = Field(default_factory=list)
    material_chapters: list[str] = Field(default_factory=list)
    functions: list[str] = Field(default_factory=list)
    function_chapters: list[str] = Field(default_factory=list)
    dominant_chapter: Optional[str] = None
    standards: list[str] = Field(default_factory=list)
    dimensions: list[dict] = Field(default_factory=list)
    processing_level: Optional[str] = None
    is_compound: bool = False
    is_set: bool = False
    missing_for_classification: list[str] = Field(default_factory=list)


class RuleResultInfo(BaseModel):
    """Результат применения одного правила ОПИ."""
    rule_id: str
    rule_name: str
    verdict: str
    confidence_delta: float
    checks_performed: list[str] = Field(default_factory=list)
    reason: str
    evidence: list[str] = Field(default_factory=list)
    alternative_code: Optional[str] = None
    is_blocking: bool = False


class RuleEngineInfo(BaseModel):
    """Полный отчёт Rule Engine."""
    rules_considered: list[str] = Field(default_factory=list)
    rules_applied: list[str] = Field(default_factory=list)
    rules_skipped: list[str] = Field(default_factory=list)
    primary_rule: str
    overall_verdict: str
    total_confidence_delta: float
    blocking_issues: list[str] = Field(default_factory=list)
    results: list[RuleResultInfo] = Field(default_factory=list)


class ExplainResponse(BaseModel):
    """
    Полный журнал решений для /classify/explain.
    Содержит каждый шаг pipeline с доказательствами и обоснованием.
    """
    # Итоговый результат (те же поля что у ClassifyResponse)
    code: Optional[str]
    confidence: float
    requires_clarification: bool
    clarification_message: Optional[str] = None
    clarification_questions: list[str] = Field(default_factory=list)

    # Шаг 1-3: признаки товара
    product_features: Optional[ProductFeaturesInfo] = None
    chapter_hint_source: Optional[str] = None   # "user" | "features" | "none"

    # Шаг 4-5: retrieval
    retrieval_stats: dict = Field(default_factory=dict)                   # кол-во кандидатов

    # Шаг 5: TOP-10
    top10_candidates: list[dict] = Field(default_factory=list)

    # Шаг 6: LLM
    llm_proposed_code: Optional[str] = None
    llm_confidence: float = 0.0
    llm_reasoning: Optional[str] = None
    llm_opi_rule: Optional[str] = None

    # Шаг 7: Evidence
    evidence: Optional[EvidenceInfo] = None
    sources_used: list[str] = Field(default_factory=list)
    evidence_score: float = 0.0
    evidence_sufficient: bool = False
    evidence_excel_count: int = 0
    evidence_pdf_count: int = 0
    evidence_notes: list[str] = Field(default_factory=list)
    evidence_threshold_used: float = 0.3
    evidence_threshold_source: str = "config"
    evidence_warnings: list[str] = Field(default_factory=list)

    # Шаг 8: Rule Engine
    rule_engine: Optional[RuleEngineInfo] = None

    # Шаг 9: Validator
    validation_passed: bool = False
    validation_issues: list[str] = Field(default_factory=list)
    validation_warnings: list[str] = Field(default_factory=list)
    competing_codes: list[dict] = Field(default_factory=list)

    # Шаг 10: Devil Advocate
    devil_verdict: Optional[str] = None
    devil_reasons_against: list[str] = Field(default_factory=list)
    devil_confidence_delta: float = 0.0
    devil_alternative: Optional[str] = None

    # Шаг 11: Independent verification
    independent_verification_code: Optional[str] = None
    independent_verification_agrees: Optional[bool] = None

    # Шаг 14: Полный audit trail
    audit_trail: list[dict] = Field(default_factory=list)
    pipeline_steps_completed: int = 0
    processing_time_ms: int = 0


class ClassifyRequest(BaseModel):
    description: str = Field(..., min_length=5, max_length=2000,
                             description="Описание товара для классификации")
    chapter_hint: Optional[str] = Field(None, max_length=2,
                                        description="Подсказка главы (опционально)")
    include_audit: bool = Field(False, description="Включить полный audit trail")
    model: str = Field(
        default_factory=lambda: _get_default_model(),
        description="LLM модель (default: DEFAULT_LLM_MODEL из config или env OLLAMA_MODEL)",
    )


class CandidateInfo(BaseModel):
    rank: int
    code: str
    description: str
    chapter: str
    rrf_score: float
    reasons_for: list[str]
    reasons_against: list[str]
    opi_note: Optional[str] = None


class ExcelRecordInfo(BaseModel):
    code: str
    description: str
    level: str
    chapter: str
    rrf_score: float


class PDFChunkInfo(BaseModel):
    source_file: str
    page: int
    chapter: str
    text_excerpt: str
    relevance_score: float
    text_quality_score: Optional[float] = None
    text_quality_warning: Optional[str] = None


class NoteInfo(BaseModel):
    note_type: str
    text: str
    applies_to_code: str
    source: str


class EvidenceInfo(BaseModel):
    proposed_code: str
    is_sufficient: bool
    evidence_score: float
    excel_records: list[ExcelRecordInfo]
    pdf_chunks: list[PDFChunkInfo]
    notes_found: list[NoteInfo]
    rules_applied: list[str]
    insufficiency_reasons: list[str]
    missing_information: list[str]


class DevilAdvocateInfo(BaseModel):
    verdict: str                     # APPROVE / WARN / BLOCK
    reasons_against: list[str]
    alternative_code: Optional[str]
    missing_info: list[str]
    confidence_delta: float
    static_checks_passed: bool
    static_issues: list[str]


class OPICheckInfo(BaseModel):
    rule: str
    confirms: bool
    delta: float
    explanation: str
    alternative_code: Optional[str]


class OPIReportInfo(BaseModel):
    primary_rule: str
    overall_confirms: bool
    total_confidence_delta: float
    checks: dict


class ValidationInfo(BaseModel):
    passed: bool
    issues: list[str]
    warnings: list[str]
    adjusted_confidence: float


class MetaInfo(BaseModel):
    model: str
    processing_time_ms: int
    retrieval_codes: int
    retrieval_pdf: int


class ClassifyResponse(BaseModel):
    # Основной результат
    code: Optional[str]
    confidence: float
    requires_clarification: bool
    clarification_message: Optional[str]
    clarification_questions: list[str]

    # Объяснение
    reasoning: str
    opi_rule_applied: str
    sources_used: list[str]

    # TOP-10 анализ
    top10_candidates: list[CandidateInfo]

    # Доказательная база
    evidence: Optional[EvidenceInfo]

    # ОПИ программные проверки
    opi_checks: Optional[OPIReportInfo]

    # Второй аудитор
    devil_advocate: Optional[DevilAdvocateInfo]

    # Метаданные
    meta: MetaInfo

    # Audit trail (только если include_audit=True)
    audit_trail: Optional[list[dict]] = None


# ── Endpoints ────────────────────────────────────────────────────────────

@app.post("/classify", response_model=ClassifyResponse)
async def classify_endpoint(req: ClassifyRequest):
    """
    Главный endpoint классификации.
    Пайплайн v3: retrieval → TOP-10 → LLM → evidence → OPI → validator → devil → ответ.
    """
    result: ClassificationResult = classify(
        description=req.description,
        chapter_hint=req.chapter_hint,
        include_audit=req.include_audit,
        model=req.model,
    )
    return _result_to_response(result, req.model, req.include_audit)


@app.post("/classify/audit", response_model=ClassifyResponse)
async def classify_audit_endpoint(req: ClassifyRequest):
    """То же что /classify но audit_trail всегда включён."""
    result: ClassificationResult = classify(
        description=req.description,
        chapter_hint=req.chapter_hint,
        include_audit=True,
        model=req.model,
    )
    return _result_to_response(result, req.model, include_audit=True)


@app.post("/classify/explain", response_model=ExplainResponse)
async def classify_explain_endpoint(req: ClassifyRequest):
    """
    Полный журнал решений — Explainability Mode.

    Возвращает подробное объяснение каждого шага pipeline:
    - Что было извлечено из описания товара
    - Какие коды найдены при поиске
    - Что предложила LLM и почему
    - Какие правила ОПИ применялись и с каким результатом
    - Что обнаружил Devil Advocate
    - Почему финальная уверенность именно такая

    Используйте для отладки, аудита и объяснения классификации.
    """
    result: ClassificationResult = classify(
        description=req.description,
        chapter_hint=req.chapter_hint,
        include_audit=True,
        model=req.model,
    )
    return _result_to_explain_response(result)


@app.get("/health")
async def health():
    """Проверка состояния системы."""
    import httpx
    status: dict = {"status": "ok", "version": "3.0.0", "warnings": []}

    # Проверить Ollama
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
            r = await client.get(f"{ollama_url}/api/tags")
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", [])]
                status["ollama"] = {"status": "ok", "models": models}
            else:
                status["ollama"] = {"status": "error", "code": r.status_code}
                status["warnings"].append("Ollama не отвечает")
    except Exception as e:
        status["ollama"] = {"status": "unreachable", "error": str(e)}
        status["warnings"].append(f"Ollama недоступна: {e}")

    # Проверить Qdrant
    try:
        from store.qdrant_store import get_client, get_health_info
        qdrant_client = get_client()
        qdrant_info = get_health_info(qdrant_client)
        codes_count = qdrant_info["codes_count"]
        pdf_count   = qdrant_info["pdf_chunks_count"]
        status["qdrant"] = {"status": "ok", **qdrant_info}
        if not qdrant_info.get("collections_exist"):
            status["warnings"].append(
                "Qdrant-коллекции не найдены. Запустите POST /rebuild для индексации."
            )
        elif codes_count < 1000:
            status["warnings"].append(
                f"База кодов мала: {codes_count} записей (ожидается >1000). "
                "Запустите POST /rebuild"
            )
        if pdf_count == 0:
            status["warnings"].append(
                "PDF не загружены. Документальная проверка будет ограничена."
            )
    except Exception as e:
        status["qdrant"] = {"status": "error", "error": str(e)}
        status["warnings"].append(f"Qdrant: {e}")

    # ── data_sources: покажи реальные источники данных ───────────────
    from pathlib import Path as _Path
    _data_dir   = _Path(os.getenv("DATA_DIR", _Path(__file__).parent.parent / "data")).resolve()
    _excel_dir  = _Path(os.getenv("EXCEL_DIR", _data_dir / "excel")).resolve()
    _pdf_dirs_env = os.getenv("PDF_DIRS", "").strip()
    _pdf_dir_env  = os.getenv("PDF_DIR", "").strip()
    if _pdf_dirs_env:
        _pdf_dirs = [_Path(d.strip()) for d in _pdf_dirs_env.split(",") if d.strip()]
    elif _pdf_dir_env:
        _pdf_dirs = [_Path(_pdf_dir_env)]
    else:
        _pdf_dirs = [_data_dir / "pdf"]

    _docs_expl = _DOCS_EXPL_PATH  # модульная переменная (можно патчить в тестах)
    _docs_expl_detected = _docs_expl.exists()
    _docs_expl_included = _docs_expl_detected and (
        _docs_expl.resolve() in [d.resolve() for d in _pdf_dirs]
    )

    _excel_files = sorted(_excel_dir.glob("*.xlsx")) + sorted(_excel_dir.glob("*.xls")) if _excel_dir.exists() else []
    _pdf_files: list = []
    for _d in _pdf_dirs:
        if _d.exists():
            _pdf_files.extend(sorted(_d.glob("**/*.pdf")))

    _ds_warnings: list[str] = []
    if _docs_expl_detected and not _docs_expl_included:
        _ds_warnings.append(
            "docs/explanations exists but is not included in PDF_DIRS. These PDFs will not be used."
        )
    status["data_sources"] = {
        "excel_dirs": [str(_excel_dir)],
        "pdf_dirs": [str(d) for d in _pdf_dirs],
        "excel_files_found": len(_excel_files),
        "pdf_files_found": len(_pdf_files),
        "docs_explanations_detected": _docs_expl_detected,
        "docs_explanations_included": _docs_expl_included,
        "warnings": _ds_warnings,
    }

    # docs/explanations warning теперь в data_sources.warnings

    # ── evidence_threshold ────────────────────────────────────────────
    try:
        from rag.evidence_builder import MIN_EVIDENCE_SCORE as _et
        _threshold_overridden = os.getenv("EVIDENCE_MIN_SCORE") is not None
        status["evidence"] = {
            "threshold_used": round(_et, 3),
            "threshold_source": "env:EVIDENCE_MIN_SCORE" if _threshold_overridden else "config",
        }
        if _threshold_overridden:
            status["warnings"].append(
                f"Evidence threshold снижен через env EVIDENCE_MIN_SCORE={_et:.2f}. "
                "Это dev/test режим, не production."
            )
    except Exception:
        pass

    return status


@app.post("/rebuild")
async def rebuild_knowledge_base(x_rebuild_token: str = Header(..., alias="X-Rebuild-Token")):
    """Перестроить базу знаний из Excel и PDF-файлов.

    ВАЖНО: В режиме USE_EMBEDDED_QDRANT=1 этот endpoint всегда возвращает 409.
    Embedded Qdrant держит storage lock пока API запущен.
    Для rebuild: остановить API → python build_knowledge_base.py → запустить API.
    """
    if x_rebuild_token != REBUILD_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid rebuild token")

    # Embedded Qdrant: rebuild через subprocess ЗАПРЕЩЁН.
    # Embedded Qdrant держит эксклюзивный lock на папку qdrant_storage/.
    # Попытка запустить второй процесс с тем же storage приведёт к ошибке.
    if os.getenv("USE_EMBEDDED_QDRANT", "0") == "1":
        raise HTTPException(
            status_code=409,
            detail={
                "status": "blocked",
                "reason": (
                    "Embedded Qdrant does not support rebuild while API process holds "
                    "the local storage lock. Stop API and run "
                    "python build_knowledge_base.py manually before starting API, "
                    "or use external Qdrant."
                ),
            },
        )

    build_script = Path(__file__).parent.parent / "build_knowledge_base.py"
    if not build_script.exists():
        raise HTTPException(status_code=500, detail="build_knowledge_base.py not found")

    try:
        proc = subprocess.run(
            [sys.executable, str(build_script)],
            capture_output=True,
            text=True,
            timeout=600,
        )
        return {
            "status": "completed" if proc.returncode == 0 else "failed",
            "returncode": proc.returncode,
            "stdout": proc.stdout[-3000:] if proc.stdout else "",
            "stderr": proc.stderr[-1000:] if proc.stderr else "",
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Rebuild timeout (>600s)")


@app.post("/benchmark/run")
async def run_benchmark_endpoint(
    x_rebuild_token: str = Header(..., alias="X-Rebuild-Token"),
    limit: int = 50,
    model: str = _get_default_model(),
):
    """Запустить benchmark на встроенном наборе тестов."""
    if x_rebuild_token != REBUILD_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid rebuild token")

    benchmark_script = Path(__file__).parent.parent / "tests" / "benchmark.py"
    if not benchmark_script.exists():
        raise HTTPException(status_code=500, detail="benchmark.py not found")

    try:
        proc = subprocess.run(
            [sys.executable, str(benchmark_script), "--limit", str(limit), "--model", model],
            capture_output=True, text=True, timeout=3600,
        )
        return {
            "status": "completed" if proc.returncode == 0 else "failed",
            "returncode": proc.returncode,
            "output": proc.stdout[-5000:],
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Benchmark timeout")


# ── Конвертация результата ───────────────────────────────────────────────

def _result_to_response(
    result: ClassificationResult,
    model: str,
    include_audit: bool,
) -> ClassifyResponse:
    """Преобразовать внутренний ClassificationResult в API-ответ."""

    evidence_info = None
    if result.evidence:
        ev = result.evidence
        evidence_info = EvidenceInfo(
            proposed_code=ev.proposed_code,
            is_sufficient=ev.is_sufficient,
            evidence_score=round(ev.evidence_score, 3),
            excel_records=[
                ExcelRecordInfo(**r.to_dict()) for r in ev.excel_records[:5]
            ],
            pdf_chunks=[
                PDFChunkInfo(**c.to_dict()) for c in ev.pdf_chunks[:5]
            ],
            notes_found=[
                NoteInfo(**n.to_dict()) for n in ev.notes_found[:5]
            ],
            rules_applied=ev.rules_applied,
            insufficiency_reasons=ev.insufficiency_reasons,
            missing_information=ev.missing_information,
        )

    devil_info = None
    if result.devil_result:
        d = result.devil_result
        devil_info = DevilAdvocateInfo(
            verdict=d.verdict,
            reasons_against=d.reasons_against,
            alternative_code=d.alternative_code,
            missing_info=d.missing_info,
            confidence_delta=d.confidence_delta,
            static_checks_passed=d.static_checks_passed,
            static_issues=d.static_issues,
        )

    opi_info = None
    if result.opi_report:
        opi_dict = result.opi_report.to_dict()
        opi_info = OPIReportInfo(
            primary_rule=opi_dict["primary_rule"],
            overall_confirms=opi_dict["overall_confirms"],
            total_confidence_delta=opi_dict["total_confidence_delta"],
            checks=opi_dict["checks"],
        )

    top10 = [
        CandidateInfo(
            rank=c.rank,
            code=c.code,
            description=c.description,
            chapter=c.chapter,
            rrf_score=c.rrf_score,
            reasons_for=c.reasons_for,
            reasons_against=c.reasons_against,
            opi_note=c.opi_note,
        )
        for c in result.top10_candidates
    ]

    meta = MetaInfo(
        model=model,
        processing_time_ms=result.processing_time_ms,
        retrieval_codes=len(result.evidence.excel_records) if result.evidence else 0,
        retrieval_pdf=len(result.evidence.pdf_chunks) if result.evidence else 0,
    )

    return ClassifyResponse(
        code=result.code,
        confidence=round(result.confidence, 3),
        requires_clarification=result.requires_clarification,
        clarification_message=result.clarification_message,
        clarification_questions=result.clarification_questions,
        reasoning=result.reasoning,
        opi_rule_applied=result.opi_rule_applied,
        sources_used=result.sources_used,
        top10_candidates=top10,
        evidence=evidence_info,
        opi_checks=opi_info,
        devil_advocate=devil_info,
        meta=meta,
        audit_trail=result.audit_trail if include_audit else None,
    )


def _result_to_explain_response(result: ClassificationResult) -> ExplainResponse:
    """
    Конвертировать ClassificationResult в полный ExplainResponse.
    Каждое поле ExplainResponse соответствует конкретному шагу pipeline.
    """
    audit = result.audit_trail or []

    # Извлечь данные из audit_trail по step-именам
    def get_step(step_name: str) -> dict:
        for entry in audit:
            if entry.get("step") == step_name:
                return entry
        return {}

    retrieval_step = get_step("retrieval")
    llm_step = get_step("llm_primary")
    evidence_step = get_step("evidence")
    opi_step = get_step("rule_engine")
    validation_step = get_step("validation")
    devil_step = get_step("devil_advocate")
    feature_step = get_step("feature_extraction")
    chapter_step = get_step("chapter_hint")
    indep_step = get_step("independent_verification")

    # Product features
    pf = None
    if result.product_features:
        pf = ProductFeaturesInfo(
            materials=result.product_features.materials,
            material_chapters=result.product_features.material_chapters,
            functions=result.product_features.functions,
            function_chapters=result.product_features.function_chapters,
            dominant_chapter=result.product_features.dominant_chapter,
            standards=result.product_features.standards,
            dimensions=[{"value": v, "unit": u} for v, u in result.product_features.dimensions],
            processing_level=result.product_features.processing_level,
            is_compound=result.product_features.is_compound,
            is_set=result.product_features.is_set,
            missing_for_classification=result.product_features.missing_for_classification,
        )

    # Rule Engine
    re_info = None
    if result.rule_engine_report:
        re_info = RuleEngineInfo(
            rules_considered=result.rule_engine_report.rules_considered,
            rules_applied=result.rule_engine_report.rules_applied,
            rules_skipped=result.rule_engine_report.rules_skipped,
            primary_rule=result.rule_engine_report.primary_rule,
            overall_verdict=result.rule_engine_report.overall_verdict.value,
            total_confidence_delta=result.rule_engine_report.total_confidence_delta,
            blocking_issues=result.rule_engine_report.blocking_issues,
            results=[
                RuleResultInfo(
                    rule_id=r.rule_id,
                    rule_name=r.rule_name,
                    verdict=r.verdict.value,
                    confidence_delta=r.confidence_delta,
                    checks_performed=r.checks_performed,
                    reason=r.reason,
                    evidence=r.evidence,
                    alternative_code=r.alternative_code,
                    is_blocking=r.is_blocking,
                )
                for r in result.rule_engine_report.results
            ],
        )

    # Evidence
    ev = result.evidence
    ev_score = ev.evidence_score if ev else 0.0
    ev_sufficient = ev.is_sufficient if ev else False
    ev_excel = len(ev.excel_records) if ev else 0
    ev_pdf = len(ev.pdf_chunks) if ev else 0
    ev_notes = [n.text[:150] for n in (ev.notes_found or [])] if ev else []
    evidence_info = None
    if ev:
        evidence_info = EvidenceInfo(
            proposed_code=ev.proposed_code,
            is_sufficient=ev.is_sufficient,
            evidence_score=round(ev.evidence_score, 3),
            excel_records=[ExcelRecordInfo(**r.to_dict()) for r in ev.excel_records[:10]],
            pdf_chunks=[PDFChunkInfo(**c.to_dict()) for c in ev.pdf_chunks[:10]],
            notes_found=[NoteInfo(**n.to_dict()) for n in ev.notes_found[:10]],
            rules_applied=ev.rules_applied,
            insufficiency_reasons=ev.insufficiency_reasons,
            missing_information=ev.missing_information,
        )

    # Validation
    vr = result.validation_result
    val_passed = vr.passed if vr else False
    val_issues = vr.issues if vr else []
    val_warnings = vr.warnings if vr else []
    competing = [
        {"code": c.get("code"), "score_ratio": c.get("score_ratio")}
        for c in (vr.competing_codes if vr else [])
    ]

    # Devil
    dr = result.devil_result
    devil_verdict = dr.verdict if dr else None
    devil_against = dr.reasons_against if dr else []
    devil_delta = dr.confidence_delta if dr else 0.0
    devil_alt = dr.alternative_code if dr else None

    # LLM
    llm = result.llm_response
    llm_code = llm.code if llm else None
    llm_conf = llm.confidence if llm else 0.0
    llm_reason = llm.reasoning if llm else None
    llm_opi = llm.opi_rule_applied if llm else None

    # Independent verification
    indep_code = indep_step.get("secondary_code")
    indep_agrees = indep_step.get("agrees")

    return ExplainResponse(
        # Итог
        code=result.code,
        confidence=round(result.confidence, 3),
        requires_clarification=result.requires_clarification,
        clarification_message=result.clarification_message,
        clarification_questions=result.clarification_questions,

        # Шаги 1-3
        product_features=pf,
        chapter_hint_source=chapter_step.get("source"),

        # Шаг 4-5
        retrieval_stats={
            "codes_found": retrieval_step.get("codes_found", 0),
            "pdf_chunks_found": retrieval_step.get("pdf_chunks_found", 0),
        },
        top10_candidates=[c.to_dict() for c in result.top10_candidates],

        # Шаг 6
        llm_proposed_code=llm_code,
        llm_confidence=round(llm_conf, 3),
        llm_reasoning=llm_reason,
        llm_opi_rule=llm_opi,

        # Шаг 7
        evidence=evidence_info,
        sources_used=result.sources_used,
        evidence_score=round(ev_score, 3),
        evidence_sufficient=ev_sufficient,
        evidence_excel_count=ev_excel,
        evidence_pdf_count=ev_pdf,
        evidence_notes=ev_notes[:4],
        evidence_threshold_used=round(__import__("rag.evidence_builder", fromlist=["MIN_EVIDENCE_SCORE"]).MIN_EVIDENCE_SCORE, 3),
        evidence_threshold_source="env:EVIDENCE_MIN_SCORE" if os.getenv("EVIDENCE_MIN_SCORE") else "config",
        evidence_warnings=(
            [f"pdf_chunks_found=0 — документальная проверка по PDF отсутствует. "
             "Классификация основана только на Excel-данных."] if ev_pdf == 0 else []
        ) + (
            [f"Evidence threshold снижен через env EVIDENCE_MIN_SCORE={os.getenv('EVIDENCE_MIN_SCORE')}. "
             "Dev/test режим."] if os.getenv("EVIDENCE_MIN_SCORE") else []
        ),

        # Шаг 8
        rule_engine=re_info,

        # Шаг 9
        validation_passed=val_passed,
        validation_issues=val_issues,
        validation_warnings=val_warnings,
        competing_codes=competing,

        # Шаг 10
        devil_verdict=devil_verdict,
        devil_reasons_against=devil_against,
        devil_confidence_delta=round(devil_delta, 3),
        devil_alternative=devil_alt,

        # Шаг 11
        independent_verification_code=indep_code,
        independent_verification_agrees=indep_agrees,

        # Шаг 14
        audit_trail=audit,
        pipeline_steps_completed=len(audit),
        processing_time_ms=result.processing_time_ms,
    )
