import { useState } from 'react';
import { legalSources, internationalSources, docTypes, internationalLaw, mirrorPenalties } from '../data/legalSources';

// Mirror-symmetric penalty generator based on uploaded TFD analysis
function generateMirrorPenalties(scope, penaltyRate, maxPenalty, currency) {
  const rate = penaltyRate || '0.1';
  const max = maxPenalty || '10';
  return `
§ 9. ОТВЕТСТВЕННОСТЬ СТОРОН
(Зеркальные штрафные санкции — равные для обеих сторон)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖ ПРИНЦИП ЗЕРКАЛЬНОСТИ: одинаковые санкции применяются к 
  обеим сторонам за аналогичные нарушения.

9.1. ПРОСРОЧКА ПОСТАВКИ (Поставщик)
За каждый день просрочки поставки сверх установленного срока:
• Пеня: ${rate}% от стоимости непоставленного Товара/день
• Максимум: ${max}% от стоимости Товара
• Выплата: в течение 10 дней после письменного требования
(${scope === 'international' ? 'Art. 74 CISG — возмещение убытков' : 'Ст. 328 ГК РУз — срок исполнения обязательства'})

9.2. ПРОСРОЧКА ОПЛАТЫ (Покупатель) ← ЗЕРКАЛЬНО п. 9.1
За каждый день просрочки оплаты поставленного Товара:
• Пеня: ${rate}% от неоплаченной суммы/день  ← ТАРИФ = п.9.1
• Максимум: ${max}% от неоплаченной суммы    ← ЛИМИТ = п.9.1
• Выплата: в течение 10 дней после письменного требования
(${scope === 'international' ? 'Art. 62 CISG — обязанность покупателя уплатить цену' : 'Ст. 454 ГК РУз — обязанность оплатить товар'})

⚠ ИСПРАВЛЕНО: в ваших ТФД просрочка оплаты Покупателем 
  ограничена 5%, просрочка Поставщика — не ограничена.
  GLORIX устанавливает одинаковый лимит ${max}% для ОБОИХ.

9.3. НЕПОСТАВКА ТОВАРА (Поставщик)
При непоставке более чем через 20 дней после срока:
• Возврат всей предоплаты в течение 10 дней
• Штраф: 10% от стоимости непоставленного Товара
(${scope === 'international' ? 'Art. 49 CISG — право на расторжение' : 'Ст. 467 ГК РУз — количество товара'})

9.4. ОТКАЗ ОТ ОПЛАТЫ (Покупатель) ← ЗЕРКАЛЬНО п. 9.3
При отказе от оплаты поставленного Товара:
• Поставщик вправе потребовать возврата Товара
• Штраф: 10% от стоимости неоплаченного Товара  ← = п.9.3
(${scope === 'international' ? 'Art. 64 CISG — право продавца на расторжение' : 'Ст. 454 ГК РУз — договор купли-продажи'})

9.5. ПРАВО ПРИОСТАНОВЛЕНИЯ ← ЗЕРКАЛЬНО ДЛЯ ОБЕИХ СТОРОН
Любая Сторона вправе приостановить исполнение, направив
письменное уведомление за 5 рабочих дней. При этом:
• Приостановление по вине другой стороны — расходы за счёт 
  виновной стороны
• Приостановление по удобству инициатора — расходы за счёт
  инициатора
⚠ ИСПРАВЛЕНО: в ваших ТФД только Покупатель мог 
  приостановить. GLORIX даёт это право обеим сторонам.

9.6. НАРУШЕНИЕ КАЧЕСТВА (Поставщик)
• Устранение недостатков: 30 дней с требования
• Замена дефектного товара: 30 дней с требования
• При неустранении: возврат + штраф 10% от стоимости
• Право выбора способа устранения: у Покупателя

9.7. ОТКАЗ ОТ ПРИЁМКИ БЕЗ ОСНОВАНИЙ (Покупатель) ← ЗЕРКАЛЬНО
• Покупатель обязан принять товар в течение 10 рабочих дней
• При необоснованном отказе: пеня ${rate}%/день от стоимости
• Максимум: ${max}% + возмещение расходов на хранение

9.8. УПЛАТА ШТРАФОВ
Уплата штрафных санкций НЕ освобождает от исполнения 
обязательств и НЕ исключает возмещения убытков.
Все штрафы выплачиваются помимо возмещения убытков.
(${scope === 'international' ? 'Art. 74 CISG' : 'п. 9.6 ТФД Enter Engineering — принцип сохранён'})`;
}

function generateDoc(type, seller, buyer, sellerCountry, buyerCountry, goods, amount, currency, incoterms, deliveryDays, payTerms, scope, intLaw, penaltyRate, maxPenalty) {
  const sLaw = legalSources.find(s => s.code === sellerCountry);
  const bLaw = legalSources.find(s => s.code === buyerCountry);
  const law = sLaw || bLaw || legalSources[0];
  const arts = law.tradeArticles;
  const getArt = (topic) => arts.find(a => a.topic.includes(topic))?.art || '';

  const intLawObj = internationalLaw.find(l => l.id === intLaw);
  const appliedLaw = scope === 'international' ? `${intLawObj?.name || 'КМКПТ/CISG'} + Incoterms 2020 (ICC)` : law.mainCode;
  const appliedArb = scope === 'international' ? (intLawObj?.arbitration || 'ICC Арбитраж') : 'ТПП РУз → Арбитраж Москвы → LCIA Лондон → SCC Стокгольм';

  const date = new Date().toLocaleDateString('ru-RU');
  const validDate = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('ru-RU');
  const num = Math.floor(Math.random() * 9000 + 1000);
  const mirrors = generateMirrorPenalties(scope, penaltyRate, maxPenalty, currency);

  if (type === 'offer') return `
ОФЕРТА № ОФ-${num}
(Коммерческое предложение с зеркальными штрафными санкциями)

Дата: ${date}     Действительна до: ${validDate}
Тип сделки: ${scope === 'international' ? '🌍 МЕЖДУНАРОДНАЯ' : '🏢 ЛОКАЛЬНАЯ (СНГ)'}

════════════════════════════════════════════════════
ПРАВОВОЕ ОСНОВАНИЕ:
Применимое право: ${appliedLaw}
${scope === 'international' 
  ? `• КМКПТ/CISG — Конвенция ООН о купле-продаже (ст. 14–24 — оферта и акцепт)
• Incoterms 2020 (ICC, Париж) — условия поставки
• ${intLawObj?.fullName || 'КМКПТ'}`
  : `• ${getArt('Оферта') || 'Ст. 369'} ${law.mainCode} — форма и содержание оферты
• ${getArt('Момент') || 'Ст. 386'} ${law.mainCode} — момент заключения договора
• Incoterms 2020 (ICC) — условия поставки`}
Арбитраж: ${appliedArb}
════════════════════════════════════════════════════

ПРОДАВЕЦ: ${seller || '[Продавец]'}
Страна регистрации: ${sLaw?.country || sellerCountry}
Верификация GLORIX: ✓

ПОКУПАТЕЛЬ (адресат): ${buyer || '[Покупатель]'}
Страна регистрации: ${bLaw?.country || buyerCountry}

────────────────────────────────────────────────────
§ 1. ПРЕДМЕТ ОФЕРТЫ
────────────────────────────────────────────────────
Товар: ${goods || '[Наименование товара]'}
Сумма: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма]'}
Условия поставки: ${incoterms} (Incoterms 2020, ICC)
Срок поставки: ${deliveryDays || '[N]'} рабочих дней
Условия оплаты: ${payTerms || '30% предоплата, 70% по факту отгрузки'}

────────────────────────────────────────────────────
§ 2. ДОКУМЕНТЫ С ТОВАРОМ (по образцу ТФД Enter Engineering)
────────────────────────────────────────────────────
• Счёт-фактура — 1 ориг. + 1 копия
• Товарная/транспортная накладная — 1 ориг. + 1 копия
• Сертификат качества — 1 заверенная копия
• Сертификат соответствия — 1 заверенная копия
• Сертификат происхождения (CT-1 / Form A) — 1 ориг.
• Технический паспорт (для оборудования) — 1 ориг.
Копии отправляются на email Покупателя в течение 2 раб. дней.

${mirrors}

────────────────────────────────────────────────────
§ 10. ФОРС-МАЖОР
────────────────────────────────────────────────────
Стороны освобождаются от ответственности при: стихийных
бедствиях, военных действиях, пандемии, правительственных 
запретах, вступивших в силу после подписания.
Уведомление: в течение 14 дней с наступления.
При форс-мажоре свыше 90 дней — право расторжения
без штрафов. Предоплата возвращается полностью.
${scope === 'international' ? '(Art. 79 CISG — освобождение от ответственности)' : `(Ст. 330 ${law.mainCode} — форс-мажор)`}

────────────────────────────────────────────────────
§ 11. РАЗРЕШЕНИЕ СПОРОВ
────────────────────────────────────────────────────
1. Переговоры — 30 дней с направления претензии
2. Арбитраж: ${appliedArb}
Язык: русский / английский (оба имеют равную силу)
${scope === 'international' ? 'Нью-Йоркская конвенция 1958 — признание решений арбитража.' : ''}

════════════════════════════════════════════════════
Подпись: ____________________     Печать: ____________
${seller || '[Продавец]'}
Дата: ${date}
`;

  if (type === 'contract') return `
ДОГОВОР КУПЛИ-ПРОДАЖИ № ДКП-${num}

Дата: ${date}
Тип сделки: ${scope === 'international' ? '🌍 МЕЖДУНАРОДНАЯ' : '🏢 ЛОКАЛЬНАЯ (СНГ)'}

════════════════════════════════════════════════════
ПРИМЕНИМОЕ ПРАВО: ${appliedLaw}
АРБИТРАЖ: ${appliedArb}
════════════════════════════════════════════════════

ПРОДАВЕЦ: ${seller || '[Продавец]'} | ${sLaw?.country || sellerCountry} | Верификация GLORIX ✓
ПОКУПАТЕЛЬ: ${buyer || '[Покупатель]'} | ${bLaw?.country || buyerCountry} | Верификация GLORIX ✓

────────────────────────────────────────────────────
§ 1. ПРЕДМЕТ ДОГОВОРА
────────────────────────────────────────────────────
Товар: ${goods || '[Наименование, количество, единица]'}
Сумма: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма]'}
Условия: ${incoterms} (Incoterms 2020, ICC)
Оплата: ${payTerms || '30% предоплата, 70% по факту'}

────────────────────────────────────────────────────
§ 2. ИЗГОТОВЛЕНИЕ И КОНТРОЛЬ КАЧЕСТВА
(По образцу ТФД Enter Engineering — §§ 4.1–4.14)
────────────────────────────────────────────────────
• Товар должен быть новым, не бывшим в употреблении
• График производства: в течение 15 дней после подписания
• Еженедельный отчёт о ходе производства (каждую среду)
• Покупатель имеет право контроля качества на производстве
• Товар с отклонениями от спецификации оплате не подлежит

────────────────────────────────────────────────────
§ 3. ТАРА, УПАКОВКА, МАРКИРОВКА
(По образцу ТФД Enter Engineering — § 5)
────────────────────────────────────────────────────
Маркировка включает: наименование покупателя, № договора,
габариты, вес, манипуляционные знаки.
Ответственность за повреждение при упаковке — на Поставщике.

────────────────────────────────────────────────────
§ 4. СРОК И ПОРЯДОК ПОСТАВКИ
────────────────────────────────────────────────────
Срок поставки: ${deliveryDays || '[N]'} рабочих дней от предоплаты
Уведомление о готовности: не менее чем за 10 дней
Частичная отгрузка: только с письменного согласия Покупателя

§ 4.2. СРОКИ УСТРАНЕНИЯ НАРУШЕНИЙ (по ТФД Enter Engineering):
• Допоставка — 20 дней с требования
• Устранение дефектов без замены — 30 дней
• Замена дефектного товара — 30 дней
• Передача документов — 10 дней
• Передача принадлежностей — 15 дней
Право выбора: ремонт или замена — у Покупателя.

────────────────────────────────────────────────────
§ 5. ГАРАНТИИ
────────────────────────────────────────────────────
Гарантийный срок: 24 месяца с подписания акта приёма-передачи.
Скрытые дефекты: Поставщик устраняет за свой счёт.
Гарантийный срок продлевается на период простоя по вине 
Поставщика.

${mirrors}

────────────────────────────────────────────────────
§ 10. ПРЕТЕНЗИИ (по образцу ТФД Enter Engineering)
────────────────────────────────────────────────────
• Претензия направляется заказным письмом + email
• Срок ответа: 30 дней с получения
• Если Поставщик не воспользовался правом проверки —
  претензия считается признанной

────────────────────────────────────────────────────
§ 11. ФОРС-МАЖОР
────────────────────────────────────────────────────
Перечень: стихийные бедствия, военные действия, блокада,
эпидемия/пандемия, ЧП национального масштаба,
правительственные постановления после подписания.
Уведомление: 14 дней. При форс-мажоре > 90 дней — 
расторжение без штрафов, возврат предоплаты.

────────────────────────────────────────────────────
§ 12. НАЛОГОВАЯ ОГОВОРКА (из ваших документов)
────────────────────────────────────────────────────
Сумма включает все налоги и сборы по законодательству
страны Поставщика. Покупатель вправе удержать 20% налог
на прибыль нерезидента при оказании услуг на территории
РУз, если иное не предусмотрено международным договором.
(Налоговый кодекс РУз, ст. [актуальная статья])

────────────────────────────────────────────────────
§ 13. РАЗРЕШЕНИЕ СПОРОВ
────────────────────────────────────────────────────
1. Переговоры — 30 дней
2. ${appliedArb}
Язык: русский/английский (равная юридическая сила)
${scope === 'international' ? 'Нью-Йоркская конвенция 1958 — исполнение арбитражных решений.' : ''}
Антикоррупционная оговорка: стороны соблюдают применимое 
антикоррупционное законодательство. Нарушение — право 
одностороннего расторжения без штрафов.

════════════════════════════════════════════════════
ПОСТАВЩИК                    ПОКУПАТЕЛЬ
________________             ________________
${seller || '[Продавец]'}    ${buyer || '[Покупатель]'}
М.П. Дата: ${date}           М.П. Дата: ${date}
`;

  if (type === 'claim') return `
ПРЕТЕНЗИЯ № ПР-${num}
Дата: ${date}

ОТ: ${buyer || '[Покупатель]'}
КОМУ: ${seller || '[Продавец]'}

ОСНОВАНИЕ: Договор № _____ от _______
Товар: ${goods || '[Товар]'} / Сумма: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма]'}
Применимое право: ${appliedLaw}

════════════════════════════════════════════════════
СУТЬ ПРЕТЕНЗИИ:
[ ] Просрочка поставки — нарушение § 4 договора
    Пеня: ${penaltyRate || '0.1'}%/день от стоимости (§ 9.1 — зеркально)
[ ] Ненадлежащее качество — нарушение § 2 договора  
[ ] Некомплектность / недопоставка
[ ] Непредоставление документов (счёт-фактура, сертификаты)
    Срок устранения: 10 дней с требования

ТРЕБОВАНИЯ:
[ ] Поставить товар в срок _______
[ ] Устранить дефекты в срок 30 дней
[ ] Выплатить пеню ${penaltyRate || '0.1'}% × ___ дней × ${amount || '[сумма]'} ${currency}
[ ] Возместить убытки в размере: ___________
[ ] Вернуть предоплату + штраф 10%

СРОК ОТВЕТА: 30 дней с получения претензии.
При отсутствии ответа — претензия считается признанной.

${scope === 'international' ? 'Применимое право: Art. 74-77 CISG (убытки при нарушении)' : `Применимое право: Ст. 328, 454, 478 ${law.mainCode}`}

Подпись: _________________ М.П.
${buyer || '[Покупатель]'}
`;

  return '[Тип документа не определён]';
}

export default function LegalAI() {
  const [activeTab, setActiveTab] = useState('generator');
  const [scope, setScope] = useState('local');
  const [sellerCountry, setSellerCountry] = useState('UZ');
  const [buyerCountry, setBuyerCountry] = useState('KZ');
  const [intLaw, setIntLaw] = useState('cisg');
  const [docType, setDocType] = useState('offer');
  const [seller, setSeller] = useState('');
  const [buyer, setBuyer] = useState('');
  const [goods, setGoods] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('DAP');
  const [deliveryDays, setDeliveryDays] = useState('30');
  const [payTerms, setPayTerms] = useState('30% предоплата, 70% по факту отгрузки');
  const [penaltyRate, setPenaltyRate] = useState('0.1');
  const [maxPenalty, setMaxPenalty] = useState('10');
  const [result, setResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sourcesCountry, setSourcesCountry] = useState('UZ');

  const sellerLaw = legalSources.find(s => s.code === sellerCountry);
  const viewSource = legalSources.find(s => s.code === sourcesCountry);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setResult(generateDoc(docType, seller, buyer, sellerCountry, buyerCountry, goods, amount, currency, incoterms, deliveryDays, payTerms, scope, intLaw, penaltyRate, maxPenalty));
      setGenerating(false);
    }, 1800);
  };

  const inputStyle = { width: '100%', padding: '9px 13px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 };

  return (
    <div className="fade-in" style={{ padding: '28px 36px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>ПРАВОВОЙ ИИ-АССИСТЕНТ</div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Юридические документы по законам СНГ и международному праву</h1>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
        Зеркальные штрафные санкции · Локальное право СНГ · Международное право (CISG, Английское, Швейцарское)
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['generator','⚖ Генератор'],['mirrors','🔄 Зеркальные штрафы'],['intlaw','🌍 Международное право'],['sources','📚 Правовые базы']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: activeTab===v?'var(--accent)':'transparent', color: activeTab===v?'var(--navy)':'var(--text-2)' }}>{l}</button>
        ))}
      </div>

      {/* GENERATOR */}
      {activeTab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {/* Scope selector */}
            <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Тип сделки</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['local','🏢 Локальная (СНГ)'],['international','🌍 Международная']].map(([v,l]) => (
                  <button key={v} onClick={() => setScope(v)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', background: scope===v?'var(--accent)':'var(--navy-3)', color: scope===v?'var(--navy)':'var(--text-2)', border: `1px solid ${scope===v?'var(--accent)':'var(--border)'}`, fontWeight: scope===v?600:400 }}>{l}</button>
                ))}
              </div>
              {scope === 'international' && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Применимое международное право</label>
                  <select style={inputStyle} value={intLaw} onChange={e => setIntLaw(e.target.value)}>
                    {internationalLaw.map(l => <option key={l.id} value={l.id}>{l.recommended?'⭐ ':''}{l.name} — {l.scope}</option>)}
                  </select>
                </div>
              )}
              {scope === 'local' && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 6, fontSize: 12, color: 'var(--accent)' }}>
                  ⚖ Документ будет составлен по {sellerLaw?.mainCode} (страна продавца)
                </div>
              )}
            </div>

            {/* Doc type */}
            <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Тип документа</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {docTypes.map(d => (
                  <button key={d.id} onClick={() => setDocType(d.id)} style={{ padding: '9px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: 'none', background: docType===d.id?'rgba(0,212,170,0.1)':'var(--navy-3)', border: `1px solid ${docType===d.id?'rgba(0,212,170,0.4)':'var(--border)'}`, color: docType===d.id?'var(--accent)':'var(--text-2)', fontSize: 12, fontWeight: docType===d.id?600:400 }}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Countries */}
            <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Стороны</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Страна продавца</label>
                  <select style={inputStyle} value={sellerCountry} onChange={e => setSellerCountry(e.target.value)}>
                    {legalSources.map(s => <option key={s.code} value={s.code}>{s.flag} {s.country}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Страна покупателя</label>
                  <select style={inputStyle} value={buyerCountry} onChange={e => setBuyerCountry(e.target.value)}>
                    {legalSources.map(s => <option key={s.code} value={s.code}>{s.flag} {s.country}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Продавец</label><input style={inputStyle} placeholder="Название компании" value={seller} onChange={e => setSeller(e.target.value)} /></div>
                <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Покупатель</label><input style={inputStyle} placeholder="Название компании" value={buyer} onChange={e => setBuyer(e.target.value)} /></div>
              </div>
            </div>

            {/* Deal details */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Детали сделки</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Товар</label><input style={inputStyle} placeholder="Напр.: Пшеница 3-го класса, 500 тонн" value={goods} onChange={e => setGoods(e.target.value)} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Сумма</label><input style={inputStyle} type="number" placeholder="94000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Валюта</label><select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>{['USD','EUR','UZS','KZT','RUB'].map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Incoterms</label><select style={inputStyle} value={incoterms} onChange={e => setIncoterms(e.target.value)}>{['EXW','FOB','CIF','DAP','DDP','CFR'].map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Срок поставки (дней)</label><input style={inputStyle} type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} /></div>
                  <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Условия оплаты</label><select style={inputStyle} value={payTerms} onChange={e => setPayTerms(e.target.value)}><option>30% предоплата, 70% по факту отгрузки</option><option>100% предоплата</option><option>100% по факту получения</option><option>Аккредитив (LC)</option></select></div>
                </div>
                {/* Penalty settings */}
                <div style={{ padding: '10px 12px', background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>🔄 Зеркальные штрафы (одинаковые для обеих сторон)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Пеня %/день</label><input style={inputStyle} type="number" step="0.1" value={penaltyRate} onChange={e => setPenaltyRate(e.target.value)} /></div>
                    <div><label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Максимум %</label><input style={inputStyle} type="number" value={maxPenalty} onChange={e => setMaxPenalty(e.target.value)} /></div>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ width: '100%', justifyContent: 'center', marginTop: 14, padding: '12px', fontSize: 14 }}>
                {generating ? '⚖ Анализирую законодательство...' : `⚖ Сгенерировать — ${docTypes.find(d=>d.id===docType)?.label}`}
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>Документ</div>
              {result && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>🔄 Зеркальные штрафы</span>
                  <span className="badge badge-blue" style={{ fontSize: 10 }}>⚖ {scope==='international'?'CISG':'СНГ право'}</span>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => navigator.clipboard?.writeText(result)}>📋</button>
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => alert('PDF... (демо)')}>⬇ PDF</button>
                </div>
              )}
            </div>
            {!result && !generating && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-3)', padding: '40px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚖</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Заполните форму и нажмите «Сгенерировать»</div>
                <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-3)' }}>
                  ИИ составит документ по нормам<br/>
                  {scope==='international'?'международного права (CISG + ICC)':sellerLaw?.mainCode}<br/>
                  с зеркальными штрафными санкциями
                </div>
              </div>
            )}
            {generating && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚖</div>
                <div style={{ color: 'var(--accent)', fontSize: 14, marginBottom: 6 }}>Анализирую {scope==='international'?'КМКПТ/CISG и ICC Incoterms':sellerLaw?.mainCode}...</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Проверяю зеркальность штрафных санкций</div>
              </div>
            )}
            {result && (
              <div style={{ flex: 1 }}>
                <pre style={{ fontSize: 10.5, lineHeight: 1.8, color: 'var(--text-2)', background: 'var(--navy-3)', padding: '14px', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 600, overflowY: 'auto' }}>{result}</pre>
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 7, fontSize: 11, color: 'var(--gold)' }}>
                  ⚠ Черновик. Рекомендуется проверка юристом. Ссылки на статьи актуальны на дату генерации.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MIRROR PENALTIES */}
      {activeTab === 'mirrors' && (
        <div style={{ maxWidth: 800 }}>
          <div style={{ marginBottom: 20, padding: '16px 20px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--red)', marginBottom: 10 }}>⚠ Найденные дисбалансы в ваших ТФД</div>
            {mirrorPenalties.asymmetries_found.map((a, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6, display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--red)' }}>✗</span>
                <span><strong>{a.doc}:</strong> {a.issue}</span>
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)', fontSize: 16 }}>🔄 Стандарт GLORIX — зеркальные санкции</div>

          {[
            { title: 'Просрочка поставки vs просрочка оплаты', seller: 'Пеня 0.1%/день, макс. 10%', buyer: 'Пеня 0.1%/день, макс. 10% ← ОДИНАКОВО', ok: true, fix: 'В ваших ТФД: покупатель ограничен 5%, поставщик — нет' },
            { title: 'Непоставка vs отказ от оплаты', seller: 'Возврат предоплаты + штраф 10%', buyer: 'Право на возврат товара + штраф 10% ← ЗЕРКАЛЬНО', ok: true, fix: 'В ваших ТФД: штраф 10% только с поставщика' },
            { title: 'Право приостановления', seller: 'Любая сторона — уведомление 5 дней', buyer: 'Любая сторона — уведомление 5 дней ← РАВНО', ok: true, fix: 'В ваших ТФД: только покупатель мог приостановить' },
            { title: 'Форс-мажор', seller: 'Освобождение при подтверждении ТПП', buyer: 'Освобождение при подтверждении ТПП ← РАВНО', ok: true, fix: 'В ваших ТФД: уже было зеркально — сохранено' },
          ].map((item, i) => (
            <div key={i} className="card" style={{ marginBottom: 12, borderColor: item.ok ? 'rgba(0,212,170,0.3)' : 'rgba(255,77,77,0.3)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>{item.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <div style={{ padding: '10px', background: 'rgba(99,179,237,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: '#63B3ED', fontWeight: 700, marginBottom: 4 }}>ПРОДАВЕЦ</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.seller}</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--gold-dim)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}>ПОКУПАТЕЛЬ</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.buyer}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '6px 10px', background: 'var(--navy-3)', borderRadius: 6 }}>
                📋 {item.fix}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INTERNATIONAL LAW */}
      {activeTab === 'intlaw' && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)', fontSize: 16 }}>Международное право для глобальных сделок</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
            Локальные сделки СНГ → национальное право. Международные сделки → выберите ниже.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {internationalLaw.map((law, i) => (
              <div key={law.id} className="card" style={{ borderColor: law.recommended ? 'rgba(0,212,170,0.3)' : 'var(--border)', padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{law.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{law.fullName}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                    {law.recommended && <span className="badge badge-green">⭐ Рекомендовано</span>}
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>📍 {law.scope}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>✓ Плюсы</div>
                    {law.pros.map((p,j) => <div key={j} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3 }}>• {p}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginBottom: 6 }}>✗ Минусы</div>
                    {law.cons.map((p,j) => <div key={j} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3 }}>• {p}</div>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-3)' }}>Арбитраж:</span>
                  <span style={{ color: 'var(--accent)' }}>{law.arbitration}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>🔗 {law.site}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOURCES */}
      {activeTab === 'sources' && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Официальные правовые базы 11 стран СНГ</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {legalSources.map(s => (
              <button key={s.code} onClick={() => setSourcesCountry(s.code)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none', background: sourcesCountry===s.code?'var(--accent)':'var(--navy-3)', color: sourcesCountry===s.code?'var(--navy)':'var(--text-2)', border: `1px solid ${sourcesCountry===s.code?'var(--accent)':'var(--border)'}` }}>
                {s.flag} {s.country}
              </button>
            ))}
          </div>
          {viewSource && (
            <div className="card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>{viewSource.flag}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>{viewSource.country}</div>
                  <div style={{ fontSize: 13, color: 'var(--accent)' }}>{viewSource.mainCode}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {viewSource.sites.map((site, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 16px', background: 'var(--navy-3)', borderRadius: 10, border: `1px solid ${site.type==='primary'?'rgba(0,212,170,0.2)':'var(--border)'}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{site.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{site.desc}</div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>{site.url}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className={`badge ${site.type==='primary'?'badge-green':'badge-gray'}`} style={{ fontSize: 10 }}>{site.type==='primary'?'✓ Основной':'Доп.'}</span>
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>Гос. портал</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Ключевые статьи торгового права</div>
              {viewSource.tradeArticles.map((art, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--navy-3)', borderRadius: 8, marginBottom: 8 }}>
                  <span style={{ padding: '2px 8px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 5, fontSize: 11, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', flexShrink: 0 }}>{art.art}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{art.topic}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{art.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontWeight: 600, marginBottom: 12, fontFamily: 'var(--font-display)', marginTop: 24 }}>Международные организации</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {internationalSources.map((s, i) => (
              <div key={i} style={{ padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>{s.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)' }}>{s.url}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
