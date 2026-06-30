"""
LLM Client — взаимодействие с локальной моделью через Ollama. (v2)

Модель: qwen2.5:7b-instruct-q4_K_M
  ~4.7 GB RAM, CPU-friendly, хорошая поддержка русского языка.

Изменения v2:
  - Полностью переписан system prompt: абсолютные запреты, процедура ОПИ,
    требование явно указывать применённое правило (opi_rule_applied),
    обязательное цитирование источников, сильный запрет на угадывание.
  - Добавлено поле opi_rule_applied в JSON-схему ответа.
  - Контекст переструктурирован: исключения → примечания → коды → примеры.
  - Параметр num_predict увеличен до 2048 для полных рассуждений.
  - Улучшен _parse_response: защита от усечённого JSON.
"""

from __future__ import annotations
import json
import re
from dataclasses import dataclass, field
from typing import Optional
try:
    import ollama
except ImportError:
    ollama = None  # type: ignore — Ollama установлена на production сервере


@dataclass
class LLMResponse:
    """Структурированный ответ от LLM классификатора."""
    code: Optional[str]                        # Предложенный код ТН ВЭД
    confidence: float                          # Уверенность 0.0–1.0
    requires_clarification: bool               # LLM запросила уточнение
    clarification_message: Optional[str]       # Почему нужно уточнение
    missing_information: list[str]             # Чего не хватает
    reasoning: str                             # Объяснение LLM
    opi_rule_applied: str                      # Применённое правило ОПИ
    raw_response: str                          # Сырой текст LLM

    @classmethod
    def from_dict(cls, d: dict, raw: str = "") -> "LLMResponse":
        return cls(
            code=d.get("code"),
            confidence=float(d.get("confidence", 0.0)),
            requires_clarification=bool(d.get("requires_clarification", False)),
            clarification_message=d.get("clarification_message"),
            missing_information=d.get("missing_information") or [],
            reasoning=d.get("reasoning", ""),
            opi_rule_applied=d.get("opi_rule_applied", "ОПИ 1"),
            raw_response=raw,
        )

    @classmethod
    def needs_clarification(cls, message: str, missing: list[str] = None) -> "LLMResponse":
        """Быстро создать ответ с запросом уточнения."""
        return cls(
            code=None,
            confidence=0.0,
            requires_clarification=True,
            clarification_message=message,
            missing_information=missing or [],
            reasoning="",
            opi_rule_applied="",
            raw_response="",
        )

OLLAMA_MODEL      = "qwen2.5:7b-instruct-q4_K_M"
OLLAMA_MODEL_FAST = "phi3.5"   # запасной, быстрее но менее точный
TEMPERATURE       = 0.1        # минимальная случайность → детерминированность
MAX_TOKENS        = 2048       # увеличено для полных рассуждений


SYSTEM_PROMPT = """Ты — эксперт по классификации товаров по ТН ВЭД ЕАЭС (Товарная номенклатура внешнеэкономической деятельности Евразийского экономического союза).

Ты работаешь помощником сертифицированного таможенного брокера. Стоимость ошибки классификации — миллионы рублей штрафов и задержание груза.

═══════════════════════════════════════════════════════
АБСОЛЮТНЫЕ ЗАПРЕТЫ — нарушение недопустимо:
  ❌ Нельзя указывать код, которого НЕТ в предоставленном контексте
  ❌ Нельзя угадывать — если не уверен, требуй уточнений
  ❌ Нельзя выбирать код без обоснования через конкретное правило ОПИ
  ❌ Нельзя игнорировать примечания и исключения, даже если описание "подходит"
  ❌ Нельзя отвечать без поля sources_used — укажи конкретные коды и PDF
═══════════════════════════════════════════════════════

ОБЯЗАТЕЛЬНАЯ ПРОЦЕДУРА (ОПИ ТН ВЭД):
  ОПИ 1: Читаю наименование товарной позиции и примечания к разделам/группам
  ОПИ 2: Рассматриваю незаконченные, неполные и смешанные товары
  ОПИ 3а: Если несколько позиций — наиболее конкретное описание имеет приоритет
  ОПИ 3б: Если равно конкретны — классифицирую по существенному характеру
  ОПИ 3в: Если 3а и 3б не применимы — берём позицию с наибольшим кодовым номером
  ОПИ 6: Применяю ОПИ 1–5 к субпозициям

КОГДА ТРЕБОВАТЬ УТОЧНЕНИЙ (requires_clarification = true):
  - Описание товара неоднозначно и классификация зависит от уточнения
  - Нужен состав материала, степень обработки, назначение или технические параметры
  - Два или более кода выглядят одинаково применимыми и нет данных для выбора
  - Примечание к главе исключает товар, но условие исключения не ясно из описания

═══════════════════════════════════════════════════════
ФОРМАТ ОТВЕТА — строго JSON, без текста снаружи блока:

{
  "recommended_code": "XXXXXXXXXX",
  "confidence": 0.0,
  "opi_rule_applied": "ОПИ 1",
  "reasoning": "Подробное объяснение: почему этот код, какое правило применено, что проверено...",
  "why_not_alternatives": [
    {"code": "XXXXXXXXXX", "reason": "Почему этот код не подходит — со ссылкой на примечание или ОПИ"}
  ],
  "sources_used": [
    "Код ТН ВЭД: XXXXXXXXXX — краткое описание",
    "PDF: название_файла, стр. N — суть использованного фрагмента"
  ],
  "requires_clarification": false,
  "clarification_questions": []
}

ПРАВИЛА ПОЛЯ confidence:
  0.90–1.00 → Примечание или наименование позиции ПРЯМО описывает товар (ОПИ 1)
  0.70–0.89 → Высокая уверенность, описание хорошо соответствует, нет конкурентов
  0.50–0.69 → Средняя уверенность, есть допустимые альтернативы
  <0.50     → Низкая уверенность → ОБЯЗАТЕЛЬНО requires_clarification = true

ПРАВИЛА ПОЛЯ opi_rule_applied:
  Укажи одно из: "ОПИ 1", "ОПИ 2", "ОПИ 3а", "ОПИ 3б", "ОПИ 3в", "ОПИ 6"
  Если цепочка — перечисли: "ОПИ 1 → ОПИ 6"

ОБЯЗАТЕЛЬНО в sources_used:
  - Перечисли коды ТН ВЭД, которые ты рассмотрел
  - Укажи PDF-источники, если они были в контексте
═══════════════════════════════════════════════════════"""


def classify_with_llm(
    product_description: str,
    retrieved_codes: list[dict],
    retrieved_pdf_chunks: list[dict],
    model: str = OLLAMA_MODEL,
    extra_context: str = None,
    description: str = None,       # алиас для product_description
) -> "LLMResponse":
    """
    Классифицировать товар через LLM.

    Args:
        product_description / description: Описание товара (алиасы)
        retrieved_codes: Коды-кандидаты из поиска
        retrieved_pdf_chunks: Фрагменты PDF-пояснений
        model: Ollama-модель
        extra_context: Дополнительный контекст (напр., предупреждение от devil advocate)

    Returns:
        LLMResponse с кодом, уверенностью и признаком уточнения
    """
    # Алиас
    if description is not None and not product_description:
        product_description = description
    context  = _build_context(retrieved_codes, retrieved_pdf_chunks)
    if extra_context:
        context = extra_context + "\n\n" + context
    user_msg = _build_user_message(product_description, context)

    try:
        response = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            options={
                "temperature": TEMPERATURE,
                "num_predict": MAX_TOKENS,
                "top_p": 0.9,
                "repeat_penalty": 1.1,
            },
        )
        raw = response["message"]["content"]
        return _parse_response(raw)

    except ollama.ResponseError as e:
        if "model not found" in str(e).lower():
            raise RuntimeError(
                f"Модель {model} не установлена. "
                f"Выполните: ollama pull {model}"
            ) from e
        raise


def _build_context(codes: list[dict], pdf_chunks: list[dict]) -> str:
    """
    Сформировать контекст для LLM.

    Порядок (от наиболее к наименее важному):
      1. Официальные исключения (блокируют классификацию)
      2. Примечания и определения (задают границы позиций)
      3. Коды-кандидаты (что нашёл поиск)
      4. Примеры из пояснений (иллюстрации)
      5. Прочие PDF-фрагменты
    """
    parts = []

    # 1. Исключения — критически важны, идут первыми
    exclusions = [c for c in pdf_chunks if c.get("chunk_type") == "exclusion"]
    if exclusions:
        parts.append("=== ОФИЦИАЛЬНЫЕ ИСКЛЮЧЕНИЯ (обязательно проверить) ===")
        for chunk in exclusions[:5]:
            parts.append(
                f"[{chunk.get('source_file', 'PDF')}, "
                f"Глава {chunk.get('chapter', '?')}, стр. {chunk.get('page_num', '?')}]\n"
                f"{chunk.get('text', '')[:600]}"
            )

    # 2. Примечания и определения
    notes = [c for c in pdf_chunks if c.get("chunk_type") in ("note", "definition")]
    if notes:
        parts.append("\n=== ПРИМЕЧАНИЯ И ОПРЕДЕЛЕНИЯ ===")
        for chunk in notes[:6]:
            parts.append(
                f"[{chunk.get('source_file', 'PDF')}, "
                f"Глава {chunk.get('chapter', '?')}, тип: {chunk.get('chunk_type')}]\n"
                f"{chunk.get('text', '')[:500]}"
            )

    # 3. Коды-кандидаты
    parts.append("\n=== КОДЫ-КАНДИДАТЫ ТН ВЭД (по релевантности) ===")
    for rec in codes[:15]:
        code    = rec.get("code", "")
        desc    = rec.get("description", "")
        chapter = rec.get("chapter", "")
        score   = rec.get("rrf_score", 0)
        boosted = " [глава подсказана]" if rec.get("chapter_boosted") else ""
        parts.append(f"Код {code} (гл. {chapter}, score={score:.4f}{boosted}): {desc[:280]}")

    # 4. Примеры
    examples = [c for c in pdf_chunks if c.get("chunk_type") == "example"]
    if examples:
        parts.append("\n=== ПРИМЕРЫ ИЗ ОФИЦИАЛЬНЫХ ПОЯСНЕНИЙ ===")
        for chunk in examples[:3]:
            parts.append(
                f"[{chunk.get('source_file', 'PDF')}, стр. {chunk.get('page_num', '?')}]\n"
                f"{chunk.get('text', '')[:450]}"
            )

    # 5. Прочие PDF-фрагменты
    other = [c for c in pdf_chunks
             if c.get("chunk_type") not in ("exclusion", "note", "definition", "example")]
    if other:
        parts.append("\n=== ДОПОЛНИТЕЛЬНЫЕ ПОЯСНЕНИЯ ===")
        for chunk in other[:3]:
            parts.append(
                f"[{chunk.get('source_file', 'PDF')}]\n"
                f"{chunk.get('text', '')[:350]}"
            )

    return "\n\n".join(parts)


def _build_user_message(description: str, context: str) -> str:
    return f"""ОПИСАНИЕ ТОВАРА ДЛЯ КЛАССИФИКАЦИИ:
{description}

КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ ТН ВЭД:
{context}

ЗАДАЧА:
1. Проверь все исключения и примечания — если товар исключён из позиции, не используй её.
2. Определи подходящий 10-значный код ТН ВЭД из приведённых кандидатов.
3. Укажи применённое правило ОПИ.
4. Если данных недостаточно — задай уточняющие вопросы (requires_clarification = true).

Отвечай ТОЛЬКО в формате JSON, без пояснений снаружи JSON-блока."""


def _parse_response(raw: str) -> LLMResponse:
    """Извлечь JSON из ответа LLM."""
    # Попытка 1: JSON в markdown-блоке
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if m:
        json_str = m.group(1)
    else:
        # Попытка 2: голый JSON (взять самый длинный блок от { до })
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        json_str = m.group(0) if m else None

    if not json_str:
        return _parse_error_response(raw, "JSON-блок не найден в ответе модели.")

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError as e:
        # Попытка починить усечённый JSON (добавить закрывающие скобки)
        try:
            fixed = json_str.rstrip() + '"}}'
            result = json.loads(fixed)
        except Exception:
            return _parse_error_response(raw, f"Ошибка парсинга JSON: {e}")

    # Гарантировать наличие всех полей
    result.setdefault("recommended_code", None)
    result.setdefault("confidence", 0.0)
    result.setdefault("opi_rule_applied", "не указано")
    result.setdefault("reasoning", "")
    result.setdefault("why_not_alternatives", [])
    result.setdefault("sources_used", [])
    result.setdefault("requires_clarification", False)
    result.setdefault("clarification_questions", [])

    # Принудительный requires_clarification при низкой уверенности
    if float(result.get("confidence", 0)) < 0.50 and not result.get("requires_clarification"):
        result["requires_clarification"] = True
        if not result.get("clarification_questions"):
            result["clarification_questions"] = [
                "Уточните описание товара — уверенность классификации недостаточна."
            ]

    return LLMResponse.from_dict({
        "code": result.get("recommended_code") or result.get("code"),
        "confidence": float(result.get("confidence", 0.0)),
        "requires_clarification": bool(result.get("requires_clarification", False)),
        "clarification_message": (
            result.get("clarification_questions", [""])[0]
            if result.get("clarification_questions") else None
        ),
        "missing_information": result.get("clarification_questions", []),
        "reasoning": result.get("reasoning", ""),
        "opi_rule_applied": result.get("opi_rule_applied", "ОПИ 1"),
    }, raw=raw[:500])


def _parse_error_response(raw: str, error_msg: str) -> LLMResponse:
    return LLMResponse(
        code=None,
        confidence=0.0,
        requires_clarification=True,
        clarification_message=f"[Ошибка парсинга ответа LLM] {error_msg}",
        missing_information=["Попробуйте переформулировать описание товара более детально."],
        reasoning=f"[Ошибка парсинга ответа LLM] {error_msg}",
        opi_rule_applied="",
        raw_response=raw[:800],
    )


def check_ollama_available(model: str = OLLAMA_MODEL) -> dict:
    """Проверить доступность Ollama и нужной модели."""
    try:
        models = ollama.list()
        available = [m["name"] for m in models.get("models", [])]
        return {
            "ollama_running": True,
            "model_available": any(model in m for m in available),
            "available_models": available,
        }
    except Exception as e:
        return {
            "ollama_running": False,
            "error": str(e),
            "model_available": False,
            "available_models": [],
        }
