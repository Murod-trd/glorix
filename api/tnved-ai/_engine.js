/**
 * GLORIX TN VED expert engine — glorix-sql-stemmer-v2 (two-pass dynamic scoring)
 *
 * 100% local, deterministic, explainable. No external AI, no client-side models,
 * NO hardcoded keyword→code maps. Relevance is computed algorithmically:
 *
 *   Pass 1  — dynamic chapter ranking: the cleaned query tokens are matched
 *             against ALL chapter explanation texts (RAM cache of the `chapters`
 *             table). The Top-N chapters are derived on the fly for ANY input.
 *   Pass 2  — candidate scoring: an "anchor token" (the first cleaned token, the
 *             product's base noun) weighs ×10; modifiers weigh ×1. Codes inside
 *             the Top-N chapters get a boost; codes elsewhere are penalised.
 *   Guards  — exclusion markers ("кроме"/"за исключением"/"не включаются"…) next
 *             to a matched token invert to a hard drop; a candidate whose anchor
 *             did not match anywhere is dropped entirely (no garbage in the UI).
 *
 * SAFETY: never fabricates a code. Insufficient confidence → empty code + review.
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
 * normalizeAndTokenize(text) → array of useful STEMMED tokens (in original order).
 * The FIRST element is treated as the anchor token by the scorer.
 */
export function normalizeAndTokenize(text) {
  const raw = String(text || '').toLowerCase().replace(/ё/g, 'е');
  const matches = raw.match(/[a-zа-я0-9]+(?:-[a-zа-я0-9]+)*/gi) || [];
  const out = [];
  for (const tok of matches) {
    if (tok.length < 2) continue;
    if (!/\d/.test(tok) && STOPWORDS.has(tok)) continue;
    const stem = stemWord(tok);
    if (stem && stem.length >= 2) out.push(stem);
  }
  return out;
}

// ── Tunable weights (all explicit; calibrate on a stress set) ────────────────
export const WEIGHTS = {
  ANCHOR: 10,        // multiplier for the base-noun (first) token
  MODIFIER: 1,       // multiplier for every other token
  FIELD_TITLE: 3,    // token found in the code name (authoritative)
  FIELD_EXPL: 1,     // token found in the chapter explanation (broad context)
  CHAPTER_BOOST: 50, // code sits in a dynamically Top-ranked chapter
  CHAPTER_PENALTY: 25, // code sits outside the Top-ranked chapters
};

export const DECISION = {
  TOP_CHAPTERS: 3,      // Pass-1 keeps this many chapters
  AUTO_MIN_SCORE: 80,   // auto-classify only above this
  AUTO_MIN_MARGIN: 25,  // …and only with this lead over #2
  DROP_MIN: 1,          // final hard cutoff — below this a candidate is discarded
};

// ── RAM cache of chapter-level explanation analysis (computed once per chapter) ─
// Feeds BOTH Pass-1 (chapter ranking) and Pass-2 (per-candidate scoring). Max 96
// entries, so this stays microscopic and makes scoring O(tokens), not O(text).
const _EXPL_CACHE = new Map();
const _EXCL_MARKER = /(кроме|за\s+исключ|не\s+включ|не\s+относ|исключа|не\s+вход)/i;
const _EXPL_CAP = 300000; // chapter notes can be ~90 KB — index the whole text once

function explDataFor(chapter, rawText) {
  const key = chapter || '??';
  const cached = _EXPL_CACHE.get(key);
  if (cached && cached._src === rawText) return cached;
  const text = String(rawText || '').slice(0, _EXPL_CAP);
  const stems = new Set(normalizeAndTokenize(text));
  const exclStems = new Set();
  for (const seg of text.split(/[\n.;•]/)) {
    if (_EXCL_MARKER.test(seg)) {
      for (const st of normalizeAndTokenize(seg)) exclStems.add(st);
    }
  }
  const data = { stems, exclStems, _src: rawText };
  _EXPL_CACHE.set(key, data);
  return data;
}

function stemsOf(text, cap = 4000) {
  return new Set(normalizeAndTokenize(String(text || '').slice(0, cap)));
}

// Morphology-tolerant match: exact, or a shared >=4-char prefix (handles stemmer
// residue like «стальн»↔«стал», «оцинкован»↔«оцинков»). Universal, not a keyword map.
function matchTok(tok, arr) {
  const n = tok.length;
  if (n < 4) return arr.indexOf(tok) !== -1;
  const p4 = tok.slice(0, 4);
  for (let i = 0; i < arr.length; i++) {
    const s = arr[i];
    if (s === tok) return true;
    if (s.length >= 4 && (s.startsWith(p4) || tok.startsWith(s.slice(0, 4)))) return true;
  }
  return false;
}

/**
 * Pass 1 — rankTopChapters(tokens, anchor, allChapters, N)
 * Dynamically returns a Set of the N most relevant chapter codes ("NN") for the
 * query, by intersecting cleaned tokens with each chapter's explanation text.
 * The anchor token dominates (×ANCHOR). Chapters that EXCLUDE the anchor are skipped.
 */
export function rankTopChapters(tokens, anchor, candidates, N = DECISION.TOP_CHAPTERS) {
  // Dynamic chapter relevance derived from the NOMENCLATURE (code names), not from
  // the noisy chapter prose. A chapter is relevant when the anchor (base noun)
  // actually appears in code TITLES there; modifiers add weight. Fully universal.
  const byChapter = new Map();
  for (const c of (candidates || [])) {
    const ch = String(c.chapter || (c.code || '').slice(0, 2));
    const tarr = [...stemsOf(c.title)];
    if (!anchor || !matchTok(anchor, tarr)) continue;   // base noun must be in the NAME
    let s = WEIGHTS.ANCHOR;
    for (const tok of tokens) {
      if (tok !== anchor && matchTok(tok, tarr)) s += WEIGHTS.MODIFIER;
    }
    byChapter.set(ch, Math.max(byChapter.get(ch) || 0, s));
  }
  const ranked = [...byChapter.entries()].sort((a, b) => b[1] - a[1]);
  return new Set(ranked.slice(0, Math.max(1, N)).map((e) => e[0]));
}

export function scoreCandidate(tokens, candidate, ctx = {}) {
  const anchor = ctx.anchor != null ? ctx.anchor : (tokens[0] || '');
  const topChapters = ctx.topChapters instanceof Set
    ? ctx.topChapters : new Set(Array.isArray(ctx.topChapters) ? ctx.topChapters : []);
  const chapter = String(candidate.chapter || (candidate.code || '').slice(0, 2));

  const titleArr = [...stemsOf(candidate.title)];
  const descArr = (candidate.description && candidate.description !== candidate.title)
    ? [...stemsOf(candidate.description)] : titleArr;
  const expl = explDataFor(chapter, candidate.explanation);

  // Hard exclusion: the chapter note excludes the base noun → invert to a drop.
  if (anchor && expl.exclStems.has(anchor)) {
    return { code: candidate.code, chapter, drop: true, drop_reason: `группа ${chapter} исключает «${anchor}»` };
  }

  const anchorInTitle = !!anchor && (matchTok(anchor, titleArr) || matchTok(anchor, descArr));
  const anchorInExpl = !!anchor && expl.stems.has(anchor);

  // Drop rule: the base noun must appear in the code NAME. Matching only the
  // (verbose, cross-topic) chapter prose is NOT enough — otherwise "труба
  // стальная" leaks into the plastics chapter whose note also mentions "трубы".
  if (anchor && !anchorInTitle) {
    return { code: candidate.code, chapter, drop: true, drop_reason: `опорное слово «${anchor}» не найдено в наименовании` };
  }

  let score = 0;
  const reasons = [];
  const seen = new Set();
  for (const tok of tokens) {
    if (seen.has(tok)) continue;
    seen.add(tok);
    const w = (tok === anchor) ? WEIGHTS.ANCHOR : WEIGHTS.MODIFIER;
    if (matchTok(tok, titleArr) || matchTok(tok, descArr)) score += w * WEIGHTS.FIELD_TITLE;
    else if (expl.stems.has(tok)) score += w * WEIGHTS.FIELD_EXPL;
  }
  if (anchorInTitle) reasons.push(`опорное слово «${anchor}» в наименовании (×${WEIGHTS.ANCHOR})`);
  else if (anchorInExpl) reasons.push(`опорное слово «${anchor}» в пояснениях`);

  const inTop = topChapters.has(chapter);
  if (topChapters.size) {
    if (inTop) { score += WEIGHTS.CHAPTER_BOOST; reasons.push(`глава ${chapter} — в Топ-релевантных (+${WEIGHTS.CHAPTER_BOOST})`); }
    else { score -= WEIGHTS.CHAPTER_PENALTY; reasons.push(`глава ${chapter} вне Топ-релевантных (−${WEIGHTS.CHAPTER_PENALTY})`); }
  }

  if (score < 0) score = 0;

  return {
    code: candidate.code,
    chapter,
    description: candidate.title || '',
    tariff: candidate.tariff || '',
    score: Math.round(score),
    confidence: Math.min(1, Math.round(score) / 100),
    reasons_for: reasons,
    drop: false,
    _anchorHit: anchorInTitle || anchorInExpl,
    _inTop: inTop,
  };
}

function genericMissing(pool) {
  const out = [];
  const chapters = Array.from(new Set(pool.slice(0, 8).map((c) => c.chapter)));
  if (chapters.length > 1) {
    out.push(`Уточните товарную группу (кандидаты в главах: ${chapters.join(', ')}): материал, назначение или тип изделия.`);
  } else {
    out.push('Уточните характеристики товара (материал, назначение, тип) для выбора 10-значного кода.');
  }
  return out;
}

/**
 * applyDecisionPolicy(candidates) — filters dropped/below-threshold candidates,
 * ranks the survivors, and decides classify vs review. Never fabricates a code;
 * never returns garbage candidates (dropped ones are gone).
 */
export function applyDecisionPolicy(candidates) {
  const pool = (candidates || []).filter((c) => c && !c.drop && c.score >= DECISION.DROP_MIN);
  pool.sort((a, b) => b.score - a.score);

  if (!pool.length) {
    return {
      status: 'review',
      code: '',
      confident: false,
      confidence: 0,
      requiresClarification: true,
      candidates: [],
      reason: 'Нет релевантных кандидатов: опорное слово товара не подтвердилось в номенклатуре. Требуется ручная проверка.',
      missing_information: genericMissing([]),
    };
  }

  const top = pool[0];
  const second = pool[1] || { score: 0 };
  const margin = top.score - second.score;
  const confidence = Math.min(1, top.score / 100);
  const trimmed = (n) => pool.slice(0, n).map((c) => ({
    code: c.code, description: c.description, chapter: c.chapter,
    tariff: c.tariff, score: c.score, confidence: c.confidence, reasons_for: c.reasons_for,
  }));

  if (top.score >= DECISION.AUTO_MIN_SCORE && margin >= DECISION.AUTO_MIN_MARGIN && top._anchorHit) {
    return {
      status: 'classified',
      code: top.code,
      confident: true,
      confidence,
      requiresClarification: false,
      candidates: trimmed(5),
      reason: `Уверенное совпадение (score ${top.score}, отрыв ${margin}, опорное слово подтверждено).`,
      missing_information: [],
    };
  }

  return {
    status: 'review',
    code: '',
    confident: false,
    confidence,
    requiresClarification: true,
    candidates: trimmed(10),
    reason: top.score < DECISION.AUTO_MIN_SCORE
      ? `Недостаточно уверенности (score ${top.score} < ${DECISION.AUTO_MIN_SCORE}).`
      : `Кандидаты близки (отрыв ${margin} < ${DECISION.AUTO_MIN_MARGIN}) — нужен выбор человека.`,
    missing_information: genericMissing(pool),
  };
}

export default {
  stemWord,
  normalizeAndTokenize,
  rankTopChapters,
  scoreCandidate,
  applyDecisionPolicy,
  WEIGHTS,
  DECISION,
};
