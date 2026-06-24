/**
 * tnvedBM25.js — GLORIX Local AI Vector Search Engine v2
 *
 * Реализует BM25 (Best Match 25) — промышленный стандарт векторного поиска
 * (Elasticsearch, Solr, Lucene используют BM25 под капотом).
 *
 * Архитектура:
 *   1. BUILD-TIME: Python строит инвертированный индекс из 13 289 кодов + Пояснений
 *   2. LOAD-TIME:  Браузер загружает /tnved_bm25.json (~6 МБ) один раз, кэширует
 *   3. QUERY-TIME: Запрос токенизируется → BM25-ранжирование → топ-5 кандидатов
 *
 * Параметры BM25: k1=1.5, b=0.75 (стандартные значения Okapi BM25)
 */

const BM25_K1 = 1.5;
const BM25_B  = 0.75;

let _idx     = null;  // { idf, codes, stems, avgdl, N }
let _promise = null;

// ── Стоп-слова (копия из Python-скрипта) ────────────────────────────────────
const STOP = new Set([
  'и','в','на','из','по','от','до','за','не','но','с','к','для','при','как',
  'что','это','все','они','его','или','же','а','о','об','во','со','ко','да',
  'нет','ни','так','уже','был','была','были','если','бы','без','над','под',
  'через','после','перед','между','также','кроме','другой','другие','прочих',
  'товаров','группе','включаются','настоящей','примечания','которые',
  'прочие','раздела','позиции',
]);

function stem(w) {
  return w.length >= 6 ? w.slice(0, 5) : w;
}

function tokenize(text) {
  const words = text.toLowerCase().match(/[а-яё]{3,}/g) || [];
  return words
    .filter(w => !STOP.has(w) && w.length >= 3)
    .map(stem);
}

// ── Загрузка индекса ─────────────────────────────────────────────────────────
async function loadIndex() {
  if (_idx)     return _idx;
  if (_promise) return _promise;

  _promise = fetch('/tnved_bm25.json')
    .then(r => {
      if (!r.ok) throw new Error(`BM25 index fetch: ${r.status}`);
      return r.json();
    })
    .then(data => {
      // Pre-parse stems into arrays for fast query
      data.stemsArr = data.stems.map(s => (s ? s.split(' ') : []));
      _idx = data;
      _promise = null;
      console.log(`[BM25] Индекс загружен: ${data.N} кодов, словарь ${Object.keys(data.idf).length} терминов`);
      return data;
    })
    .catch(err => {
      _promise = null;
      throw err;
    });

  return _promise;
}

/**
 * bm25Search(query, options)
 *
 * @param {string}  query       — название товара на русском
 * @param {object}  options
 * @param {number}  options.topK      — сколько результатов вернуть (default 5)
 * @param {string}  options.prefix    — если задан, фильтровать по prefix кода ТН ВЭД
 * @param {number}  options.minScore  — минимальный BM25 score (default 0.5)
 *
 * @returns {Promise<Array<{code, score}>>}
 */
export async function bm25Search(query, { topK = 5, prefix = null, minScore = 0.3 } = {}) {
  let idx;
  try {
    idx = await loadIndex();
  } catch (e) {
    console.warn('[BM25] Индекс недоступен:', e.message);
    return [];
  }

  const { idf, codes, stemsArr, avgdl } = idx;
  const qTerms = [...new Set(tokenize(query))];
  if (!qTerms.length) return [];

  // Only score terms that exist in our vocabulary
  const qWithIdf = qTerms
    .map(t => [t, idf[t] || 0])
    .filter(([, w]) => w > 0);

  if (!qWithIdf.length) return [];

  const scores = new Float32Array(codes.length);

  for (const [term, termIdf] of qWithIdf) {
    for (let i = 0; i < stemsArr.length; i++) {
      // Skip if prefix filter doesn't match
      if (prefix && !codes[i].startsWith(prefix)) continue;

      const docStems = stemsArr[i];
      const dl = docStems.length || 1;

      // Count term frequency
      let tf = 0;
      for (const s of docStems) {
        if (s === term) tf++;
      }
      if (tf === 0) continue;

      // BM25 formula
      const bm25 = termIdf * (tf * (BM25_K1 + 1)) /
        (tf + BM25_K1 * (1 - BM25_B + BM25_B * dl / avgdl));

      scores[i] += bm25;
    }
  }

  // Collect top-K
  const results = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= minScore) {
      if (prefix && !codes[i].startsWith(prefix)) continue;
      results.push({ code: codes[i], score: scores[i], idx: i });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

/**
 * preloadBM25Index() — вызвать при старте приложения для прогрева
 */
export function preloadBM25Index() {
  loadIndex().catch(() => {});
}
