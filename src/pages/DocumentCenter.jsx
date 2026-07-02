import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';
import { searchHsCodes, translateProductNameToRu } from '../data/hsCodes';
import { PRODUCT_UNITS } from '../data/marketplace';
import { healthTnvedAi, classifyBatchTnved } from '../services/tnvedAiClient';
import { docConfig, createDocJob, getDocJob, getDocRows, pauseDocJob, resumeDocJob, cancelDocJob, retryDocJob } from '../services/docAiClient';
import { SUBAI_MODULES } from '../ai/glorixAiRegistry';

// Нормализация числового поля из Excel:
// Убирает валютный суффикс (UZS, USD, руб, $...), пробелы как разделитель тысяч,
// определяет правильный десятичный разделитель (запятая или точка).
// Примеры: "2 000" → "2000", "10 190,07 UZS" → "10190.07", "1,500" → "1500"
function normalizeNum(s = '') {
  let c = s.trim().replace(/[^\d\s,.-]/g, '').trim();
  c = c.replace(/\s+/g, '');
  const lastComma = c.lastIndexOf(',');
  const lastDot   = c.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    c = lastDot > lastComma
      ? c.replace(/,/g, '')
      : c.replace(/\./g, '').replace(',', '.');
  } else if (lastComma > -1) {
    const afterComma = c.slice(lastComma + 1);
    c = /^\d{3}$/.test(afterComma)
      ? c.replace(/,/g, '')
      : c.replace(',', '.');
  }
  return c;
}

// Canonical unit synonyms → a value that EXISTS in PRODUCT_UNITS.
// Unknown units are NEVER guessed (never silently "кг"); they return '' (review).
const _UNIT_CANON = (() => {
  const map = {};
  const add = (canon, aliases) => aliases.forEach(a => { map[a] = canon; });
  add('шт',    ['шт','штука','штуки','штук','ед','единица','единиц','pcs','pc','piece','pieces','ea','штук.']);
  add('кг',    ['кг','kg','килограмм','килограммов']);
  add('тонна', ['т','тн','тонна','тонн','ton','tonne']);
  add('л',     ['л','литр','литра','литров','liter','litre','ltr']);
  add('м',     ['м','m','метр','метра','метров']);
  add('м²',    ['м2','м²','кв.м','квм','sqm']);
  add('м³',    ['м3','м³','куб.м','кубм','cbm']);
  add('пог.м', ['пог.м','пм','п.м','погм','погм.']);
  add('рулон', ['рулон','рулона','рулонов','roll','rolls']);
  add('мешок', ['мешок','мешка','мешков','bag','bags']);
  add('упак',  ['упак','упаковка','упаковки','упаковок','pack','упк']);
  add('паллет',['паллет','паллета','паллеты','пал','pallet','pallets']);
  add('компл', ['компл','комплект','комплекта','комплектов','set','sets','kit']);
  return map;
})();

function canonUnit(s = '') {
  const key = String(s || '').trim().toLowerCase().replace(/\.+$/, '');
  if (!key) return '';
  return _UNIT_CANON[key] || '';
}

// Percentage / VAT-like cell (e.g. "18%", "20 %", "НДС 18") — must NEVER become price.
function looksLikePercent(s = '') {
  const t = String(s || '').trim().toLowerCase();
  if (/\b(ндс|vat|tax|ставка)\b/.test(t)) return true;   // explicit VAT/tax label
  return /^\d{1,3}([.,]\d+)?\s*%$/.test(t);              // a bare "18%" / "20 %" (not free text like "≤14%")
}

// A bare 1–2 digit common VAT rate (10,12,15,18,20…) that is NOT the final money
// value in a row is treated as VAT, never as price.
function isBareVatRate(s = '') {
  const t = String(s || '').trim();
  return /^\d{1,2}$/.test(t) && [5, 10, 12, 15, 18, 20].includes(parseInt(t, 10));
}

// A cell is "money-like" (price/qty candidate) only if it is numeric — digits with
// optional separators / currency — and contains NO other letters. This keeps spec
// text with embedded numbers (e.g. "М400", "ГОСТ 7798", "≤14%") OUT of price/qty.
function isMoneyLike(s = '') {
  const t = String(s || '').trim();
  if (!/\d/.test(t)) return false;
  const core = t
    .replace(/[\s]*(usd|eur|rub|uzs|kzt|uah|byn|azn|amd|gel|tjs|tmt|kgs|mdl|cny|try|gbp|jpy|сум|руб|тенге|тг|₽|\$|€|₸|₴|¥|£|֏|₾)\.?$/i, '')
    .trim();
  return /^-?[\d.,\u00A0 ]+$/.test(core);
}

// From the cells that follow qty, pick the unit price + trailing specs.
// Rules: drop percent/VAT cells; if the first numeric is a bare VAT rate and a
// later numeric exists, the price is the later (rightmost real money) value.
function moneyAndSpecs(cells) {
  const cleaned = (cells || []).filter(c => !looksLikePercent(c));
  const nums = cleaned.map((c, i) => ({ c, i })).filter(x => isMoneyLike(x.c));
  let pick = nums[0] || null;
  if (nums.length >= 2 && isBareVatRate(nums[0].c)) pick = nums[1];
  const price = pick ? normalizeNum(pick.c) : '';
  const usedIdx = pick ? pick.i : -1;
  const specs = cleaned.filter((c, i) => i > usedIdx && !isMoneyLike(c)).join(' ').trim();
  return { price, specs };
}

const isTnvedCode = (s) => /^\d{8,10}$/.test((s || '').replace(/\s/g, ''));

// ── Header detection (column mapping when a header row is present) ──────────
const _HEADER_MAP = [
  ['name',  ['наименование','описание товар','описание','товар','name','description','product','номенклатура']],
  ['tnved', ['тн вэд','тнвэд','код тн вэд','hs code','hscode','tn ved','hs']],
  ['qty',   ['кол-во','количество','qty','quantity','к-во','кол']],
  ['unit',  ['ед.изм','ед изм','ед. изм','ед','unit','uom','единица измерения','единица']],
  ['price', ['цена за ед','цена за единицу','цена','unit price','price']],
  ['amount',['стоимость','сумма','amount','total','итого по строке']],
  ['vat',   ['ставка ндс','ндс %','ндс%','% ндс','ндс','vat','tax','ставка']],
  ['specs', ['характеристики','характеристика','примечания','примечание','notes','specs','spec']],
];
function classifyHeaderCell(s = '') {
  const t = String(s || '').trim().toLowerCase();
  if (!t) return null;
  for (const [field, keys] of _HEADER_MAP) {
    if (keys.some(k => t === k || t.startsWith(k))) return field;
  }
  return null;
}
function detectHeader(row) {
  const map = {};
  let hits = 0;
  (row || []).forEach((cell, idx) => {
    const f = classifyHeaderCell(cell);
    if (f && map[f] === undefined) { map[f] = idx; hits++; }
  });
  return (hits >= 2 && map.name !== undefined) ? map : null;
}

// Parse Excel-like paste into { name, tnved, qty, unit, price, specs } rows.
// Safety rules (Glorix AI, not a dumb algorithm):
//   - unknown unit → '' (review), never silently "кг"
//   - VAT/percent cells (18, 18%, НДС) are excluded from price/qty
//   - decimal comma (699,48 / 13 352,69) parsed as a number
//   - uses header row when present, otherwise safe positional heuristics
function parsePaste(text) {
  const parseExcelTSV = (raw) => {
    const rows = [];
    let cols = [], field = '', inQ = false;
    for (let i = 0; i <= raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') {
        if (inQ && raw[i+1] === '"') { field += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === '\t' && !inQ) {
        cols.push(field.trim()); field = '';
      } else if ((ch === '\n' || ch === '\r' || ch === undefined) && !inQ) {
        if (ch === '\r' && raw[i+1] === '\n') i++;
        cols.push(field.trim()); field = '';
        if (cols.some(c => c)) rows.push(cols);
        cols = [];
      } else {
        field += (ch || '');
      }
    }
    return rows;
  };
  const rawRows = parseExcelTSV((text || '').trim());
  if (!rawRows.length) return [];

  const SKIP_WORDS = new Set([
    'наименование','описание','description','name','товар','product',
    '№','no','n/n','п/п','номер','поз','позиция',
    'итого','итог','total','всего','сумма итого','grand total',
  ]);
  const isHeaderName = (n) => {
    const w = (n || '').trim().toLowerCase();
    return SKIP_WORDS.has(w) || [...SKIP_WORDS].some(h => w.startsWith(h + ' ') || w.startsWith(h + '/'));
  };
  const isNumberOnly = (n) => /^\d{1,3}$/.test((n || '').trim());

  const clean = (r) => {
    if (!r || !r.name) return null;
    if (isHeaderName(r.name) || isNumberOnly(r.name)) return null;
    return r;
  };

  // ── Path A: header-based mapping ─────────────────────────────────────────
  const header = detectHeader(rawRows[0]);
  if (header) {
    const g = (row, idx) => (idx !== undefined && idx >= 0 ? (row[idx] || '') : '');
    const out = [];
    for (let ri = 1; ri < rawRows.length; ri++) {
      const row = rawRows[ri];
      const name = g(row, header.name).trim();
      if (!name || isHeaderName(name) || isNumberOnly(name)) continue;
      const tnvedCell = g(row, header.tnved).trim();
      const tnved = tnvedCell.replace(/\s/g, '');
      const qty = normalizeNum(g(row, header.qty));
      const unit = canonUnit(g(row, header.unit)); // '' if unknown → review
      let price = normalizeNum(g(row, header.price));
      if (!price && header.amount !== undefined) {
        const amt = parseFloat(normalizeNum(g(row, header.amount)));
        const q = parseFloat(qty);
        if (amt > 0 && q > 0) price = String(+(amt / q).toFixed(2));
      }
      const specs = g(row, header.specs).trim();
      out.push({ name, tnved: isTnvedCode(tnved) ? tnved : tnvedCell, qty, unit, price, specs });
    }
    return out.map(clean).filter(Boolean);
  }

  // ── Path B: header-less — merge multi-line names, then safe heuristics ────
  const mergedRows = [];
  for (let ri = 0; ri < rawRows.length; ri++) {
    const row = rawRows[ri];
    if (isHeaderName(row[0])) continue;
    const hasData = row.slice(1).some(c => parseFloat((c||'').replace(/[\s,]/g,'')) > 0);
    if (!hasData && row[0] && row[0].trim()) {
      const next = rawRows[ri + 1];
      const nextHasData = next && !isHeaderName(next[0]) &&
        next.slice(1).some(c => parseFloat((c||'').replace(/[\s,]/g,'')) > 0);
      if (nextHasData) {
        const merged = [...next];
        merged[0] = row[0].trim() + ' ' + (next[0] || '').trim();
        mergedRows.push(merged);
        ri++;
        continue;
      }
    } else {
      mergedRows.push([...row]);
    }
  }

  return mergedRows.map(cols => {
    const name = cols[0] || '';
    if (!name) return null;

    let rest = cols.slice(1);
    let tnved = '';
    const col1clean = (rest[0] || '').replace(/\s/g, '');
    if (!rest[0] || isTnvedCode(col1clean)) {
      tnved = rest[0] || '';
      rest = rest.slice(1);
    }

    let qty = '', unit = '', price = '', specs = '';   // unit default '' (never "кг")
    const unitIdx = rest.findIndex(c => canonUnit(c) !== '');

    if (unitIdx >= 0) {
      unit = canonUnit(rest[unitIdx]);
      const before = rest.slice(0, unitIdx);
      const after  = rest.slice(unitIdx + 1);
      const beforeNum = [...before].reverse().find(c => isMoneyLike(c) && !looksLikePercent(c));
      if (beforeNum) {
        // … qty | unit | [vat] | price | [specs] …
        qty = normalizeNum(beforeNum);
        ({ price, specs } = moneyAndSpecs(after));
      } else {
        // unit BEFORE qty: … unit | qty | [vat] | price | [specs] …
        const afterClean = after.filter(c => !looksLikePercent(c));
        const qCell = afterClean.find(c => isMoneyLike(c));
        if (qCell) {
          qty = normalizeNum(qCell);
          ({ price, specs } = moneyAndSpecs(afterClean.slice(afterClean.indexOf(qCell) + 1)));
        }
      }
    } else {
      // No unit column — positional: qty then price (percent/VAT excluded).
      const restClean = rest.filter(c => !looksLikePercent(c));
      const qCell = restClean.find(c => isMoneyLike(c));
      qty = qCell ? normalizeNum(qCell) : '';
      ({ price, specs } = moneyAndSpecs(qCell ? restClean.slice(restClean.indexOf(qCell) + 1) : restClean));
    }

    return { name, tnved, qty, unit, price, specs };
  }).map(clean).filter(Boolean);
}

// Summarize a parsed import for the review panel (UI only; no data mutation).
function summarizeImport(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let uncertainUnit = 0, missingPrice = 0, review = 0;
  for (const r of list) {
    const noUnit = !r.unit;
    const noPrice = !r.price || parseFloat(r.price) <= 0;
    if (noUnit) uncertainUnit++;
    if (noPrice) missingPrice++;
    if (noUnit || noPrice) review++;
  }
  return { total: list.length, uncertainUnit, missingPrice, review };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Универсальный словарь ТН ВЭД ЕАЭС (8/10-значные коды).
// Покрывает: кабели, металлопрокат, электрооборудование, трубопроводную арматуру,
// строительные материалы, нефтепродукты, резину, химию, продовольствие.
// Проверяется ДО вызова searchHsCodes, чтобы исключить ошибки базы (7312/7115 и др.)
// ═══════════════════════════════════════════════════════════════════════════════
const PRODUCT_TNVED_MAP = [
  // ── КАБЕЛИ И ПРОВОДА (Глава 85) ─────────────────────────────────────────────
  { re: /^(КСРПнг|КСРПнг\(А\)|КСРП|КСПВ|КИПнг)/i,            code: '8544429007' }, // сигнальный огнестойкий
  { re: /^(ВВГ|АВВГнг|АВВГ|ВВГнг|ВВГп|ВВГз|АВВГз)/i,         code: '8544499108' }, // силовой ВВГ
  { re: /^(ПВС|ПВВС|ПУНП|ПУГНП|ПВА|ШВВП|АПУНП)/i,            code: '8544499108' }, // провод гибкий
  { re: /^(КГ |КГнг|КГтп|КГП|КГ-)/i,                          code: '8544499108' }, // кабель гибкий КГ
  { re: /^(NYM|NYY|SWA|H07|H05|YKY|ВБШв|АВБШв)/i,             code: '8544499108' }, // евростандарт
  { re: /кабель|провод|wire|cable/i,                            code: '8544499108' }, // общий провод/кабель

  // ── МЕТАЛЛОПРОКАТ СТАЛЬНОЙ (Глава 72–73) ────────────────────────────────────
  { re: /^арматур/i,                                            code: '7214200000' }, // арматура стальная
  { re: /^(швеллер)/i,                                          code: '7216210000' }, // швеллер
  { re: /^(двутавр|балка\s+стал)/i,                             code: '7216330000' }, // двутавр / балка
  { re: /^(уголок|угловой).*(стал|метал)/i,                    code: '7216100000' }, // уголок стальной
  { re: /^(квадрат|круг|шестигранник).*(стал|метал)/i,         code: '7214999000' }, // сортовой прокат
  { re: /^(профтруб|труб.*профил|профил.*труб)/i,              code: '7306610000' }, // профильная труба
  { re: /^(труб.*бесшов|бесшов.*труб)/i,                       code: '7304399000' }, // бесшовная труба
  { re: /^(труб.*свар|труб.*стал|стал.*труб)/i,                code: '7306400000' }, // сварная стальная труба
  { re: /^(лист.*стал|стал.*лист|листов.*прокат)/i,            code: '7208390000' }, // горячекатаный лист
  { re: /^(оцинк.*лист|лист.*оцинк)/i,                         code: '7210410000' }, // оцинкованный лист
  { re: /^(сетк).*(стал|метал|оцинк)/i,                        code: '7314200000' }, // стальная сетка
  { re: /^болт/i,                                               code: '7318150009' }, // болты
  { re: /^гайк/i,                                               code: '7318160009' }, // гайки
  { re: /^(шайб|гровер)/i,                                     code: '7318220009' }, // шайбы/гровер
  { re: /^(винт|шуруп|саморез)/i,                               code: '7318149900' }, // шурупы/саморезы
  { re: /^(электрод).*(свар)/i,                                 code: '8311100000' }, // сварочные электроды

  // ── МЕДЬ И АЛЮМИНИЙ (Глава 74–76) ───────────────────────────────────────────
  { re: /^(труб.*медн|медн.*труб)/i,                            code: '7411100000' }, // медные трубы
  { re: /^(шин.*медн|медн.*шин|шина.*Cu)/i,                    code: '7408190000' }, // медная шина
  { re: /^(профил.*алюм|алюм.*профил)/i,                       code: '7604210000' }, // алюминиевый профиль
  { re: /^(лист.*алюм|алюм.*лист)/i,                           code: '7606120000' }, // алюминиевый лист
  { re: /^(труб.*алюм|алюм.*труб)/i,                           code: '7608200000' }, // алюминиевые трубы

  // ── ЭЛЕКТРООБОРУДОВАНИЕ (Глава 85) ──────────────────────────────────────────
  { re: /^трансформатор/i,                                      code: '8504310000' }, // трансформатор
  { re: /^(электродвигател|двигател.*электр)/i,                 code: '8501520000' }, // электродвигатель
  { re: /^(автомат.*выкл|выкл.*автом|рубильник)/i,             code: '8536200000' }, // автоматический выключатель
  { re: /^(контактор|пускател)/i,                               code: '8536490000' }, // контактор/пускатель
  { re: /^(реле)/i,                                             code: '8536490000' }, // реле
  { re: /^(щит|шкаф|панель).*(электр|распред|управл)/i,        code: '8537100000' }, // распред. щит/шкаф
  { re: /^(розетк|вилк).*(электр)/i,                           code: '8536690000' }, // розетки/вилки
  { re: /^(светильник|прожектор|люстр)/i,                      code: '9405409800' }, // светильники
  { re: /^(лампа.*LED|LED.*лампа|лампа.*светодиод)/i,          code: '8539500000' }, // LED-лампы
  { re: /^(аккумулятор|акб)/i,                                  code: '8507200000' }, // аккумуляторы
  { re: /^(генератор)/i,                                        code: '8501610000' }, // генератор
  { re: /^(кабельный.*лоток|лоток.*кабел|лоток.*металл)/i,     code: '8547900000' }, // кабельный лоток
  { re: /^(короб.*кабел|кабельный.*короб)/i,                   code: '3925300000' }, // пластиковый кабель-канал
  { re: /^(стабилизатор.*напряж)/i,                             code: '8504409900' }, // стабилизатор напряжения
  { re: /^(ИБП|UPS|источник.*бесперебой)/i,                    code: '8504402000' }, // ИБП
  { re: /^(счётчик.*электр|электросчётчик)/i,                  code: '9028300000' }, // счётчики электроэнергии
  { re: /^(подшипник)/i,                                        code: '8482100000' }, // подшипники

  // ── ТРУБОПРОВОДНАЯ АРМАТУРА (Глава 84) ──────────────────────────────────────
  { re: /^(кран.*шаров|шаров.*кран)/i,                          code: '8481200000' }, // кран шаровой
  { re: /^(задвижк|затвор|кран.*стал)/i,                       code: '8481390000' }, // задвижки/затворы
  { re: /^(клапан)/i,                                           code: '8481809900' }, // клапаны
  { re: /^(вентил).*(трубопровод)/i,                            code: '8481200000' }, // вентиль трубопроводный
  { re: /^(насос|помпа)/i,                                      code: '8413709900' }, // насосы
  { re: /^(компрессор)/i,                                       code: '8414802200' }, // компрессоры
  { re: /^(фитинг.*стал|муфт.*стал|тройник.*стал|отвод.*стал)/i, code: '7307990000' }, // стальные фитинги
  { re: /^(фитинг.*пласт|муфт.*пласт|фитинг.*ПВХ|фитинг.*пп)/i, code: '3917330000' }, // пластиковые фитинги
  { re: /^(труб.*ПВХ|ПВХ.*труб|труб.*полипроп|труб.*пласт)/i, code: '3917210000' }, // пластиковые трубы
  { re: /^(труб.*ПЭ|ПЭ.*труб|полиэтилен.*труб)/i,              code: '3917210000' }, // ПЭ трубы
  { re: /^(фланец)/i,                                           code: '7307910000' }, // фланцы
  { re: /^(отвод).*(металл|стал|чуг|Ду|ду|DN)/i,               code: '7307931100' }, // отводы стальные (elbows)
  { re: /^(тройник).*(металл|стал|чуг|Ду|ду|DN)/i,             code: '7307931900' }, // тройники стальные (tees)
  { re: /^(переход|муфта).*(металл|стал|Ду|ду)/i,              code: '7307991000' }, // переходы/муфты стальные
  { re: /^(заглушк).*(металл|стал|Ду|ду)/i,                    code: '7307990000' }, // заглушки стальные

  // ── ИНСТРУМЕНТЫ И ОСНАСТКА (Глава 82–84) ───────────────────────────────────────
  { re: /^(бур|сверло).*(бетон)/i,                              code: '8207199009' }, // буры по бетону
  { re: /^(сверло).*(металл|по ме)/i,                          code: '8207506000' }, // сверла по металлу
  { re: /^(сверло).*(дерев|по де)/i,                           code: '8207190000' }, // сверла по дереву
  { re: /^(сверло)/i,                                           code: '8207199009' }, // сверла общие
  { re: /^(диск.*отрезн|круг.*отрезн|диск.*шлиф|круг.*шлиф)/i, code: '6804221800' }, // отрезные/шлиф диски
  { re: /^(отрезн.*диск|отрезн.*круг|шлиф.*диск)/i,             code: '6804221800' }, // отрезной диск (обратный порядок)
  { re: /^(бит[аыу]?|насадк).*(шуруп|дрел|шестигр)/i,          code: '8207903000' }, // биты/насадки для шуруповерта
  { re: /^(бит[аыу]?).*(торцев)/i,                                 code: '8207909900' }, // биты и насадки
  { re: /^(пила.*торцов|торцов.*пила|пила.*циркул)/i,           code: '8467223000' }, // дисковые пилы со встроенным эл.мотором
  { re: /^(болгарка|УШМ)/i,                                        code: '8467220000' }, // электро пилы/УШМ
  { re: /^(шпатель)/i,                                          code: '8205591000' }, // шпатели ручные
  { re: /^(нож).*(гипсокарт|строит|универс|монтаж)/i,          code: '8211930000' }, // строительный нож
  { re: /^(степлер)/i,                                          code: '8205598099' }, // скобосшиватель
  { re: /^(листов.*ножниц|ножниц.*электр)/i,                    code: '8467292000' }, // электрические ручные высечные ножницы
  { re: /^(ножниц).*(металл|листов)/i,                             code: '8203300000' }, // ножницы по металлу (в т.ч. листовые)
  { re: /^(пистолет).*(герметик|клей|монтаж)/i,                code: '8205598099' }, // пистолет для герметика
  { re: /^(компрессор.*EPA|компрессор.*EVK)/i,                  code: '8414809000' }, // компрессор (уже есть, дублируем для точности)

  // ── РАСХОДНЫЕ МАТЕРИАЛЫ И СРЕДСТВА ЗАЩИТЫ ───────────────────────────────────
  { re: /^(краги).*(свар)/i,                                     code: '4203210000' }, // краги сварщика (натуральная кожа/спилок)
  { re: /^(перчатк).*(свар|рабоч|защит|ПВХ)/i,                    code: '6116102000' }, // рабочие/трикотажные перчатки с покрытием
  { re: /^(перчатк)/i,                                          code: '6116102000' }, // перчатки трикотажные/прочие
  { re: /^(плёнк|пленк).*(полиэтил|ПЭ|полиэт)/i,              code: '3920102800' }, // полиэтиленовая плёнка ≤0.125мм
  { re: /^(строп).*(текстил|синтет)/i,                          code: '6307909800' }, // текстильные стропы
  { re: /^(строп).*(цеп|стал)/i,                               code: '7316000000' }, // цепные/стальные стропы
  { re: /^(отбивочн.*шнур|шнур.*отбивочн)/i,                   code: '9017801000' }, // шнур/бечёвка
  { re: /^(скотч.*алюм|алюм.*скотч|лента.*алюм|фольг.*лент)/i, code: '7607209000' }, // алюминиевая лента/фольга
  { re: /^(скотч|лента.*клей)/i,                                   code: '3919108000' }, // скотч/клейкие ленты
  // алюминиевая лента перенесена выше в скотч-блок
  { re: /^(сигнальн.*лента|лента.*сигнал)/i,                   code: '3920108900' }, // сигнальная лента ПЭ
  { re: /^(жилк|леска|монофил)/i,                               code: '3916909000' }, // монофильная нить/леска
  { re: /^(серпянк|стеклоткань.*лента|сетк.*строит)/i,         code: '7019690000' }, // серпянка стеклосетка шириной >30см
  { re: /^(мембран).*(гидроизол|кровельн|тераспан|изоспан)/i,  code: '5603129000' }, // гидроизоляционные мембраны
  { re: /^(валик.*маляр|маляр.*валик)/i,                       code: '9603409000' }, // малярный валик
  { re: /^(шланг).*(карчер|высок.*давл|гидро)/i,               code: '4009220000' }, // шланг высокого давления
  { re: /^(WD|WD-40|аэрозол|спрей)|(универс.*спрей)/i,         code: '3403191000' }, // WD-40, аэрозоли, спреи универсальные

  // ── СТРОИТЕЛЬНЫЕ МАТЕРИАЛЫ ───────────────────────────────────────────────────
  { re: /^цемент/i,                                             code: '2523290000' }, // цемент
  { re: /^кирпич/i,                                             code: '6901000000' }, // кирпич
  { re: /^(плит|кафель).*(керам|клинк|напольн|настенн|облиц)/i, code: '6907210000' }, // керамическая плитка
  { re: /^(гранит|мрамор).*(плит|слэб|стол)/i,                 code: '6802210000' }, // гранит/мрамор
  { re: /^(песок|щебень|гравий)/i,                              code: '2517100000' }, // нерудные материалы
  { re: /^(гипс|алебастр)/i,                                    code: '2520100000' }, // гипс
  { re: /^(стекловат|минват|минеральная.*вата|базальтовая.*вата)/i, code: '6806200000' }, // минвата
  { re: /^(пенополистирол|пеноплекс|пенопласт|ЭППС)/i,         code: '3921110000' }, // пенополистирол
  { re: /^(краска|эмаль).*(акрил|водоразб|латекс)/i,           code: '3209100000' }, // водные ЛКМ
  { re: /^(краска|эмаль|алкид)/i,                               code: '3210000000' }, // алкидные ЛКМ
  { re: /^(лак|грунтовк|шпатлёвк|шпатлевк)/i,                  code: '3210000000' }, // лак/грунтовка
  { re: /^(смес.*бетон|бетон.*смес|сух.*смес|кладочн.*смес)/i, code: '3824500000' }, // строит. смеси
  { re: /^(доск|брус|вагонк|рейк).*(хвойн|сосн|ель|лиственниц)/i, code: '4407100000' }, // пиломатериалы хвойные
  { re: /^(доск|брус).*(дуб|бук|ясень)/i,                      code: '4407910000' }, // лиственные п/м
  { re: /^(фанера)/i,                                           code: '4412310000' }, // фанера
  { re: /^(ОСБ|OSB)/i,                                          code: '4410110000' }, // OSB плита
  { re: /^(ДСП|ДВП|МДФ|MDF)/i,                                 code: '4410110000' }, // древесные плиты
  { re: /^(профнастил|металлочерепица)/i,                       code: '7210610000' }, // профнастил
  { re: /^(сэндвич.*панел|панел.*сэндвич)/i,                   code: '3921900000' }, // сэндвич-панели
  { re: /^(стекло).*(листов|флоат|оконн)/i,                    code: '7005210000' }, // листовое стекло
  { re: /^(гипсокарт|ГКЛ)/i,                                   code: '6809110000' }, // гипсокартон
  { re: /^(линолеум)/i,                                         code: '3918100000' }, // линолеум
  { re: /^(ламинат)/i,                                          code: '4418610000' }, // ламинат
  { re: /^(керамзит)/i,                                         code: '6806100000' }, // керамзит

  // ── НЕФТЕПРОДУКТЫ И СМАЗКИ ──────────────────────────────────────────────────
  { re: /^(масло.*моторн|моторн.*масло)/i,                     code: '2710198500' }, // моторное масло
  { re: /^(масло.*трансм|трансмисс.*масло)/i,                  code: '2710198500' }, // трансмиссионное масло
  { re: /^(масло.*гидравл|гидравл.*масло)/i,                   code: '2710198500' }, // гидравлическое масло
  { re: /^(смазк|литол|солидол|консистентная)/i,               code: '2710199800' }, // консистентные смазки

  // ── РЕЗИНОТЕХНИКА ───────────────────────────────────────────────────────────
  { re: /^(шланг|рукав).*(резин|высокого.*давл)/i,             code: '4009120000' }, // резиновые шланги
  { re: /^(прокладк|манжет|уплотнитель|сальник).*(резин)/i,    code: '4016990000' }, // резиновые уплотнения
  { re: /^(ремень).*(клиновой|привод|зубчат)/i,                 code: '4010390000' }, // приводные ремни

  // ── ХИМИЯ И РЕАГЕНТЫ ────────────────────────────────────────────────────────
  { re: /^(серная.*кислот|кислота.*серная)/i,                  code: '2807000000' }, // серная кислота
  { re: /^(каустическая.*сода|едкий.*натр|NaOH)/i,             code: '2815110000' }, // каустическая сода
  { re: /^(кальцинирован.*сода|сода.*кальцин|Na2CO3)/i,        code: '2836200000' }, // кальцинированная сода

  // ── ПРОДОВОЛЬСТВИЕ (Главы 01–24) ────────────────────────────────────────────
  { re: /^пшениц/i,                                             code: '1001990000' }, // пшеница
  { re: /^(мука.*пшен|пшенич.*мука)/i,                         code: '1101000000' }, // мука пшеничная
  { re: /^сахар/i,                                              code: '1701140000' }, // сахар
  { re: /^(хлопок|хлопков.*волокно)/i,                         code: '5201000000' }, // хлопок-волокно
  { re: /^(пряж.*хлопков|хлопков.*пряж)/i,                    code: '5205110000' }, // хлопковая пряжа
  { re: /^(растительное.*масло|масло.*подсолнечн)/i,           code: '1512110000' }, // подсолнечное масло
];

// eslint-disable-next-line no-unused-vars -- legacy regex map retained for reference but intentionally NOT used (AI-only autofill)
function guessProductCode(name) {
  for (const { re, code } of PRODUCT_TNVED_MAP) {
    if (re.test(name.trim())) {
      // if null — will fall through to server TF-IDF via resolveTnved
      return code || null;
    }
  }
  return null;
}

const COUNTRIES = [
  ['UZ','🇺🇿 Узбекистан'], ['KZ','🇰🇿 Казахстан'], ['RU','🇷🇺 Россия'], ['KG','🇰🇬 Киргизия'],
  ['TJ','🇹🇯 Таджикистан'], ['TM','🇹🇲 Туркменистан'], ['AZ','🇦🇿 Азербайджан'], ['AM','🇦🇲 Армения'],
  ['GE','🇬🇪 Грузия'], ['BY','🇧🇾 Беларусь'], ['UA','🇺🇦 Украина'], ['MD','🇲🇩 Молдова'],
  ['CN','🇨🇳 Китай'], ['TR','🇹🇷 Турция'],
];

export default function DocumentCenter() {
  const { accountType } = useAccountType();
  const [tab, setTab] = useState('kp'); // kp | tnved
  const [items, setItems] = useState([{ name: '', tnved: '', qty: '', unit: '', price: '', specs: '' }]);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [generated, setGenerated] = useState('');
  const [kpData, setKpData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [buyer, setBuyer] = useState('');
  const [incoterms, setIncoterms] = useState('DAP');
  const [currency, setCurrency] = useState('USD');
  const [payTerms, setPayTerms] = useState('30% предоплата, 70% по факту отгрузки');
  const [payCustom, setPayCustom] = useState('');
  const [vatRate, setVatRate] = useState(0);
  // ── Glorix AI governance (TN VED SubAI toggle) + country/VAT context ──
  const [tnvedAiOn, setTnvedAiOn] = useState(true);
  const _me = getCurrentUser(accountType);
  const [sellerCountry, setSellerCountry] = useState(_me?.country || 'UZ');
  const [buyerCountry, setBuyerCountry] = useState('');
  const [importSummary, setImportSummary] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null); // {done,total} — fast client-side batch classify
  // GLORIX AI ТН ВЭД backend status (replaces the former, misleading OpenAI key field).
  const [aiStatus, setAiStatus] = useState('checking'); // checking | configured | unavailable | error
  const [autofillMsg, setAutofillMsg] = useState(null);  // UI-only status; NEVER written into generated documents
  useEffect(() => {
    // Backend connectivity is INDEPENDENT of the TN VED AI toggle: always probe
    // /health so "подключён" can show even when the classifier is switched OFF.
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async status probe
    setAiStatus('checking');
    healthTnvedAi().then(h => {
      if (!alive) return;
      if (h?.ok && h?.status === 'configured') setAiStatus('configured');
      else if (h?.unavailable || h?.status === 'unavailable') setAiStatus('unavailable');
      else setAiStatus('error');
    }).catch(() => { if (alive) setAiStatus('error'); });
    return () => { alive = false; };
  }, []);
  const [companyLogo, setCompanyLogo] = useState(() => {
    try { return localStorage.getItem('glorix_company_logo') || null; } catch { return null; }
  });
  const [tnvedQuery, setTnvedQuery] = useState('');
  const [tnvedResults, setTnvedResults] = useState([]);
  const [selectedTnved, setSelectedTnved] = useState(null);
  // ── Backend Document AI job state (frontend is UI only; brain is the backend) ──
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);   // queued|running|paused|completed|cancelled
  const [jobTotals, setJobTotals] = useState(null);
  const [docBackend, setDocBackend] = useState('checking'); // configured|not_configured|error
  const [jobOptTnved, setJobOptTnved] = useState(null); // job.options.tnved — respect the JOB, not the live toggle
  const [offlineMode, setOfflineMode] = useState(false);
  const editsRef = useRef({});   // {row_id: {field:value}} — preserve manual edits across polls
  const pollRef = useRef(null);
  const JOB_KEY = 'glorix_doc_job';
  const jobProcessing = jobStatus === 'running' || jobStatus === 'queued';
  // When a job is loaded, the table reflects the JOB's tnved option, not the live toggle.
  const displayTnved = jobId ? (jobOptTnved !== false) : tnvedAiOn;

  const addItem = () => setItems(prev => [...prev, { name: '', tnved: '', qty: '', unit: '', price: '', specs: '' }]);
  const updateItem = (i, k, v) => {
    const arr = [...items]; arr[i][k] = v; setItems(arr);
    const rid = arr[i]?._rowId;
    if (rid !== undefined && rid !== null) editsRef.current[rid] = { ...(editsRef.current[rid] || {}), [k]: v };
  };
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const applyRowsToItems = (rows) => {
    if (!rows || !rows.length) return;
    setItems(rows.map(r => {
      const n = r.normalized || {};
      const res = r.result || {};
      const base = {
        name: n.name || '',
        tnved: res.final_code || n.existing_tnved || '',
        qty: n.qty || '', unit: n.unit || '', price: n.price || '',
        specs: n.technical_specs || '',
        _rowId: r.row_id, _status: r.status, _result: res, _review: (n.fields_needing_review || []),
      };
      return { ...base, ...(editsRef.current[r.row_id] || {}) };
    }));
  };

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const startPolling = (id) => {
    stopPolling();
    const tick = async () => {
      const st = await getDocJob(id);
      if (!st?.ok) { if (st?.unavailable) setDocBackend('not_configured'); stopPolling(); return; }
      setJobStatus(st.data.status); setJobTotals(st.data.totals);
      if (st.data.options) setJobOptTnved(st.data.options.tnved !== false);
      const rr = await getDocRows(id, 0, 5000);
      if (rr?.ok) applyRowsToItems(rr.data.rows || []);
      if (st.data.status === 'completed' || st.data.status === 'cancelled') stopPolling();
    };
    tick();
    pollRef.current = setInterval(tick, 1500);
  };

  const handlePaste = async () => {
    const text = pasteText;
    if (!text.trim()) return;
    setShowPaste(false); setPasteText(''); setAutofillMsg(null); setOfflineMode(false); setImportSummary(null);
    jobClear();                              // fast path is autonomous — drop any old resumable job
    const rows = parsePaste(text);           // parse locally (instant) — no server needed to split
    if (!rows.length) { setAutofillMsg({ type: 'warn', text: 'Не удалось распознать строки из вставленного текста.' }); return; }
    editsRef.current = {};

    // Seed the table immediately so the user sees all rows at once.
    const seeded = rows.map((r, i) => {
      const hasManual = r.tnved && isTnvedCode(r.tnved);
      return {
        ...r,
        _rowId: i,
        _status: hasManual ? 'skipped_manual' : (tnvedAiOn ? 'pending' : 'normalized'),
        _result: hasManual
          ? { final_code: r.tnved, candidates: [], reason: 'код указан вручную', missing_information: [] }
          : null,
        _review: [],
      };
    });
    setItems(seeded);
    setImportSummary(summarizeImport(rows));

    if (!tnvedAiOn) {
      setAutofillMsg({ type: 'ok', text: `Импортировано строк: ${rows.length}. ТН ВЭД выключен — коды не подбирались.` });
      return;
    }

    // PRIMARY: accurate path — background job on the AI server (laptop GPU judge).
    // The heavy per-row work runs on the backend, so there is NO serverless timeout;
    // the browser only creates the job and polls progress. Codes fill in row-by-row
    // and the run can be paused/resumed. Used whenever the AI backend is connected.
    try {
      const created = await createDocJob(text, { tnved: true });
      if (created && created.ok && created.data && created.data.job_id) {
        const id = created.data.job_id;
        try { localStorage.setItem(JOB_KEY, id); } catch { /* ignore */ }
        setJobId(id);
        setJobStatus(created.data.status || 'queued');
        setJobTotals(created.data.totals || null);
        setJobOptTnved(true);
        setAutofillMsg({ type: 'ok', text: `Запущена обработка на ИИ-сервере: ${rows.length} строк. Точные коды появляются по мере готовности — можно ставить на паузу и продолжать.` });
        startPolling(id);
        return;
      }
      // created.unavailable / not ok → backend not connected: fall through to fast local engine.
    } catch { /* backend unreachable → fast local fallback below */ }

    // FALLBACK (AI server not connected): fast autonomous classification via the
    // Vercel SQLite engine — chunked batches, seconds for the whole list, no laptop
    // and no neural net. Each chunk stays well under the serverless timeout (no 504).
    const need = [];
    seeded.forEach((it, i) => { if (it._status !== 'skipped_manual') need.push({ i, name: it.name }); });
    const CHUNK = 40;
    let done = rows.length - need.length;
    setBatchProgress({ done, total: rows.length });
    try {
      for (let c = 0; c < need.length; c += CHUNK) {
        const slice = need.slice(c, c + CHUNK);
        const resp = await classifyBatchTnved(slice.map((x) => ({ name: x.name })));
        const results = Array.isArray(resp?.results) ? resp.results : [];
        setItems((prev) => {
          const next = [...prev];
          slice.forEach((x, k) => {
            const res = results[k];
            if (!next[x.i]) return;
            if (!res) { next[x.i] = { ...next[x.i], _status: 'review', _result: { final_code: '', candidates: [], reason: 'нет ответа классификатора', missing_information: [] } }; return; }
            next[x.i] = {
              ...next[x.i],
              tnved: res.code || '',
              _status: res.status || 'review',
              _result: {
                final_code: res.code || '',
                candidates: res.candidates || [],
                reason: res.reason || '',
                missing_information: res.missing_information || [],
              },
              ...(editsRef.current[x.i] || {}),   // never overwrite a manual edit
            };
          });
          return next;
        });
        done += slice.length;
        setBatchProgress({ done, total: rows.length });
      }
      setAutofillMsg({ type: 'ok', text: `Готово за секунды: ${rows.length} строк обработано автономным движком (без нейросети и без ноутбука). Уверенные коды проставлены, спорные — «на проверку» с вариантами.` });
    } catch (e) {
      setAutofillMsg({ type: 'warn', text: `Классификатор недоступен: ${e?.message || 'ошибка сети'}. Строки импортированы для ручного ввода.` });
    } finally {
      setBatchProgress(null);
    }
  };

  const jobPause  = async () => { await pauseDocJob(jobId); stopPolling(); const st = await getDocJob(jobId); if (st?.ok) { setJobStatus(st.data.status); setJobTotals(st.data.totals); } };
  const jobResume = async () => { const r = await resumeDocJob(jobId); if (r?.ok) { setJobStatus(r.data.status); startPolling(jobId); } };
  const jobCancel = async () => { await cancelDocJob(jobId); stopPolling(); const st = await getDocJob(jobId); if (st?.ok) { setJobStatus(st.data.status); setJobTotals(st.data.totals); } };
  const jobRetry  = async () => { const r = await retryDocJob(jobId); if (r?.ok) { setJobStatus(r.data.status); startPolling(jobId); } };
  const jobClear  = () => { stopPolling(); setJobId(null); setJobStatus(null); setJobTotals(null); editsRef.current = {}; setOfflineMode(false); setImportSummary(null); try { localStorage.removeItem(JOB_KEY); } catch { /* ignore */ } };

  // Config probe + reconnect to an existing job after a browser refresh.
  useEffect(() => {
    docConfig().then(c => {
      if (c?.ok) setDocBackend('configured');
      else if (c?.unavailable) setDocBackend('not_configured');
      else setDocBackend('error');
    });
    let saved = null;
    try { saved = localStorage.getItem(JOB_KEY); } catch { /* ignore */ }
    if (saved) {
      getDocJob(saved).then(st => {
        if (st?.ok && st.data) { setJobId(saved); setJobStatus(st.data.status); setJobTotals(st.data.totals); setJobOptTnved(st.data.options?.tnved !== false); startPolling(saved); }
        else { try { localStorage.removeItem(JOB_KEY); } catch { /* ignore */ } }
      });
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tnvedLoading, setTnvedLoading] = useState(false);
  const [tnvedMeta, setTnvedMeta] = useState(null); // { source, translatedQuery, translationUnavailable }

  const searchTnved = (q) => {
    setTnvedQuery(q);
    if (q.length < 2) { setTnvedResults([]); setTnvedMeta(null); return; }
    setTnvedLoading(true);
    searchHsCodes(q).then(({ results, source, translatedQuery, translationUnavailable }) => {
      setTnvedResults(results);
      setTnvedMeta({ source, translatedQuery, translationUnavailable });
      setTnvedLoading(false);

      // Перевод названий товаров на русский — фоновая задача, не блокирует
      // отображение результатов (которые видны мгновенно на английском).
      // Основатель явно одобрил это как машинный перевод без гарантии
      // 100% точности для каждой позиции — поэтому переведённое название
      // показывается рядом с английским оригиналом, а не заменяет его, и
      // UI должен честно работать и в случае, если перевод недоступен
      // (оба провайдера отказали) — тогда остаётся английский оригинал.
      results.forEach(item => {
        translateProductNameToRu(item.description).then(translatedName => {
          if (!translatedName) return;
          setTnvedResults(prev => prev.map(r =>
            r.code === item.code ? { ...r, descriptionRu: translatedName } : r
          ));
        });
      });
    });
  };

  // Cross-border → VAT not applied in this document.
  const crossBorder = !!(sellerCountry && buyerCountry && sellerCountry !== buyerCountry);
  const vatApplicable = !crossBorder;

  const totalAmount = items.reduce((s, item) => {
    const qty = parseFloat(item.qty) || 0;
    const price = parseFloat(item.price) || 0;
    return s + qty * price;
  }, 0);

  const generateKP = () => {
    setGenerating(true);
    setTimeout(() => {
      const sellerName = getCurrentUser(accountType).name;
      const kpNum    = `КП-${Date.now().toString().slice(-6)}`;
      const dateStr  = new Date().toLocaleDateString('ru-RU');
      const validStr = new Date(Date.now()+30*24*60*60*1000).toLocaleDateString('ru-RU');
      const fmt = (n) => (parseFloat(n)||0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const validItems = items.filter(i => i.name);
      const missingCodes = validItems.filter(i => !i.tnved).length;
      // Glorix AI governance flags baked into the generated document:
      const tnvedOn = tnvedAiOn;                                   // TN VED column only when SubAI is ON
      const vatOn = !(sellerCountry && buyerCountry && sellerCountry !== buyerCountry); // no VAT cross-border
      const effVat = vatOn ? vatRate : 0;
      const tnColspan = tnvedOn ? 6 : 5;

      const CURR_SYMBOLS = { USD:'$', EUR:'€', RUB:'₽', UZS:'сум', KZT:'₸', UAH:'₴',
        BYN:'Br', AZN:'₼', AMD:'֏', GEL:'₾', TJS:'SM', TMT:'T', KGS:'с', MDL:'L',
        CNY:'¥', TRY:'₺', GBP:'£', JPY:'¥' };
      const currSym = CURR_SYMBOLS[currency] || currency;
      const rowsHtml = validItems.map((item, idx) => {
        const subtotal = (parseFloat(item.qty)||0) * (parseFloat(item.price)||0);
        const bg = idx % 2 === 0 ? '#f5f7fa' : '#ffffff';
        const tnvedColor = item.tnved ? '#1a7a4a' : '#e74c3c';
        const tnvedText  = item.tnved || '⚠ требует кода';
        const td = (content, extra='') => `<td style="padding:8px 10px;border:1px solid #dde3ea;background:${bg};color:#1a2233;font-size:12px;${extra}">${content}</td>`;
        return `<tr>
          ${td(idx+1, 'text-align:center;color:#888;font-size:11px')}
          ${td(`<strong>${item.name}</strong>`)}
          ${tnvedOn ? td(tnvedText, `text-align:center;font-family:monospace;font-size:11px;color:${tnvedColor};letter-spacing:.5px`) : ''}
          ${td(item.unit, 'text-align:center')}
          ${td(fmt(item.qty), 'text-align:right')}
          ${td(fmt(item.price) + ' ' + currSym, 'text-align:right')}
          ${td(`<strong>${fmt(subtotal)} ${currSym}</strong>`, 'text-align:right;color:#1a5c2e')}
        </tr>`;
      }).join('');

      const techSpecs = validItems.filter(i => i.specs);
      const techHtml = techSpecs.length > 0 ? `
        <div style="margin-top:24px;padding-top:14px;border-top:1px solid #dde3ea">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1a2233;margin-bottom:10px">
            Технические характеристики / Technical Specifications
          </div>
          ${techSpecs.map((item,i) => `<div style="font-size:11px;margin-bottom:6px;padding:6px 10px;border-left:3px solid #00d4aa;background:#f8fffe">
            <div style="font-weight:600;margin-bottom:2px">${i+1}. ${item.name}</div>
            <div style="color:#555">${item.specs}</div>
          </div>`).join('')}
        </div>` : '';

      const vatAmount = totalAmount * (effVat / 100);
      const grandTotal = totalAmount + vatAmount;
      const vatHtml = effVat > 0 ? `
        <tr style="background:#f8f9fb">
          <td colspan="${tnColspan}" style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;color:#555;font-size:12px">
            Сумма без НДС / Amount excl. VAT:
          </td>
          <td style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;font-size:12px">
            ${fmt(totalAmount)} ${currSym}
          </td>
        </tr>
        <tr style="background:#f8f9fb">
          <td colspan="${tnColspan}" style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;color:#e67e22;font-size:12px">
            НДС ${effVat}% / VAT ${effVat}%:
          </td>
          <td style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;font-size:12px;color:#e67e22">
            ${fmt(vatAmount)} ${currSym}
          </td>
        </tr>` : '';
      const effectivePayTerms = payCustom.trim() || payTerms;
      const html = `<div id="glorix-kp-doc" style="font-family:Georgia,'Times New Roman',serif;color:#1a2233;background:#fff;padding:36px 40px;max-width:960px">

        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1a2233">
          <div style="display:flex;align-items:center;gap:16px">
            <div style="width:44px;height:44px;background:#1a2233;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#00d4aa;letter-spacing:-1px;flex-shrink:0">GLX</div>
            <div>
              <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:4px">GLORIX PLATFORM &nbsp;·&nbsp; Верифицировано ✓</div>
              <div style="font-size:20px;font-weight:700;letter-spacing:.5px">КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</div>
              <div style="font-size:13px;color:#666;margin-top:2px">COMMERCIAL OFFER &nbsp;·&nbsp; <strong>№${kpNum}</strong></div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            ${companyLogo ? `<img src="${companyLogo}" style="height:56px;max-width:160px;object-fit:contain;border:1px solid #eee;border-radius:6px;padding:4px" />` : `<div style="height:56px;width:160px;border:2px dashed #dde3ea;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa">Логотип компании</div>`}
            <div style="text-align:right;font-size:11px;color:#555;line-height:1.7">
              <div>Дата / Date: <strong>${dateStr}</strong></div>
              <div>Действительно / Valid: <strong>${validStr}</strong></div>
            </div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:12px">
          <tr><td style="padding:5px 0;color:#888;width:200px;vertical-align:top">Продавец / Seller:</td><td style="font-weight:600">${sellerName}</td></tr>
          <tr><td style="padding:5px 0;color:#888;vertical-align:top">Покупатель / Buyer:</td><td style="font-weight:600">${buyer || '<span style="color:#c00">[Укажите покупателя / Specify buyer]</span>'}</td></tr>
          <tr><td style="padding:5px 0;color:#888">Инкотермс / Incoterms:</td><td>${incoterms} 2020</td></tr>
          <tr><td style="padding:5px 0;color:#888">Условия оплаты / Payment:</td><td>${effectivePayTerms}</td></tr>
        </table>

        ${tnvedOn && missingCodes > 0 ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#856404">
          ⚠ ${missingCodes} позиций без кода ТН ВЭД — введите коды вручную перед отправкой покупателю
        </div>` : ''}

        <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1a2233;border-top:2px solid #1a2233;padding-top:12px;margin-bottom:10px">
          Спецификация товаров / Goods Specification
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#1a2233;color:#fff">
              <th style="padding:10px 8px;text-align:center;width:34px;border:1px solid #2d3d50;font-size:11px;font-weight:600">№</th>
              <th style="padding:10px 8px;text-align:left;border:1px solid #2d3d50;font-size:11px;font-weight:600">Наименование<br><span style="font-weight:400;font-size:9px;opacity:.7">Description</span></th>
              ${tnvedOn ? `<th style="padding:10px 8px;text-align:center;width:118px;border:1px solid #2d3d50;font-size:11px;font-weight:600">Код ТН ВЭД<br><span style="font-weight:400;font-size:9px;opacity:.7">HS Code</span></th>` : ''}
              <th style="padding:10px 8px;text-align:center;width:52px;border:1px solid #2d3d50;font-size:11px;font-weight:600">Ед.изм<br><span style="font-weight:400;font-size:9px;opacity:.7">Unit</span></th>
              <th style="padding:10px 8px;text-align:right;width:82px;border:1px solid #2d3d50;font-size:11px;font-weight:600">К-во<br><span style="font-weight:400;font-size:9px;opacity:.7">Q'ty</span></th>
              <th style="padding:10px 8px;text-align:right;width:100px;border:1px solid #2d3d50;font-size:11px;font-weight:600">Цена за ед.<br><span style="font-weight:400;font-size:9px;opacity:.7">Unit price, ${currSym}</span></th>
              <th style="padding:10px 8px;text-align:right;width:105px;border:1px solid #2d3d50;font-size:11px;font-weight:600">Сумма<br><span style="font-weight:400;font-size:9px;opacity:.7">Amount, ${currSym}</span></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            ${vatHtml}
            <tr style="background:#0f1a28;color:#fff">
              <td colspan="${tnColspan}" style="padding:12px 10px;text-align:right;border:1px solid #2d3d50;font-weight:700;font-size:14px;letter-spacing:.5px">
                ИТОГО / TOTAL &nbsp;(${incoterms} 2020, ${currency})${effVat > 0 ? ' С НДС ' + effVat + '%' : ''}:
              </td>
              <td style="padding:12px 10px;text-align:right;border:1px solid #2d3d50;font-weight:700;font-size:14px;color:#00d4aa">
                ${fmt(effVat > 0 ? grandTotal : totalAmount)} ${currSym}
              </td>
            </tr>
          </tfoot>
        </table>

        ${techHtml}

        <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px;color:#555;border-top:1px solid #dde3ea;padding-top:20px">
          <div>Подпись / Signature: &nbsp; ____________________</div>
          <div>Печать / Stamp: &nbsp; ____________________</div>
        </div>

        <div style="margin-top:18px;text-align:center;font-size:9px;color:#ccc;border-top:1px solid #f0f0f0;padding-top:10px">
          Сформировано платформой GLORIX · glorix.uz · ${dateStr}
        </div>
      </div>`;

      setKpData({ kpNum, dateStr, validStr, sellerName, buyer, incoterms,
        payTerms: effectivePayTerms, currency, vatRate: effVat, tnvedOn, vatApplicable: vatOn,
        items: validItems, totalAmount, vatAmount, grandTotal });
      setGenerated(html);
      setGenerating(false);
    }, 0);
  };

  const inputStyle = { padding: '8px 10px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 7, color: 'var(--text)', fontSize: 12, width: '100%' };

  return (
    <div className="fade-in" style={{ padding: '28px 36px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>DOCUMENT CENTER</div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Центр документов</h1>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
        ИИ генерирует черновик · Вы редактируете и подписываете · Документ от вашей компании, не от ИИ
      </div>

      <Link to="/legal-ai?type=specification" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, marginBottom: 20, cursor: 'pointer', maxWidth: 560 }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
            Нужна официальная <b>Спецификация (Приложение № 1)</b> с привязкой к номеру и дате Договора, кодом ТН ВЭД и НДС-оговоркой? Она формируется в <span style={{ color: 'var(--accent)' }}>Legal AI →</span>
          </div>
        </div>
      </Link>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['kp','📄 Коммерческое предложение'],['tnved','🔍 Поиск ТН ВЭД']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: tab===v?'var(--accent)':'transparent',
            color: tab===v?'var(--navy)':'var(--text-2)',
          }}>{l}</button>
        ))}
      </div>

      {/* КП TAB */}
      {tab === 'kp' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: form */}
          <div>
            {/* Header fields */}
            <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Реквизиты КП</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Покупатель (кому)</label>
                  <input style={inputStyle} placeholder="Название компании покупателя" value={buyer} onChange={e => setBuyer(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Страна продавца</label>
                    <select style={inputStyle} value={sellerCountry} onChange={e => setSellerCountry(e.target.value)}>
                      {COUNTRIES.map(([c,l]) => <option key={c} value={c}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Страна покупателя</label>
                    <select style={inputStyle} value={buyerCountry} onChange={e => setBuyerCountry(e.target.value)}>
                      <option value="">— выберите —</option>
                      {COUNTRIES.map(([c,l]) => <option key={c} value={c}>{l}</option>)}
                    </select>
                  </div>
                </div>
                {crossBorder && (
                  <div style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.28)', borderRadius: 8, padding: '7px 12px', lineHeight: 1.5 }}>
                    ⚠ Трансграничная сделка ({sellerCountry} → {buyerCountry}): НДС не применяется в этом документе. При необходимости настройте налогообложение вручную позже.
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Инкотермс 2020</label>
                    <select style={inputStyle} value={incoterms} onChange={e => setIncoterms(e.target.value)}>
                      {['EXW','FOB','CIF','CFR','DAP','DDP','FCA'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Валюта / Currency</label>
                    <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="USD">$ USD — Доллар США</option>
                      <option value="EUR">€ EUR — Евро</option>
                      <option value="RUB">₽ RUB — Российский рубль</option>
                      <option value="UZS">сум UZS — Узбекский сум</option>
                      <option value="KZT">₸ KZT — Казахстанский тенге</option>
                      <option value="UAH">₴ UAH — Украинская гривна</option>
                      <option value="BYN">Br BYN — Белорусский рубль</option>
                      <option value="AZN">₼ AZN — Азербайджанский манат</option>
                      <option value="AMD">֏ AMD — Армянский драм</option>
                      <option value="GEL">₾ GEL — Грузинский лари</option>
                      <option value="TJS">SM TJS — Таджикский сомони</option>
                      <option value="TMT">T TMT — Туркменский манат</option>
                      <option value="KGS">с KGS — Киргизский сом</option>
                      <option value="MDL">L MDL — Молдавский лей</option>
                      <option value="CNY">¥ CNY — Китайский юань</option>
                      <option value="TRY">₺ TRY — Турецкая лира</option>
                      <option value="GBP">£ GBP — Британский фунт</option>
                      <option value="JPY">¥ JPY — Японская иена</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Условия оплаты (шаблон)</label>
                    <select style={inputStyle} value={payTerms} onChange={e => { setPayTerms(e.target.value); setPayCustom(''); }}>
                      <option>30% предоплата, 70% по факту отгрузки</option>
                      <option>50% предоплата, 50% по факту отгрузки</option>
                      <option>100% предоплата</option>
                      <option>Оплата по факту получения</option>
                      <option>Отсрочка 30 дней</option>
                      <option>Отсрочка 60 дней</option>
                      <option>Аккредитив (LC)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                    Свои условия оплаты <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(если нужно — заменит шаблон выше)</span>
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Например: 40% аванс, остаток в течение 10 дней после отгрузки"
                    value={payCustom}
                    onChange={e => setPayCustom(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>НДС / VAT</label>
                    {vatApplicable ? (
                      <select style={inputStyle} value={vatRate} onChange={e => setVatRate(Number(e.target.value))}>
                        <option value={0}>Без НДС (0%)</option>
                        <option value={12}>НДС 12%</option>
                        <option value={15}>НДС 15% (Узбекистан)</option>
                        <option value={20}>НДС 20% (Россия/ЕАЭС)</option>
                        <option value={10}>НДС 10%</option>
                        <option value={18}>НДС 18%</option>
                      </select>
                    ) : (
                      <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-3)' }}>
                        Не применяется (трансграничная сделка)
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                      Логотип компании
                      {companyLogo && <span style={{ color: '#1a7a4a', marginLeft: 6 }}>✓ загружен</span>}
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <label style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: 1, margin: 0 }}>
                        <span>📁</span>
                        <span style={{ fontSize: 11 }}>{companyLogo ? 'Заменить логотип' : 'Загрузить логотип'}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => {
                            setCompanyLogo(ev.target.result);
                            try { localStorage.setItem('glorix_company_logo', ev.target.result); } catch { /* ignore */ }
                          };
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      {companyLogo && (
                        <button style={{ ...inputStyle, padding: '0 8px', margin: 0, cursor: 'pointer', flexShrink: 0, background: 'transparent', border: '1px solid var(--border-2)', borderRadius: 6, color: '#c0392b', fontSize: 14 }}
                          onClick={() => { setCompanyLogo(null); try { localStorage.removeItem('glorix_company_logo'); } catch { /* ignore */ } }}>✕</button>
                      )}
                    </div>
                    {companyLogo && <img src={companyLogo} style={{ marginTop: 6, height: 32, maxWidth: 120, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border-2)' }} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Glorix AI governance — TN VED SubAI status + On/Off toggle. */}
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  🧠 Glorix AI · ТН ВЭД <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(под-ИИ)</span>
                  {aiStatus === 'configured' && <span style={{ color: '#1a7a4a', fontWeight: 500 }}>· подключён</span>}
                  {aiStatus === 'unavailable' && <span style={{ color: 'var(--gold)', fontWeight: 500 }}>· не настроен</span>}
                  {aiStatus === 'error' && <span style={{ color: '#c0392b', fontWeight: 500 }}>· ошибка соединения</span>}
                  {aiStatus === 'checking' && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· проверка…</span>}
                </div>
                <button type="button" onClick={() => setTnvedAiOn(v => !v)}
                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '4px 12px',
                    border: '1px solid ' + (tnvedAiOn ? 'rgba(0,212,170,0.5)' : 'var(--border-2)'),
                    background: tnvedAiOn ? 'rgba(0,212,170,0.12)' : 'transparent',
                    color: tnvedAiOn ? '#1a7a4a' : 'var(--text-3)' }}>
                  ТН ВЭД AI: {tnvedAiOn ? 'ВКЛ' : 'ВЫКЛ'}
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.5 }}>
                {tnvedAiOn
                  ? 'Коды ТН ВЭД подбираются только AI-сервисом GLORIX. Если сервис недоступен или не уверен — код остаётся пустым (на проверку). Финальный код проверяйте с декларантом или таможенным брокером.'
                  : 'ТН ВЭД AI отключён: коды не подбираются, колонка ТН ВЭД скрыта в таблице и в документе. Подходит для внутренних сделок, где код ТН ВЭД не требуется.'}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 5 }}>
                Под-ИИ Glorix: {SUBAI_MODULES.map(m => `${m.name} (${m.status === 'active' ? 'активен' : 'план'})`).join(' · ')}
              </div>
              <div style={{ fontSize: 9, marginTop: 3, color: docBackend === 'configured' ? '#1a7a4a' : 'var(--text-3)' }}>
                Document AI backend: {docBackend === 'configured' ? 'подключён (обработка на сервере, устойчива к обновлению страницы)'
                  : docBackend === 'not_configured' ? 'не настроен (TNVED_AI_API_URL) — доступен офлайн ручной режим'
                  : docBackend === 'error' ? 'ошибка соединения' : 'проверка…'}
              </div>
            </div>

            {/* Import buttons */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setShowPaste(!showPaste)} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px', flex: 1, justifyContent: 'center' }}>
                📋 Вставить из Excel
              </button>
              <button onClick={addItem} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px', flex: 1, justifyContent: 'center' }}>
                + Добавить строку
              </button>
            </div>

            {/* Paste from Excel */}
            {showPaste && (
              <div className="card" style={{ marginBottom: 12, padding: '14px 16px', borderColor: 'rgba(0,212,170,0.3)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>📋 Вставить данные из Excel</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.6 }}>
                  Скопируйте ячейки из Excel и вставьте сюда.<br/>
                  Форматы (определяется автоматически):<br/>
                  <span style={{ color: 'var(--accent)' }}>С ТН ВЭД: Название | ТН ВЭД | Кол-во | Ед. | Цена | Харак.</span><br/>
                  <span style={{ color: 'var(--text-2)' }}>Без ТН ВЭД: Название | Кол-во | Ед. | Цена</span>
                </div>
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                  placeholder={'Пшеница 3кл\t1001990000\t500\tтонна\t188\tВлажность ≤14%, протеин ≥12%\nЦемент М400\t2523290000\t100\tмешок\t6.5\tМарка М400, ГОСТ 31108'}
                  style={{ width: '100%', height: 100, padding: '10px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 12, fontFamily: 'monospace', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <button className="btn btn-ghost" onClick={() => setShowPaste(false)} style={{ fontSize: 12, padding: '6px 14px' }}>Отмена</button>
                  <button className="btn btn-primary" onClick={handlePaste} style={{ fontSize: 12, padding: '6px 14px' }}>Импортировать {parsePaste(pasteText).length > 0 ? `(${parsePaste(pasteText).length} строк)` : ''}</button>
                </div>
              </div>
            )}

            {autofillMsg && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', marginBottom: 12, borderRadius: 8,
                background: autofillMsg.type === 'ok' ? 'rgba(0,212,170,0.08)' : 'rgba(245,166,35,0.10)',
                border: autofillMsg.type === 'ok' ? '1px solid rgba(0,212,170,0.3)' : '1px solid rgba(245,166,35,0.32)' }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{autofillMsg.type === 'ok' ? '✓' : '⚠'}</span>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-2)' }}>{autofillMsg.text}</div>
              </div>
            )}
            {batchProgress && (
              <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.25)', fontSize: 11, color: 'var(--text-2)' }}>
                ⚡ Классификация ТН ВЭД (локальный движок): <b>{batchProgress.done}</b> / {batchProgress.total}
                <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', marginTop: 5 }}>
                  <div style={{ height: '100%', width: `${Math.round((batchProgress.done / Math.max(1, batchProgress.total)) * 100)}%`, background: 'var(--accent)', transition: 'width .2s ease' }} />
                </div>
              </div>
            )}
            {importSummary && (
              <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-2)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
                📥 Импорт: строк — <b>{importSummary.total}</b>
                {importSummary.uncertainUnit > 0 && <> · неуверенная ед. — <b style={{ color: 'var(--gold)' }}>{importSummary.uncertainUnit}</b></>}
                {importSummary.missingPrice > 0 && <> · без цены — <b style={{ color: 'var(--gold)' }}>{importSummary.missingPrice}</b></>}
                {importSummary.review > 0
                  ? <> · на проверку — <b style={{ color: 'var(--gold)' }}>{importSummary.review}</b> (заполните вручную)</>
                  : <> · все поля распознаны ✓</>}
              </div>
            )}
            {(jobId || offlineMode) && (
              <div style={{ padding: '10px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span>🧠 Glorix AI · Document AI {jobId ? `— ${jobStatus || '…'}` : '— офлайн (без ИИ)'}</span>
                  {jobTotals && <span>{jobTotals.done} / {jobTotals.total}</span>}
                </div>
                {jobTotals && (
                  <>
                    <div style={{ height: 5, background: 'rgba(0,212,170,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${Math.round((jobTotals.done / Math.max(1, jobTotals.total)) * 100)}%`, background: 'var(--accent)', transition: 'width .3s ease' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span>классиф.: <b style={{ color: '#1a7a4a' }}>{jobTotals.classified || 0}</b></span>
                      <span>из кэша: <b style={{ color: '#1a7a4a' }}>{jobTotals.reused_from_cache || 0}</b></span>
                      <span>вручную: <b>{jobTotals.skipped_manual || 0}</b></span>
                      <span>на проверку: <b style={{ color: 'var(--gold)' }}>{jobTotals.review || 0}</b></span>
                      <span>ошибок: <b style={{ color: '#c0392b' }}>{jobTotals.error || 0}</b></span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {jobId && jobProcessing && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={jobPause}>⏸ Пауза</button>}
                  {jobId && !jobProcessing && jobStatus !== 'completed' && jobStatus !== 'cancelled' && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={jobResume}>▶ Продолжить</button>}
                  {jobId && (jobTotals?.review > 0 || jobTotals?.error > 0) && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={jobRetry}>↻ Повторить проверку/ошибки</button>}
                  {jobId && jobStatus !== 'completed' && jobStatus !== 'cancelled' && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: '#c0392b' }} onClick={jobCancel}>✕ Отменить</button>}
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--text-3)' }} onClick={jobClear}>🗑 Очистить</button>
                </div>
              </div>
            )}
            {/* Items table */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                Спецификация товаров ({items.length} позиций)
              </div>
              {/* TN VED verification notice — platform UI only. NOT in generated KP/DOCX/PDF. */}
              {displayTnved && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', marginBottom: 12, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.28)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>⚠</span>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-2)' }}>
                  Коды ТН ВЭД подбираются автоматически и могут содержать ошибки. Перед использованием кодов для таможенного оформления рекомендуем проверить их с декларантом или таможенным брокером.
                  <span style={{ display: 'block', marginTop: 3, color: 'var(--text-3)' }}>
                    HS/TN VED codes are auto-suggested and should be verified with a customs declarant or broker before official customs use.
                  </span>
                </div>
              </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['№','Наименование', ...(displayTnved ? ['ТН ВЭД'] : []), 'Кол-во','Ед.',`Цена ${({'USD':'$','EUR':'€','RUB':'₽','UZS':'сум','KZT':'₸','UAH':'₴','BYN':'Br','AZN':'₼','AMD':'֏','GEL':'₾','TJS':'SM','TMT':'T','KGS':'с','MDL':'L','CNY':'¥','TRY':'₺','GBP':'£','JPY':'¥'})[currency]||currency}`,'Характеристики',''].map(h => (
                        <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px 8px', fontSize: 12, color: 'var(--text-3)', width: 24 }}>{i+1}</td>
                        <td style={{ padding: '4px 6px', minWidth: 140 }}>
                          <input style={{ ...inputStyle, fontSize: 11 }} placeholder="Товар" autoComplete="off" value={item.name} onChange={e => updateItem(i,'name',e.target.value)} />
                        </td>
                        {displayTnved && (
                        <td style={{ padding: '4px 6px', width: 138, verticalAlign: 'top' }}>
                          <input style={{ ...inputStyle, fontSize: 11,
                            background: jobProcessing && !item.tnved ? 'rgba(0,212,170,0.06)' : undefined,
                            borderColor: item._status === 'review' ? 'var(--gold)' : (item._status === 'error' ? '#c0392b' : undefined) }}
                            placeholder={jobProcessing && !item.tnved ? '⏳…' : 'код не выбран'} autoComplete="off"
                            value={item.tnved} onChange={e => updateItem(i,'tnved',e.target.value)} />
                          {item._status && !['classified','reused_from_cache'].includes(item._status) && (
                            <div title={(item._result?.reason || '') + (item._result?.missing_information?.length ? ' | Нужно: ' + item._result.missing_information.join('; ') : '')}
                              style={{ fontSize: 9, marginTop: 2, cursor: 'help',
                                color: item._status === 'error' ? '#c0392b' : (item._status === 'skipped_manual' ? '#1a7a4a' : (item._status === 'normalized' ? 'var(--text-3)' : 'var(--gold)')) }}>
                              {item._status === 'review' && `🔎 на проверку${item._result?.candidates?.length ? ` · ${item._result.candidates.length} канд.` : ''}`}
                              {item._status === 'error' && '⚠ ошибка'}
                              {item._status === 'skipped_manual' && '✓ ручной код'}
                              {['pending','normalizing','classifying'].includes(item._status) && '⏳ обработка…'}
                              {item._status === 'normalized' && '— код не назначен (ТН ВЭД выкл.)'}
                            </div>
                          )}
                          {item._status === 'review' && item._result?.candidates?.length > 0 && (
                            <div style={{ fontSize: 9, marginTop: 2, color: 'var(--text-3)' }}>
                              {item._result.candidates.slice(0,3).map((c,ci) => (
                                <span key={ci} onClick={() => updateItem(i,'tnved',c.code)}
                                  title={(c.description || '') + (c.reasons_for?.length ? ' | за: ' + c.reasons_for.join('; ') : '')}
                                  style={{ cursor: 'pointer', textDecoration: 'underline dotted', marginRight: 6, color: 'var(--accent)' }}>{c.code}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        )}
                        <td style={{ padding: '4px 6px', width: 70 }}>
                          <input style={{ ...inputStyle, fontSize: 11 }} type="number" placeholder="500" value={item.qty} onChange={e => updateItem(i,'qty',e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 60 }}>
                          <select style={{ ...inputStyle, fontSize: 11, borderColor: item.unit ? undefined : 'var(--gold)' }} value={item.unit} onChange={e => updateItem(i,'unit',e.target.value)}>
                            {!PRODUCT_UNITS.includes(item.unit) && <option value="">— ед. —</option>}
                            {PRODUCT_UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px', width: 70 }}>
                          <input style={{ ...inputStyle, fontSize: 11 }} type="number" placeholder="188" value={item.price} onChange={e => updateItem(i,'price',e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', minWidth: 140 }}>
                          <input style={{ ...inputStyle, fontSize: 11 }} placeholder="Влажность ≤14%" value={item.specs} onChange={e => updateItem(i,'specs',e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 24 }}>
                          <button onClick={() => removeItem(i)} style={{ background: 'none', color: 'var(--text-3)', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1px solid var(--border)' }}>
                      <td colSpan={displayTnved ? 5 : 4} style={{ padding: '8px', fontSize: 12, color: 'var(--text-2)', textAlign: 'right', fontWeight: 600 }}>ИТОГО:</td>
                      <td colSpan={3} style={{ padding: '8px', fontSize: 14, color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                        {({'USD':'$','EUR':'€','RUB':'₽','UZS':'сум','KZT':'₸','UAH':'₴','BYN':'Br','AZN':'₼','AMD':'֏','GEL':'₾','TJS':'SM','TMT':'T','KGS':'с','MDL':'L','CNY':'¥','TRY':'₺','GBP':'£','JPY':'¥'})[currency] || currency}{' '}{totalAmount.toLocaleString('ru-RU',{maximumFractionDigits:2})}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <button className="btn btn-primary" onClick={generateKP} disabled={generating} style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '13px', fontSize: 14 }}>
              {generating ? '◎ ИИ генерирует КП...' : `◎ Сгенерировать КП (${items.filter(i=>i.name).length} позиций)`}
            </button>
          </div>

          {/* Right: result */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600 }}>Результат КП</div>
              {generated && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={async () => {
                    const el = document.getElementById('glorix-kp-doc');
                    if (!el) return;
                    const h2c = (await import('html2canvas')).default;
                    const canvas = await h2c(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                    const { jsPDF } = await import('jspdf');
                    const pdf = new jsPDF({ unit: 'px', format: [canvas.width/2, canvas.height/2] });
                    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width/2, canvas.height/2);
                    pdf.save('glorix-kp.pdf');
                  }}>⬇ PDF</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => {
                    if (!kpData) return;
                    const kpNum = kpData.kpNum.replace(/[^a-zA-Z0-9-]/g, '_');
                    import('../utils/kpDocxExport').then(m => m.downloadKpAsDocx(kpData, `glorix-${kpNum}.docx`));
                  }}>⬇ Word</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => {
                    const plain = document.getElementById('glorix-kp-doc')?.innerText || '';
                    navigator.clipboard?.writeText(plain); alert('Скопировано!');
                  }}>📋 Копировать</button>
                </div>
              )}
            </div>

            {!generated && !generating && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Заполните таблицу и нажмите «Сгенерировать КП»</div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  Можно вставить данные из Excel одним нажатием.<br/>
                  КП будет в табличном формате с ТН ВЭД кодами.
                </div>
              </div>
            )}

            {generating && (
              <div style={{ textAlign: 'center', padding: '60px 20px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
                <div style={{ color: 'var(--accent)', fontSize: 14 }}>ИИ формирует документ...</div>
              </div>
            )}

            {generated && (
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Верифицировано GLORIX</span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>◎ ИИ-черновик</span>
                </div>
                <div style={{ maxHeight: 560, overflowY: 'auto', borderRadius: 8, border: '1px solid var(--border-2)', background: '#fff' }} dangerouslySetInnerHTML={{ __html: generated }} />
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 7, fontSize: 11, color: 'var(--gold)' }}>
                  ⚠ Черновик. Проверьте данные, поставьте подпись и печать. В документе нигде не указано что создан ИИ.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ТН ВЭД TAB */}
      {tab === 'tnved' && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.7 }}>
            Введите название товара (на русском или английском) или код — поиск идёт по полной официальной международной номенклатуре (Harmonized System, основа кодов ТН ВЭД во всех странах СНГ).
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 8, fontSize: 12, color: 'var(--gold)', marginBottom: 20, lineHeight: 1.6 }}>
            ⚠ Поиск сначала ищет по официальным русским названиям 96 товарных групп ТН ВЭД ЕАЭС, затем по словарю частых терминов, а если нет совпадения — пробует автоматический перевод запроса. Найденный код — основа для классификации, но финальное решение по коду для таможенного оформления должен подтвердить декларант или таможенный брокер.
          </div>

          <div style={{ position: 'relative', marginBottom: 20 }}>
            <input value={tnvedQuery} onChange={e => searchTnved(e.target.value)}
              placeholder="Введите название товара или код (напр.: пшеница, цемент, насос, или 1001)"
              style={{ width: '100%', padding: '12px 16px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 10, color: 'var(--text)', fontSize: 14 }} />
          </div>

          {tnvedLoading && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-3)', fontSize: 13 }}>Поиск…</div>
          )}

          {!tnvedLoading && tnvedMeta?.source === 'official-ru-group' && (
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>
              ✓ Найдено по официальному названию товарной группы ТН ВЭД ЕАЭС
            </div>
          )}

          {!tnvedLoading && tnvedMeta?.source === 'live-translate' && tnvedMeta?.translatedQuery && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
              Переведено как «{tnvedMeta.translatedQuery}» (автоматический перевод, не локальный словарь) — выберите подходящий вариант ниже
            </div>
          )}

          {!tnvedLoading && tnvedResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {tnvedResults.map((t, i) => (
                <div key={i} onClick={() => setSelectedTnved(t)} style={{
                  padding: '14px 18px', background: selectedTnved?.code === t.code ? 'rgba(0,212,170,0.08)' : 'var(--card)',
                  border: `1px solid ${selectedTnved?.code === t.code ? 'rgba(0,212,170,0.4)' : 'var(--border)'}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      {t.descriptionRu ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{t.descriptionRu}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t.description}</div>
                        </>
                      ) : (
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.description}</div>
                      )}
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{t.code}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {t.groupNameRu ? `Группа: ${t.groupNameRu}` : `Раздел ${t.section}`}
                    {t.descriptionRu ? ' · перевод названия — автоматический, без гарантии точности' : ' · официальное название товара — на английском (международный HS), перевод загружается…'}
                  </div>
                </div>
              ))}
              {tnvedResults.length >= 20 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '4px 0' }}>Показаны первые 20 совпадений — уточните запрос для более точного результата</div>
              )}
            </div>
          )}

          {selectedTnved && (
            <div className="card" style={{ padding: '20px', borderColor: 'rgba(0,212,170,0.3)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--accent)' }}>{selectedTnved.code}</div>
              {selectedTnved.descriptionRu ? (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{selectedTnved.descriptionRu}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{selectedTnved.description}</div>
                </>
              ) : (
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedTnved.description}</div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
                {selectedTnved.groupNameRu ? `Группа: ${selectedTnved.groupNameRu}` : `Раздел ${selectedTnved.section} международной номенклатуры HS`}
                {selectedTnved.descriptionRu && ' · перевод названия — автоматический, без гарантии точности'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
                Технические характеристики товара (влажность, состав, прочность и т.п.) платформа не подбирает автоматически — укажите их вручную после добавления в КП, исходя из реальной спецификации вашего товара.
              </div>
              <button className="btn btn-primary" onClick={() => {
                setItems(prev => [...prev, { name: selectedTnved.descriptionRu || selectedTnved.description, tnved: selectedTnved.code, qty: '', unit: '', price: '', specs: '' }]);
                setTab('kp');
                setSelectedTnved(null);
              }} style={{ fontSize: 13 }}>
                + Добавить в КП →
              </button>
            </div>
          )}

          {!tnvedLoading && tnvedMeta?.translationUnavailable && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🌐</div>
              <div>Автоматический перевод временно недоступен</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Попробуйте ввести название товара на английском, или код напрямую</div>
            </div>
          )}

          {!tnvedLoading && !tnvedMeta?.translationUnavailable && tnvedQuery.length > 1 && tnvedResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <div>Ничего не найдено по запросу «{tnvedQuery}»</div>
              <div style={{ fontSize: 12, marginTop: 8 }}>Попробуйте другое слово, английское название товара, или код напрямую</div>
            </div>
          )}

          {tnvedQuery.length === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {['пшеница', 'цемент', 'арматура', 'полиэтилен', 'подсолнечное масло', 'хлопок', 'сталь', 'насос', 'удобрения'].map((label, i) => (
                <div key={i} onClick={() => searchTnved(label)} style={{ padding: '12px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='rgba(0,212,170,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
