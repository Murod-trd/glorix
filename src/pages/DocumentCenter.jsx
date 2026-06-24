import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';
import { searchHsCodes, translateProductNameToRu } from '../data/hsCodes';
import { PRODUCT_UNITS } from '../data/marketplace';
import { resolveTnved } from '../utils/tnvedAI.js';

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

// Parse Excel-like paste.
// Умный разбор: находит колонку с единицей измерения по значению (м, кг, шт…),
// определяет — единица идёт ДО или ПОСЛЕ количества — и раскладывает колонки корректно.
// Поддерживаемые форматы (с ТН ВЭД или без, единица до или после кол-ва):
//   Название | Кол-во | Ед. | Цена
//   Название | Ед. | Кол-во | Цена          ← PDF/российский формат
//   Название | ТН ВЭД | Ед. | Кол-во | Цена
//   Название | ТН ВЭД | Кол-во | Ед. | Цена
function parsePaste(text) {
  // Полный список единиц (в нижнем регистре для сравнения)
  const UNIT_SET = new Set([
    'м', 'м²', 'м³', 'м2', 'м3', 'кв.м', 'куб.м', 'кв м', 'м кв', 'м кв.',
    'кг', 'г', 'т', 'тонна', 'тн',
    'шт', 'шт.', 'штука', 'штук', 'ед', 'ед.',
    'литр', 'л', 'мл',
    'рулон', 'пог.м', 'пм', 'погм', 'п.м',
    'компл', 'компл.', 'комплект',
    'упак', 'упак.', 'упаковка', 'мешок', 'паллет', 'паллета', 'пал',
    'пар', 'набор', 'ящик', 'коробка', 'пачка', 'партия', 'лот',
    'm', 'm2', 'm3', 'kg', 'pcs', 'pc', 'set', 'roll', 'box', 'bag', 'ton',
  ]);
  const isUnit = (s) => UNIT_SET.has((s || '').trim().toLowerCase()) || UNIT_SET.has((s || '').trim());
  const isTnved = (s) => /^\d{8,10}$/.test((s || '').replace(/\s/g, ''));

  // Разбираем TSV с Excel-кавычками (многострочные ячейки заключены в "…")
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
  const rawRows = parseExcelTSV(text.trim());

  // Слова-заголовки: такая строка НЕ склеивается со следующей, а просто пропускается
  const SKIP_WORDS = new Set([
    'наименование', 'описание', 'description', 'name', 'товар', 'product',
    '№', 'no', 'n/n', 'п/п', 'номер', 'поз', 'позиция',
    'итого', 'итог', 'total', 'всего', 'сумма итого', 'grand total',
  ]);
  const isSkipRow = (row) => {
    const w = (row[0] || '').trim().toLowerCase();
    return SKIP_WORDS.has(w) || [...SKIP_WORDS].some(h => w.startsWith(h + ' ') || w.startsWith(h + '/'));
  };

  // Умное склеивание: если строка без данных (qty=0, price=0), а следующая имеет данные
  // → это разрыв длинного названия. Объединяем имена, берём данные из следующей строки.
  // ВАЖНО: строки-заголовки (Наименование, Итого…) НЕ склеиваются, а пропускаются.
  const mergedRows = [];
  for (let ri = 0; ri < rawRows.length; ri++) {
    const row = rawRows[ri];
    if (isSkipRow(row)) continue;  // заголовок/итого — выбрасываем без склейки
    const hasData = row.slice(1).some(c => parseFloat((c||'').replace(/[\s,]/g,'')) > 0);
    if (!hasData && row[0] && row[0].trim()) {
      const next = rawRows[ri + 1];
      const nextHasData = next && !isSkipRow(next) &&
        next.slice(1).some(c => parseFloat((c||'').replace(/[\s,]/g,'')) > 0);
      if (nextHasData) {
        // Склеиваем название многострочного товара, берём данные из next
        const merged = [...next];
        merged[0] = row[0].trim() + ' ' + (next[0] || '').trim();
        mergedRows.push(merged);
        ri++; // пропускаем следующую строку
        continue;
      }
      // Строка без числовых данных и без продолжения — пропускаем
    } else {
      mergedRows.push([...row]);
    }
  }
  return mergedRows.map(cols => {

    const name = cols[0] || '';
    if (!name) return null;

    // Хвост колонок без имени
    let rest = cols.slice(1);
    let tnved = '';

    // Определяем: есть ли колонка ТН ВЭД (8-10 цифр или пустая первая колонка)
    const col1clean = (rest[0] || '').replace(/\s/g, '');
    if (!rest[0] || isTnved(col1clean)) {
      tnved = rest[0] || '';
      rest = rest.slice(1);
    }

    // Ищем колонку с единицей измерения по значению
    const unitIdx = rest.findIndex(c => isUnit(c));

    let qty = '', unit = 'кг', price = '', specs = '';

    if (unitIdx >= 0) {
      unit = rest[unitIdx].trim();
      const before = rest.slice(0, unitIdx);   // колонки ДО единицы
      const after  = rest.slice(unitIdx + 1);  // колонки ПОСЛЕ единицы

      const lastBefore = before[before.length - 1] || '';
      const firstAfter = after[0] || '';
      const secondAfter = after[1] || '';

      if (normalizeNum(lastBefore)) {
        // Есть число перед единицей → кол-во ДО единицы: … qty | unit | price …
        qty   = normalizeNum(lastBefore);
        price = normalizeNum(firstAfter);
        specs = after.slice(1).join(' ').trim();
      } else {
        // Нет числа перед единицей → единица ПЕРЕД кол-вом: … unit | qty | price …
        qty   = normalizeNum(firstAfter);
        price = normalizeNum(secondAfter);
        specs = after.slice(2).join(' ').trim();
      }
    } else if (rest.length >= 2) {
      // Единица не найдена — позиционный фолбэк: qty | price
      qty   = normalizeNum(rest[0] || '');
      price = normalizeNum(rest[1] || '');
      specs = rest.slice(2).join(' ').trim();
    } else {
      qty = normalizeNum(rest[0] || '');
    }

    return { name, tnved, qty, unit, price, specs };
  }).filter(r => {
    if (!r || !r.name) return false;
    // Пропускаем строки-заголовки таблиц (Наименование, №, Description и т.д.)
    const LOW = r.name.trim().toLowerCase();
    const HEADERS = ['наименование', 'описание', 'description', 'name', 'товар', 'product',
                     '№', 'no', 'n/n', 'п/п', 'номер', 'поз', 'позиция'];
    if (HEADERS.some(h => LOW === h || LOW.startsWith(h + ' '))) return false;
    // Пропускаем строки где имя — просто порядковый номер (1, 2, 41 и т.д.)
    if (/^\d{1,3}$/.test(r.name.trim())) return false;
    return true;
  });
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
  // болт/гайка/шайба — маршрутизируются через resolveTnved → KEYWORD_ROUTES (разные коды!)
  { re: /^болт/i,                                                   code: null }, // → resolveTnved
  { re: /^гайк/i,                                                   code: null }, // → resolveTnved
  { re: /^(шайб|гровер)/i,                                         code: null }, // → resolveTnved
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

function guessProductCode(name) {
  for (const { re, code } of PRODUCT_TNVED_MAP) {
    if (re.test(name.trim())) {
      // code: null → не перехватываем, пусть resolveTnved (KEYWORD_ROUTES) даст точный код
      return code || null;
    }
  }
  return null;
}

export default function DocumentCenter() {
  const { accountType } = useAccountType();
  const [tab, setTab] = useState('kp'); // kp | tnved
  const [items, setItems] = useState([{ name: '', tnved: '', qty: '', unit: 'кг', price: '', specs: '' }]);
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
  const [openAiKey, setOpenAiKey] = useState(() => {
    try { return localStorage.getItem('glorix_openai_key') || ''; } catch { return ''; }
  });
  const saveApiKey = (key) => {
    setOpenAiKey(key);
    try { localStorage.setItem('glorix_openai_key', key); } catch {}
  };
  const [companyLogo, setCompanyLogo] = useState(() => {
    try { return localStorage.getItem('glorix_company_logo') || null; } catch { return null; }
  });
  const [tnvedQuery, setTnvedQuery] = useState('');
  const [tnvedResults, setTnvedResults] = useState([]);
  const [selectedTnved, setSelectedTnved] = useState(null);
  const [tnvedSearching, setTnvedSearching] = useState(false); // авто-поиск ТН ВЭД после вставки

  const addItem = () => setItems(prev => [...prev, { name: '', tnved: '', qty: '', unit: 'кг', price: '', specs: '' }]);
  const updateItem = (i, k, v) => { const arr = [...items]; arr[i][k] = v; setItems(arr); };
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handlePaste = async () => {
    const parsed = parsePaste(pasteText);
    if (!parsed.length) return;
    setItems(parsed);
    setShowPaste(false);
    setPasteText('');

    // ── Трёхуровневый поиск ТН ВЭД ──────────────────────────────────────────
    // 1. regex-словарь (мгновенно, 80+ паттернов)
    // 2. Fuse.js по базе ТН ВЭД ЕАЭС (~150 позиций, русский язык)
    // 3. OpenAI API (если ключ задан в настройках и уверенность базы низкая)
    const itemsWithRegex = parsed.map(item => {
      if (item.tnved) return { ...item, _src: 'manual' };
      const guessed = guessProductCode(item.name);
      return guessed ? { ...item, tnved: guessed, _src: 'regex' } : { ...item, _src: '' };
    });

    const needsAI = itemsWithRegex.some(i => !i.tnved);
    if (!needsAI) {
      setItems(itemsWithRegex.map(({ _src, ...rest }) => rest));
      return;
    }

    setTnvedSearching(true);
    try {
      const enriched = await Promise.all(
        itemsWithRegex.map(async (item) => {
          if (item.tnved) return item;
          const { code, source } = await resolveTnved(item.name, '');
          return { ...item, tnved: code, _src: source };
        })
      );
      // Убираем служебное поле _src перед сохранением
      setItems(enriched.map(({ _src, ...rest }) => rest));
    } catch(e) {
      console.error('TNVED resolve error:', e);
    } finally {
      setTnvedSearching(false);
    }
  };

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
          ${td(tnvedText, `text-align:center;font-family:monospace;font-size:11px;color:${tnvedColor};letter-spacing:.5px`)}
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

      const vatAmount = totalAmount * (vatRate / 100);
      const grandTotal = totalAmount + vatAmount;
      const vatHtml = vatRate > 0 ? `
        <tr style="background:#f8f9fb">
          <td colspan="6" style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;color:#555;font-size:12px">
            Сумма без НДС / Amount excl. VAT:
          </td>
          <td style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;font-size:12px">
            ${fmt(totalAmount)} ${currSym}
          </td>
        </tr>
        <tr style="background:#f8f9fb">
          <td colspan="6" style="padding:8px 10px;text-align:right;border:1px solid #dde3ea;color:#e67e22;font-size:12px">
            НДС ${vatRate}% / VAT ${vatRate}%:
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

        ${missingCodes > 0 ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;color:#856404">
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
              <th style="padding:10px 8px;text-align:center;width:118px;border:1px solid #2d3d50;font-size:11px;font-weight:600">Код ТН ВЭД<br><span style="font-weight:400;font-size:9px;opacity:.7">HS Code</span></th>
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
              <td colspan="6" style="padding:12px 10px;text-align:right;border:1px solid #2d3d50;font-weight:700;font-size:14px;letter-spacing:.5px">
                ИТОГО / TOTAL &nbsp;(${incoterms} 2020, ${currency})${vatRate > 0 ? ' С НДС ' + vatRate + '%' : ''}:
              </td>
              <td style="padding:12px 10px;text-align:right;border:1px solid #2d3d50;font-weight:700;font-size:14px;color:#00d4aa">
                ${fmt(vatRate > 0 ? grandTotal : totalAmount)} ${currSym}
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
        payTerms: effectivePayTerms, currency, vatRate, items: validItems, totalAmount, vatAmount, grandTotal });
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
                    <select style={inputStyle} value={vatRate} onChange={e => setVatRate(Number(e.target.value))}>
                      <option value={0}>Без НДС (0%)</option>
                      <option value={12}>НДС 12%</option>
                      <option value={15}>НДС 15% (Узбекистан)</option>
                      <option value={20}>НДС 20% (Россия/ЕАЭС)</option>
                      <option value={10}>НДС 10%</option>
                      <option value={18}>НДС 18%</option>
                    </select>
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
                            try { localStorage.setItem('glorix_company_logo', ev.target.result); } catch {}
                          };
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      {companyLogo && (
                        <button style={{ ...inputStyle, padding: '0 8px', margin: 0, cursor: 'pointer', flexShrink: 0, background: 'transparent', border: '1px solid var(--border-2)', borderRadius: 6, color: '#c0392b', fontSize: 14 }}
                          onClick={() => { setCompanyLogo(null); try { localStorage.removeItem('glorix_company_logo'); } catch {} }}>✕</button>
                      )}
                    </div>
                    {companyLogo && <img src={companyLogo} style={{ marginTop: 6, height: 32, maxWidth: 120, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border-2)' }} />}
                  </div>
                </div>
              </div>
            </div>

            {/* OpenAI API key for TN VED auto-detection */}
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-2)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                🤖 OpenAI API — автоматический подбор ТН ВЭД
                <span style={{ fontWeight: 400, opacity: 0.7 }}>(необязательно)</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password"
                  placeholder="sk-... (ключ хранится только в браузере)"
                  value={openAiKey}
                  onChange={e => saveApiKey(e.target.value)}
                  style={{ ...inputStyle, flex: 1, margin: 0, fontFamily: 'monospace', fontSize: 11 }}
                />
                {openAiKey && (
                  <button onClick={() => saveApiKey('')}
                    style={{ padding: '0 10px', background: 'transparent', border: '1px solid var(--border-2)', borderRadius: 6, cursor: 'pointer', color: '#c0392b', fontSize: 14 }}>✕</button>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                При вставке из Excel: regex-словарь → база ЕАЭС (Fuse.js) → OpenAI gpt-4o-mini.
                {openAiKey ? ' ✅ Ключ задан — все три уровня активны.' : ' ⚠ Без ключа работают только уровни 1–2.'}
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
                  {tnvedSearching && <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 4 }}>⏳ Определяю ТН ВЭД...</span>}
                </div>
              </div>
            )}

            {/* Items table */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                Спецификация товаров ({items.length} позиций)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['№','Наименование','ТН ВЭД','Кол-во','Ед.',`Цена ${({'USD':'$','EUR':'€','RUB':'₽','UZS':'сум','KZT':'₸','UAH':'₴','BYN':'Br','AZN':'₼','AMD':'֏','GEL':'₾','TJS':'SM','TMT':'T','KGS':'с','MDL':'L','CNY':'¥','TRY':'₺','GBP':'£','JPY':'¥'})[currency]||currency}`,'Характеристики',''].map(h => (
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
                        <td style={{ padding: '4px 6px', width: 110 }}>
                          <input style={{ ...inputStyle, fontSize: 11, background: tnvedSearching && !item.tnved ? 'rgba(0,212,170,0.06)' : undefined }} placeholder={tnvedSearching && !item.tnved ? '⏳ поиск...' : '0000000000'} autoComplete="off" value={item.tnved} onChange={e => updateItem(i,'tnved',e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 70 }}>
                          <input style={{ ...inputStyle, fontSize: 11 }} type="number" placeholder="500" value={item.qty} onChange={e => updateItem(i,'qty',e.target.value)} />
                        </td>
                        <td style={{ padding: '4px 6px', width: 60 }}>
                          <select style={{ ...inputStyle, fontSize: 11 }} value={item.unit} onChange={e => updateItem(i,'unit',e.target.value)}>
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
                      <td colSpan={5} style={{ padding: '8px', fontSize: 12, color: 'var(--text-2)', textAlign: 'right', fontWeight: 600 }}>ИТОГО:</td>
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
                setItems(prev => [...prev, { name: selectedTnved.descriptionRu || selectedTnved.description, tnved: selectedTnved.code, qty: '', unit: 'кг', price: '', specs: '' }]);
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
