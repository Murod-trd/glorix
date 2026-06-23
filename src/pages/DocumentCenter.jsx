import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';
import { searchHsCodes, translateProductNameToRu } from '../data/hsCodes';
import { PRODUCT_UNITS } from '../data/marketplace';

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
    'м', 'м²', 'м³', 'кг', 'г', 'т', 'тонна', 'шт', 'шт.', 'штука',
    'литр', 'л', 'рулон', 'пог.м', 'погм', 'компл', 'компл.', 'комплект',
    'упак', 'упак.', 'упаковка', 'мешок', 'паллет', 'паллета',
    'пар', 'набор', 'ящик', 'коробка', 'пачка', 'партия', 'лот',
    'm', 'kg', 'pcs', 'pc', 'set', 'roll', 'box', 'bag',
  ]);
  const isUnit = (s) => UNIT_SET.has((s || '').trim().toLowerCase()) || UNIT_SET.has((s || '').trim());
  const isTnved = (s) => /^\d{8,10}$/.test((s || '').replace(/\s/g, ''));

  const lines = text.trim().split('\n').filter(l => l.trim());
  return lines.map(line => {
    const hasTabs = line.includes('\t');
    const cols = hasTabs
      ? line.split('\t').map(c => c.trim().replace(/"/g, ''))
      : line.split(',').map(c => c.trim().replace(/"/g, ''));

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
  }).filter(r => r && r.name);
}

// Словарь кодов ТН ВЭД для типовой электротехнической продукции.
// searchHsCodes может ошибиться (7312=стальной трос, 7115=платина),
// поэтому сначала проверяем по названию товара.
const CABLE_TNVED_MAP = [
  { re: /^(КСРПнг|КСРПнг\(А\)|КСРП)/i,        code: '8544429007' }, // кабели сигнальные, FRHF
  { re: /^(ВВГ|АВВГнг|АВВГ|ВВГнг|ВВГп)/i,     code: '8544499108' }, // силовые кабели ВВГ (Cu, ПВХ, ≤1000В)
  { re: /^(ПВС|ПВВС)/i,                        code: '8544492900' }, // провод ПВС (гибкий, многожильный)
  { re: /^(КГ|КГнг|КГП)/i,                   code: '8544492900' }, // кабель КГ (резиновая изоляция)
  { re: /^(NYM|NYY|SWA|H07|H05)/i,             code: '8544492900' }, // евро-марки ≤1000В
  { re: /кабель|провод|wire|cable/i,            code: '8544420000' }, // общий фолбэк для кабельной продукции
];
function guessElectricalCode(name) {
  for (const { re, code } of CABLE_TNVED_MAP) {
    if (re.test(name.trim())) return code;
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
  const [generating, setGenerating] = useState(false);
  const [buyer, setBuyer] = useState('');
  const [incoterms, setIncoterms] = useState('DAP');
  const [payTerms, setPayTerms] = useState('30% предоплата, 70% по факту отгрузки');
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
    // Авто-определение ТН ВЭД по названию товара для строк без кода
    const needsSearch = parsed.some(item => !item.tnved);
    if (needsSearch) {
      setTnvedSearching(true);
      try {
        const enriched = await Promise.all(parsed.map(async (item) => {
          if (item.tnved) return item;
          try {
            // 1. Быстрая проверка по словарю для электрокабелей
            const guessed = guessElectricalCode(item.name);
            if (guessed) return { ...item, tnved: guessed };
            // 2. Поиск в базе HS (6-знач.), дополняем до 10 знаков ТН ВЭД
            const { results } = await searchHsCodes(item.name);
            if (!results.length) return item;
            const rawCode = results[0].code.replace(/\D/g, '');
            const tnvedCode = rawCode.padEnd(10, '0');
            return { ...item, tnved: tnvedCode };
          } catch { return item; }
        }));
        setItems(enriched);
      } finally {
        setTnvedSearching(false);
      }
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
      const kpNum = `КП-${Date.now().toString().slice(-6)}`;
      const dateStr   = new Date().toLocaleDateString('ru-RU');
      const validStr  = new Date(Date.now()+30*24*60*60*1000).toLocaleDateString('ru-RU');

      // Форматирование числа в российской локали: 5 000,00
      const fmt = (n) => (parseFloat(n)||0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const rows = items.filter(i => i.name).map((item, idx) => {
        const subtotal = (parseFloat(item.qty)||0) * (parseFloat(item.price)||0);
        return `| ${idx+1} | ${item.name} | ${item.tnved || '—'} | ${item.unit} | ${fmt(item.qty)} | ${fmt(item.price)} | ${fmt(subtotal)} |`;
      }).join('\n');

      const techSpecs = items.filter(i => i.name && i.specs);

      setGenerated(
`КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ / COMMERCIAL OFFER  №${kpNum}

ПРОДАВЕЦ / SELLER:    ${sellerName}
                      Верифицировано платформой GLORIX ✓
ПОКУПАТЕЛЬ / BUYER:   ${buyer || '[Укажите покупателя / Specify buyer]'}

ДАТА / DATE:          ${dateStr}
ДЕЙСТВИТЕЛЬНО / VALID UNTIL: ${validStr}
УСЛОВИЯ / INCOTERMS:  ${incoterms} 2020
ОПЛАТА / PAYMENT:     ${payTerms}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
СПЕЦИФИКАЦИЯ ТОВАРОВ / GOODS SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| № | Наименование / Description | Код ТН ВЭД / HS Code | Ед.изм / Unit | К-во / Q\'ty | Цена за ед. / Unit price | Сумма / Amount |
|---|---------------------------|---------------------|--------------|-------------|--------------------------|----------------|
${rows}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ИТОГО / TOTAL:  ${fmt(totalAmount)} USD      ${incoterms} 2020
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${techSpecs.length > 0 ? `
ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ / TECHNICAL SPECIFICATIONS:
${techSpecs.map((item,idx) => `${idx+1}. ${item.name}:\n   ${item.specs}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : ''}
Подпись / Signature: ____________________
Печать / Stamp:      ____________________`
      );
      setGenerating(false);
    }, 1500);
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
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Инкотермс 2020</label>
                    <select style={inputStyle} value={incoterms} onChange={e => setIncoterms(e.target.value)}>
                      {['EXW','FOB','CIF','CFR','DAP','DDP','FCA'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Условия оплаты</label>
                    <select style={inputStyle} value={payTerms} onChange={e => setPayTerms(e.target.value)}>
                      <option>30% предоплата, 70% по факту отгрузки</option>
                      <option>100% предоплата</option>
                      <option>Оплата по факту получения</option>
                      <option>Аккредитив (LC)</option>
                    </select>
                  </div>
                </div>
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
                      {['№','Наименование','ТН ВЭД','Кол-во','Ед.','Цена $','Характеристики',''].map(h => (
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
                          <input style={{ ...inputStyle, fontSize: 11, background: tnvedSearching && !item.tnved ? 'rgba(0,212,170,0.06)' : undefined }} placeholder={tnvedSearching && !item.tnved ? '⏳ поиск...' : '1001990000'} autoComplete="off" value={item.tnved} onChange={e => updateItem(i,'tnved',e.target.value)} />
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
                        ${totalAmount.toLocaleString(undefined,{maximumFractionDigits:2})}
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
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => import('../utils/pdfExport').then(m => m.downloadTextAsPdf(generated, 'glorix-kp.pdf'))}>⬇ PDF</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => import('../utils/docxExport').then(m => m.downloadTextAsDocx(generated, 'glorix-kp.docx'))}>⬇ Word</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => { navigator.clipboard?.writeText(generated); alert('Скопировано!'); }}>📋 Копировать</button>
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
                <pre style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text)', background: 'var(--navy-3)', padding: '18px 22px', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, "Times New Roman", serif', maxHeight: 500, overflowY: 'auto' }}>{generated}</pre>
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
