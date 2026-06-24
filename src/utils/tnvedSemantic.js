/**
 * tnvedSemantic.js — GLORIX Neural Semantic Search Engine
 * ========================================================
 * Использует BERT-эмбеддинги (paraphrase-multilingual-MiniLM-L6-v2)
 * для семантического поиска кодов ТН ВЭД по смысловому сходству.
 *
 * Архитектура:
 *   BUILD-TIME: scripts/generate_embeddings.py (запустить один раз локально)
 *     → скачивает нейромодель с HuggingFace
 *     → генерирует 384-мерные эмбеддинги для всех 13 289 кодов
 *     → сохраняет в public/tnved_docvecs.bin
 *
 *   RUNTIME (браузер):
 *     → @xenova/transformers кодирует запрос пользователя в 384-мерный вектор
 *     → Косинусное сходство с предвычисленной матрицей
 *     → Возвращает топ-5 кодов по смыслу
 *
 * Модель загружается в браузере один раз (~45 МБ) и кешируется.
 * Все вычисления — локально, без внешних API.
 */

const MODEL_ID  = 'Xenova/paraphrase-multilingual-MiniLM-L6-v2';
const CACHE_KEY = 'glorix_semantic_ready';

let _pipeline  = null;   // трансформерный кодировщик
let _docVecs   = null;   // Float32Array, shape (N, DIMS)
let _semCodes  = null;   // string[], len N
let _dims      = 384;
let _loadPromise = null;

// ── Статус готовности ─────────────────────────────────────────────────────────
export let semanticReady = false;
export let semanticStatus = 'idle';  // 'idle' | 'loading' | 'ready' | 'unavailable'

// ── Загрузка индекса и модели ─────────────────────────────────────────────────
async function loadSemanticEngine() {
  // 1. Проверяем наличие предвычисленных эмбеддингов
  let vecsResp;
  try {
    vecsResp = await fetch('/tnved_docvecs.bin', { method: 'HEAD' });
    if (!vecsResp.ok) throw new Error('not found');
  } catch {
    semanticStatus = 'unavailable';
    console.warn('[Semantic] tnved_docvecs.bin не найден. Запустите scripts/generate_embeddings.py');
    return false;
  }

  semanticStatus = 'loading';

  // 2. Загружаем список кодов
  const codesResp = await fetch('/tnved_semcodes.json');
  _semCodes = await codesResp.json();

  // 3. Загружаем бинарную матрицу эмбеддингов
  const binResp = await fetch('/tnved_docvecs.bin');
  const buf = await binResp.arrayBuffer();
  const header = new Uint32Array(buf, 0, 2);
  const N    = header[0];
  _dims      = header[1];
  _docVecs   = new Float32Array(buf, 8);  // skip 8-byte header

  console.log(`[Semantic] Матрица: ${N} кодов × ${_dims} измерений`);

  // 4. Загружаем BERT-модель через @xenova/transformers
  //    Модель кешируется браузером после первой загрузки (~45 МБ)
  try {
    const { pipeline } = await import('@xenova/transformers');
    _pipeline = await pipeline('feature-extraction', MODEL_ID, {
      quantized: true,   // квантованная версия, быстрее и легче
    });
    console.log(`[Semantic] Нейромодель загружена: ${MODEL_ID}`);
  } catch (e) {
    console.warn('[Semantic] @xenova/transformers недоступен:', e.message);
    semanticStatus = 'unavailable';
    return false;
  }

  semanticReady = true;
  semanticStatus = 'ready';
  return true;
}

// ── Публичный API: предзагрузка ───────────────────────────────────────────────
export function preloadSemanticEngine() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = loadSemanticEngine().catch(e => {
    console.warn('[Semantic] Preload failed:', e.message);
    semanticStatus = 'unavailable';
    _loadPromise = null;
  });
  return _loadPromise;
}

// ── Кодирование запроса в вектор ─────────────────────────────────────────────
async function encodeQuery(text) {
  if (!_pipeline) return null;
  const output = await _pipeline(text, {
    pooling: 'mean',
    normalize: true,   // L2-нормализация
  });
  // output.data — Float32Array размером _dims
  return output.data instanceof Float32Array
    ? output.data
    : new Float32Array(output.data);
}

// ── Косинусное сходство через скалярное произведение (векторы L2-нормированы) ─
function topKCosine(queryVec, k = 5) {
  const N = _semCodes.length;
  const scores = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    let dot = 0;
    const base = i * _dims;
    for (let d = 0; d < _dims; d++) dot += queryVec[d] * _docVecs[base + d];
    scores[i] = dot;
  }

  // Частичная сортировка — только топ-k
  const indices = Array.from({ length: N }, (_, i) => i);
  indices.sort((a, b) => scores[b] - scores[a]);

  return indices.slice(0, k).map(i => ({
    code:  _semCodes[i],
    score: scores[i],
  }));
}

/**
 * semanticSearch(query, topK?)
 *
 * @param {string} query   — описание товара на любом языке
 * @param {number} topK    — количество результатов (default 5)
 * @returns {Promise<Array<{code: string, score: number}> | null>}
 *          null — если семантический движок недоступен (fallback to BM25)
 */
export async function semanticSearch(query, topK = 5) {
  // Ленивая инициализация
  if (!semanticReady) {
    if (semanticStatus === 'unavailable') return null;
    await preloadSemanticEngine();
    if (!semanticReady) return null;
  }

  const qVec = await encodeQuery(query);
  if (!qVec) return null;

  return topKCosine(qVec, topK);
}
