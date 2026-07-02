/**
 * GLORIX TN VED expert engine — glorix-sql-stemmer-v1
 *
 * 100% local, deterministic, explainable. No external AI, no client-side models,
 * no BM25 as final authority, no KEYWORD_ROUTES as final authority. The engine
 * only RANKS candidates that the router pulled from the local SQLite DB; the
 * router applies the decision policy below.
 *
 * SAFETY: never fabricates a code. If confidence/margin are insufficient, the
 * decision policy returns an empty code + review + candidates + missing_information.
 *
 * ESM module (package.json has "type": "module").
 */

// ── Stopwords: commercial noise + generic RU function words ──────────────────
const STOPWORDS = new Set([
  'и', 'в', 'во', 'на', 'с', 'со', 'по', 'из', 'от', 'до', 'для', 'к', 'о', 'об',
  'за', 'при', 'или', 'а', 'но', 'же', 'бы', 'то', 'как', 'что', 'это',
  'куп', 'купить', 'цена', 'цены', 'опт', 'оптом', 'розница', 'продажа', 'продам',
  'новый', 'новая', 'шт', 'штук', 'штука', 'упаковка', 'комплект', 'набор',
  'модель', 'артикул', 'арт', 'тип', 'вид', 'бренд', 'марка', 'производитель',
]);

// Ordered longest-first: only inflectional/derivational RU endings we strip.
const ENDINGS = [
  'иями', 'ями', 'ами', 'иях', 'ях', 'ах', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'ей', 'ой', 'ий', 'ый', 'ая', 'яя', 'ую', 'юю', 'ее', 'ье', 'ов', 'ев',
  'ие', 'ые', 'их', 'ых', 'ям', 'ом', 'ем', 'ин',
  'а', 'я', 'ы', 'и', 'у', 'ю', 'о', 'е', 'ь', 'й',
];

/**
 * stemWord(word) — light, conservative RU stemmer.
 * - lowercases; ё→е, й→и
 * - never stems tokens containing a digit (DN50, 220V, AISI304, ГОСТ10704, WD-40)
 * - never stems tokens of length <= 3
 * - strips one known RU ending, but only if the remaining root stays >= 3 chars
 */
export function stemWord(word) {
  let w = String(word || '').toLowerCase().replace(/ё/g, 'е').replace(/й/g, 'и');
  if (!w) return '';
  if (/\d/.test(w)) return w;            // technical token / brand with digit — keep as-is
  if (w.length <= 3) return w;
  for (const end of ENDINGS) {
    if (w.length - end.length >= 3 && w.endsWith(end)) {
      return w.slice(0, w.length - end.length);
    }
  }
  return w;
}

/**
 * normalizeAndTokenize(text) → array of useful STEMMED tokens.
 * - lowercases; ё→е
 * - keeps hyphenated commercial/technical terms with digits (WD-40, AISI-304)
 * - drops punctuation/garbage and stopwords
 * - applies stemWord to each surviving token (digit/hyphen tokens preserved)
 */
export function normalizeAndTokenize(text) {
  const raw = String(text || '').toLowerCase().replace(/ё/g, 'е');
  // token = letters/digits, allowing internal hyphens between alphanumerics (wd-40)
  const matches = raw.match(/[a-zа-я0-9]+(?:-[a-zа-я0-9]+)*/gi) || [];
  const out = [];
  for (const tok of matches) {
    if (tok.length < 2) continue;
    // keep pure stopwords out (only when they have no digit)
    if (!/\d/.test(tok) && STOPWORDS.has(tok)) continue;
    const stem = stemWord(tok);
    if (stem && stem.length >= 2) out.push(stem);
  }
  return out;
}

/**
 * CONCEPT_MAP — lightweight commercial→customs concept dictionary.
 * Each entry: triggers, expanded (customs-language phrases), preferred_chapters,
 * excluded_chapters, required_attributes. Kept small and curated.
 */
export const CONCEPT_MAP = {
  karcher: {
    triggers: ['керхер', 'керхеры', 'karcher', 'kärcher', 'керхэр', 'кёрхер'],
    expanded: ['мойки высокого давления', 'моечная машина'],
    preferred_chapters: ['84'],
    code_hints: ['8424'],
    excluded_chapters: ['22', '85'],
    required_attributes: [],
  },
  'wd-40': {
    triggers: ['wd-40', 'wd40', 'вд-40', 'вд40'],
    expanded: ['смазочные', 'смазка', 'антикоррозийные'],
    preferred_chapters: ['34', '27'],
    code_hints: ['3403'],
    excluded_chapters: ['22', '85'],
    required_attributes: ['состав/назначение (смазка, очиститель или антикор)'],
  },
  kragi: {
    triggers: ['краги', 'крага'],
    expanded: ['перчатки', 'рукавицы'],
    preferred_chapters: ['42', '61', '62'],
    code_hints: ['4203', '6116', '6216'],
    excluded_chapters: [],
    required_attributes: ['материал (кожа или текстиль)'],
  },
  bolgarka: {
    triggers: ['болгарка', 'болгарки', 'ушм'],
    expanded: ['шлифовальные', 'угловые'],
    preferred_chapters: ['84', '85'],
    code_hints: ['8467'],
    excluded_chapters: [],
    required_attributes: [],
  },
  perforator: {
    triggers: ['перфоратор', 'перфораторы'],
    expanded: ['перфораторы', 'ударные'],
    preferred_chapters: ['84', '85'],
    code_hints: ['8467'],
    excluded_chapters: [],
    required_attributes: [],
  },
  fancoil: {
    triggers: ['фанкойл', 'фанкойлы', 'fancoil', 'фэнкойл'],
    expanded: ['кондиционирования', 'вентиляторный'],
    preferred_chapters: ['84'],
    code_hints: ['8415'],
    excluded_chapters: [],
    required_attributes: [],
  },
  truba_stalnaya: {
    triggers: ['труба', 'трубы', 'трубка'],
    expanded: ['трубы', 'стальные'],
    preferred_chapters: ['73'],
    code_hints: ['7304', '7305', '7306'],
    excluded_chapters: [],
    required_attributes: ['материал и назначение трубы'],
  },
};

// Precompute stemmed trigger/expanded token sets once at module load.
const CONCEPT_INDEX = Object.entries(CONCEPT_MAP).map(([id, c]) => ({
  id,
  ...c,
  triggerStems: new Set(c.triggers.map(stemWord)),
  triggerRaw: new Set(c.triggers.map((t) => t.toLowerCase())),
  expandedStems: uniq(c.expanded.flatMap(normalizeAndTokenize)),
}));

function uniq(arr) { return Array.from(new Set(arr)); }

/**
 * detectConcept(rawTokensLower, stemmedTokens) → matched concept object or null.
 * Matches by raw surface form (brands with digits) or by stemmed form.
 */
export function detectConcept(rawTokensLower, stemmedTokens) {
  const rawSet = new Set(rawTokensLower);
  const stemSet = new Set(stemmedTokens);
  for (const c of CONCEPT_INDEX) {
    for (const t of c.triggerRaw) if (rawSet.has(t)) return c;
    for (const s of c.triggerStems) if (stemSet.has(s)) return c;
  }
  return null;
}

function stemsOf(text, cap = 4000) {
  return new Set(normalizeAndTokenize(String(text || '').slice(0, cap)));
}

function countHits(queryTokens, fieldStemSet) {
  let n = 0;
  for (const t of queryTokens) if (fieldStemSet.has(t)) n++;
  return n;
}

/**
 * scoreCandidate(queryTokens, candidate, activeConcept) → scored candidate.
 * candidate: { code, chapter, title, description, explanation }
 * Score is on a 0..100 scale and is CLAMPED to >= 0 (never negative).
 * Title (краткое наименование) is authoritative; explanations weigh little.
 */
export function scoreCandidate(queryTokens, candidate, activeConcept) {
  const chapter = String(candidate.chapter || (candidate.code || '').slice(0, 2));
  const titleStems = stemsOf(candidate.title);
  const descStems = candidate.description && candidate.description !== candidate.title
    ? stemsOf(candidate.description) : titleStems;
  const explStems = stemsOf(candidate.explanation);

  const titleHits = countHits(queryTokens, titleStems);
  const descHits = countHits(queryTokens, descStems);
  const explHits = countHits(queryTokens, explStems);

  let score = 0;
  score += 24 * Math.min(titleHits, 3);   // authoritative field, up to 72
  score += 6 * Math.min(descHits, 2);     // up to 12
  score += 2 * Math.min(explHits, 3);     // broad, noisy context, up to 6

  const reasons = [];
  if (titleHits > 0) reasons.push(`совпадение по наименованию (${titleHits})`);
  if (explHits > 0) reasons.push('упоминание в пояснениях к группе');

  let conceptPhraseInTitle = false;
  if (activeConcept) {
    if ((activeConcept.preferred_chapters || []).includes(chapter)) {
      score += 18;
      reasons.push(`предпочтительная группа ${chapter}`);
    }
    for (const t of activeConcept.expandedStems) {
      if (titleStems.has(t)) { conceptPhraseInTitle = true; break; }
    }
    if (conceptPhraseInTitle) { score += 12; reasons.push('совпадение с концептом'); }
    if ((activeConcept.excluded_chapters || []).includes(chapter)) {
      score -= 45;
      reasons.push(`исключённая группа ${chapter}`);
    }
  }

  if (activeConcept && Array.isArray(activeConcept.code_hints)) {
    for (const hint of activeConcept.code_hints) {
      if (String(candidate.code || '').startsWith(hint)) {
        score += 15;
        reasons.push(`код в ожидаемой позиции ${hint}xxxx`);
        break;
      }
    }
  }

  if (score < 0) score = 0;               // clamp — never negative
  if (score > 100) score = 100;

  return {
    code: candidate.code,
    chapter,
    description: candidate.title || '',
    tariff: candidate.tariff || '',
    score: Math.round(score),
    confidence: Math.round(score) / 100,
    reasons_for: reasons,
    _hits: { titleHits, descHits, explHits },
  };
}

// Decision thresholds (calibrate on the stress set; kept explicit for review).
export const DECISION = { AUTO_MIN_SCORE: 70, AUTO_MIN_MARGIN: 20 };

/**
 * applyDecisionPolicy(candidates, opts) → decision object.
 * opts: { activeConcept }
 * NEVER fabricates a code. Auto-classify only with strict score + margin.
 */
export function applyDecisionPolicy(candidates, opts = {}) {
  const activeConcept = opts.activeConcept || null;
  const aligned = (c) => activeConcept
    && ((activeConcept.preferred_chapters || []).includes(c.chapter)
        || (activeConcept.code_hints || []).some((h) => String(c.code || '').startsWith(h)));
  const sorted = [...(candidates || [])].sort((a, b) => {
    if (activeConcept) {
      // Surface concept-aligned headings first in review lists (human still decides).
      const d = (aligned(b) ? 1 : 0) - (aligned(a) ? 1 : 0);
      if (d !== 0) return d;
    }
    return b.score - a.score;
  });

  if (!sorted.length) {
    return {
      status: 'review',
      code: '',
      confident: false,
      confidence: 0,
      requiresClarification: true,
      candidates: [],
      reason: 'Совпадений в базе ТН ВЭД не найдено — требуется ручная проверка.',
      missing_information: missingInfo(activeConcept, []),
    };
  }

  const top = sorted[0];
  const second = sorted[1] || { score: 0 };
  const margin = top.score - second.score;
  const confidence = top.score / 100;
  const trimmed = (n) => sorted.slice(0, n).map((c) => ({
    code: c.code, description: c.description, chapter: c.chapter,
    tariff: c.tariff, score: c.score, confidence: c.confidence, reasons_for: c.reasons_for,
  }));

  // Concept-alignment guard: if a commercial concept was detected, only auto-classify
  // when the winning code is structurally consistent with that concept (expected
  // chapter or heading). This blocks spurious lexical wins (e.g. the generic phrase
  // "высокого давления" matching plastic laminates for a "Керхер" query).
  const conceptAligned = !activeConcept
    || (activeConcept.preferred_chapters || []).includes(top.chapter)
    || (activeConcept.code_hints || []).some((h) => String(top.code || '').startsWith(h));

  if (top.score >= DECISION.AUTO_MIN_SCORE && margin >= DECISION.AUTO_MIN_MARGIN && conceptAligned) {
    return {
      status: 'classified',
      code: top.code,
      confident: true,
      confidence,
      requiresClarification: false,
      candidates: trimmed(5),
      reason: `Уверенное совпадение (score ${top.score}, отрыв ${margin}).`,
      missing_information: [],
    };
  }

  return {
    status: 'review',
    code: '',                              // never fabricate
    confident: false,
    confidence,
    requiresClarification: true,
    candidates: trimmed(10),
    reason: top.score < DECISION.AUTO_MIN_SCORE
      ? `Недостаточно уверенности (score ${top.score} < ${DECISION.AUTO_MIN_SCORE}).`
      : `Кандидаты близки (отрыв ${margin} < ${DECISION.AUTO_MIN_MARGIN}) — нужен выбор человека.`,
    missing_information: missingInfo(activeConcept, sorted),
  };
}

function missingInfo(activeConcept, sorted) {
  const out = [];
  if (activeConcept && (activeConcept.required_attributes || []).length) {
    out.push(...activeConcept.required_attributes);
  }
  const chapters = uniq(sorted.slice(0, 8).map((c) => c.chapter));
  if (chapters.length > 1) {
    out.push(`Уточните товарную группу (кандидаты в группах: ${chapters.join(', ')}): материал, назначение или тип изделия.`);
  }
  if (!out.length) {
    out.push('Уточните характеристики товара (материал, назначение, тип) для выбора 10-значного кода.');
  }
  return out;
}

export default {
  stemWord,
  normalizeAndTokenize,
  CONCEPT_MAP,
  detectConcept,
  scoreCandidate,
  applyDecisionPolicy,
  DECISION,
};
