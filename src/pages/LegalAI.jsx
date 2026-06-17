import { useState } from 'react';
import { legalSources, internationalSources, docTypes } from '../data/legalSources';

function generateDoc(type, seller, buyer, sellerCountry, buyerCountry, goods, amount, currency, incoterms, deliveryDays, payTerms) {
  const sLaw = legalSources.find(s => s.code === sellerCountry);
  const bLaw = legalSources.find(s => s.code === buyerCountry);

  // Priority law based on seller country (default CIS principle)
  const law = sLaw || bLaw || legalSources[0];
  const arts = law.tradeArticles;

  const getArt = (topic) => arts.find(a => a.topic.includes(topic))?.art || '';
  const offerArt = getArt('Оферта');
  const contractArt = getArt('купли-продажи') || getArt('Купля-продажа');
  const qualityArt = getArt('Качество');
  const deadlineArt = getArt('Срок') || getArt('срок');
  const freedomArt = getArt('Свобода');

  const date = new Date().toLocaleDateString('ru-RU');
  const validDate = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('ru-RU');
  const num = Math.floor(Math.random() * 9000 + 1000);

  if (type === 'offer') return `
ОФЕРТА № ОФ-${num}
(коммерческое предложение)

Дата: ${date}
Действительна до: ${validDate}

════════════════════════════════════════════════════
ПРАВОВОЕ ОСНОВАНИЕ:
В соответствии с ${offerArt} (${law.mainCode}), настоящий документ
является офертой — предложением заключить договор на
изложенных условиях. Акцепт оферты означает согласие
со всеми её условиями (${getArt('Момент') || 'ст. о моменте заключения'} ${law.mainCode}).
Применимое право: ${law.mainCode}
════════════════════════════════════════════════════

ПРОДАВЕЦ: ${seller || '[Продавец]'}
Страна: ${sLaw?.country || sellerCountry}
Правовой статус: Юридическое лицо, верифицировано GLORIX ✓

ПОКУПАТЕЛЬ (адресат): ${buyer || '[Покупатель]'}
Страна: ${bLaw?.country || buyerCountry}

────────────────────────────────────────────────────
ПРЕДМЕТ ОФЕРТЫ
(${contractArt || 'ст. о купле-продаже'} ${law.mainCode})
────────────────────────────────────────────────────
Товар: ${goods || '[Наименование товара]'}
Сумма: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма]'}
Условия поставки: ${incoterms} (Incoterms 2020, ICC)

────────────────────────────────────────────────────
КАЧЕСТВО ТОВАРА
(${qualityArt || 'ст. о качестве'} ${law.mainCode})
────────────────────────────────────────────────────
Продавец гарантирует, что товар соответствует
стандартам и спецификациям, указанным в приложении
к настоящей оферте. Сертификаты качества прилагаются.

────────────────────────────────────────────────────
СРОКИ ПОСТАВКИ
(${deadlineArt || 'ст. о сроках'} ${law.mainCode})
────────────────────────────────────────────────────
Срок поставки: ${deliveryDays || '[N]'} рабочих дней с даты поступления
авансового платежа на счёт Продавца.

────────────────────────────────────────────────────
УСЛОВИЯ ОПЛАТЫ
────────────────────────────────────────────────────
${payTerms || '30% предоплата, 70% по факту отгрузки'}
Escrow-сопровождение: GLORIX Platform

────────────────────────────────────────────────────
ДЕЙСТВИЕ ОФЕРТЫ
(${offerArt} ${law.mainCode})
────────────────────────────────────────────────────
Настоящая оферта действительна до ${validDate}.
Молчание не считается акцептом. Акцепт направляется
в письменной форме или через платформу GLORIX.

════════════════════════════════════════════════════
Подпись: ____________________
Печать: ____________________
${seller || '[Продавец]'}
`;

  if (type === 'contract') return `
ДОГОВОР КУПЛИ-ПРОДАЖИ № ДКП-${num}

Дата: ${date}
Место заключения: [город]

════════════════════════════════════════════════════
ПРАВОВОЕ ОСНОВАНИЕ:
Договор заключён в соответствии с:
• ${freedomArt || 'ст. о свободе договора'} ${law.mainCode} — свобода договора
• ${contractArt || 'ст. о купле-продаже'} ${law.mainCode} — договор купли-продажи
• Incoterms 2020 (ICC, Париж)
• Конвенция ООН о договорах международной купли-продажи
  товаров (КМКПТ/CISG), если применимо
Применимое право: ${law.mainCode}
════════════════════════════════════════════════════

СТОРОНЫ ДОГОВОРА:

ПРОДАВЕЦ: ${seller || '[Продавец]'}
Страна регистрации: ${sLaw?.country || sellerCountry}
Верификация GLORIX: ✓

ПОКУПАТЕЛЬ: ${buyer || '[Покупатель]'}
Страна регистрации: ${bLaw?.country || buyerCountry}
Верификация GLORIX: ✓

────────────────────────────────────────────────────
§ 1. ПРЕДМЕТ ДОГОВОРА
(${contractArt || 'ст. о купле-продаже'} ${law.mainCode})
────────────────────────────────────────────────────
1.1. Продавец обязуется передать в собственность
     Покупателя, а Покупатель обязуется принять и
     оплатить следующий товар:
     ${goods || '[Наименование, количество, единица]'}

1.2. Общая стоимость: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма и валюта]'}
     Условия: ${incoterms} (Incoterms 2020)

────────────────────────────────────────────────────
§ 2. КАЧЕСТВО ТОВАРА
(${qualityArt || 'ст. о качестве'} ${law.mainCode})
────────────────────────────────────────────────────
2.1. Качество товара должно соответствовать условиям
     настоящего договора и прилагаемой спецификации.
2.2. Продавец предоставляет сертификат качества
     на каждую партию товара.
2.3. Покупатель вправе проверить качество товара
     до подписания накладной.

────────────────────────────────────────────────────
§ 3. ЦЕНА И ПОРЯДОК ОПЛАТЫ
────────────────────────────────────────────────────
3.1. Цена товара: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма]'}
3.2. Порядок оплаты: ${payTerms || '30% предоплата, 70% по отгрузке'}
3.3. Средства хранятся на Escrow-счёте GLORIX Platform
     до выполнения условий поставки.

────────────────────────────────────────────────────
§ 4. СРОКИ И УСЛОВИЯ ПОСТАВКИ
(${deadlineArt || 'ст. о сроках'} ${law.mainCode})
────────────────────────────────────────────────────
4.1. Срок поставки: ${deliveryDays || '[N]'} рабочих дней
4.2. Условия: ${incoterms} согласно Incoterms 2020 (ICC)
4.3. Покупатель получает трекинг-номер через GLORIX.

────────────────────────────────────────────────────
§ 5. ОТВЕТСТВЕННОСТЬ СТОРОН
(${getArt('обязательств') || 'ст. об ответственности'} ${law.mainCode})
────────────────────────────────────────────────────
5.1. За нарушение сроков поставки Продавец уплачивает
     пеню в размере 0.1% от стоимости за каждый день.
5.2. При отказе от сделки виновная сторона теряет
     депозит согласно условиям платформы GLORIX.
5.3. Форс-мажор освобождает стороны от ответственности
     при наличии документального подтверждения.

────────────────────────────────────────────────────
§ 6. РАЗРЕШЕНИЕ СПОРОВ
────────────────────────────────────────────────────
6.1. Стороны стремятся разрешать споры переговорами.
6.2. При недостижении соглашения — медиация через
     Торгово-промышленную палату страны ${sLaw?.country || 'Продавца'}.
6.3. Далее — Международный коммерческий арбитраж (МКАС).

════════════════════════════════════════════════════
ПОДПИСИ СТОРОН:

ПРОДАВЕЦ                    ПОКУПАТЕЛЬ
________________            ________________
${seller || '[Продавец]'}   ${buyer || '[Покупатель]'}
М.П.                        М.П.
`;

  if (type === 'claim') return `
ПРЕТЕНЗИЯ / РЕКЛАМАЦИЯ № ПР-${num}

Дата: ${date}

════════════════════════════════════════════════════
ПРАВОВОЕ ОСНОВАНИЕ:
• ${qualityArt || 'ст. о качестве'} ${law.mainCode} — нарушение качества товара
• ${deadlineArt || 'ст. о сроках'} ${law.mainCode} — нарушение сроков поставки
• Incoterms 2020 — распределение рисков и ответственности
Применимое право: ${law.mainCode}
════════════════════════════════════════════════════

ОТ: ${buyer || '[Покупатель]'} (Заявитель)
КОМУ: ${seller || '[Продавец]'} (Ответчик)

────────────────────────────────────────────────────
ОБСТОЯТЕЛЬСТВА
────────────────────────────────────────────────────
Между сторонами заключён договор купли-продажи.
Товар: ${goods || '[Наименование товара]'}
Сумма договора: ${amount ? `${parseFloat(amount).toLocaleString()} ${currency}` : '[Сумма]'}
Условия поставки: ${incoterms} (Incoterms 2020)

────────────────────────────────────────────────────
СУТЬ ПРЕТЕНЗИИ
(${qualityArt || 'ст. о качестве'} ${law.mainCode})
────────────────────────────────────────────────────
[ ] Нарушение качества товара — не соответствует
    спецификации договора
[ ] Нарушение сроков поставки — просрочка
    (${deadlineArt} ${law.mainCode})
[ ] Поставка неполного объёма
[ ] Иное: ________________________________

────────────────────────────────────────────────────
ТРЕБОВАНИЯ ПОКУПАТЕЛЯ
────────────────────────────────────────────────────
Покупатель требует в срок 10 рабочих дней:
[ ] Заменить товар на соответствующий условиям
[ ] Уменьшить цену соразмерно недостаткам
[ ] Возместить убытки в размере: ____________
[ ] Вернуть предоплату: ___________________

════════════════════════════════════════════════════
Подпись заявителя: ____________________
${buyer || '[Покупатель]'}
Дата: ${date}

ПРИЛОЖЕНИЯ: акт приёмки, фото, экспертное заключение
`;

  return '[Тип документа не выбран]';
}

export default function LegalAI() {
  const [sellerCountry, setSellerCountry] = useState('UZ');
  const [buyerCountry, setBuyerCountry] = useState('KZ');
  const [docType, setDocType] = useState('offer');
  const [seller, setSeller] = useState('');
  const [buyer, setBuyer] = useState('');
  const [goods, setGoods] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [incoterms, setIncoterms] = useState('DAP');
  const [deliveryDays, setDeliveryDays] = useState('14');
  const [payTerms, setPayTerms] = useState('30% предоплата, 70% по факту отгрузки');
  const [result, setResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('generator');
  const [sourcesCountry, setSourcesCountry] = useState('UZ');

  const sellerLaw = legalSources.find(s => s.code === sellerCountry);
  const buyerLaw = legalSources.find(s => s.code === buyerCountry);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setResult(generateDoc(docType, seller, buyer, sellerCountry, buyerCountry, goods, amount, currency, incoterms, deliveryDays, payTerms));
      setGenerating(false);
    }, 1800);
  };

  const inputStyle = { width: '100%', padding: '9px 13px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 };

  const viewSource = legalSources.find(s => s.code === sourcesCountry);

  return (
    <div className="fade-in" style={{ padding: '28px 36px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>ПРАВОВОЙ ИИ-АССИСТЕНТ</div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Юридические документы по законам СНГ</h1>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
        ИИ читает официальные правовые базы 11 стран СНГ и составляет документы со ссылками на конкретные статьи законов
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['generator','⚖ Генератор документов'],['sources','🌐 Правовые базы СНГ'],['articles','📚 Статьи законов']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: activeTab===v?'var(--accent)':'transparent',
            color: activeTab===v?'var(--navy)':'var(--text-2)',
          }}>{l}</button>
        ))}
      </div>

      {/* GENERATOR */}
      {activeTab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {/* Doc type */}
            <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Тип документа</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {docTypes.map(d => (
                  <button key={d.id} onClick={() => setDocType(d.id)} style={{
                    padding: '10px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: 'none',
                    background: docType===d.id?'rgba(0,212,170,0.1)':'var(--navy-3)',
                    border: `1px solid ${docType===d.id?'rgba(0,212,170,0.4)':'var(--border)'}`,
                    color: docType===d.id?'var(--accent)':'var(--text-2)',
                    transition: 'all 0.15s', fontSize: 13, fontWeight: docType===d.id?600:400,
                  }}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Countries */}
            <div className="card" style={{ marginBottom: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Стороны и юрисдикция</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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
              <div style={{ padding: '10px 12px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--accent)' }}>
                ⚖ Применимое право: <strong>{sellerLaw?.mainCode}</strong> (страна продавца — приоритет по умолчанию)
              </div>
            </div>

            {/* Details */}
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Детали сделки</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Продавец</label>
                    <input style={inputStyle} placeholder="Название компании" value={seller} onChange={e => setSeller(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Покупатель</label>
                    <input style={inputStyle} placeholder="Название компании" value={buyer} onChange={e => setBuyer(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Товар</label>
                  <input style={inputStyle} placeholder="Напр.: Пшеница 3-го класса, 500 тонн" value={goods} onChange={e => setGoods(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Сумма</label>
                    <input style={inputStyle} type="number" placeholder="94000" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Валюта</label>
                    <select style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
                      {['USD','EUR','UZS','KZT','RUB','AZN'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Incoterms</label>
                    <select style={inputStyle} value={incoterms} onChange={e => setIncoterms(e.target.value)}>
                      {['EXW','FOB','CIF','CFR','DAP','DDP','FCA'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Срок поставки (дней)</label>
                    <input style={inputStyle} type="number" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Условия оплаты</label>
                    <select style={inputStyle} value={payTerms} onChange={e => setPayTerms(e.target.value)}>
                      <option>30% предоплата, 70% по факту отгрузки</option>
                      <option>100% предоплата</option>
                      <option>Оплата по факту получения</option>
                      <option>Аккредитив (LC)</option>
                      <option>50% предоплата, 50% по отгрузке</option>
                    </select>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ width: '100%', justifyContent: 'center', marginTop: 16, padding: '12px', fontSize: 14 }}>
                {generating ? '⚖ ИИ анализирует законодательство...' : `⚖ Сгенерировать — ${docTypes.find(d=>d.id===docType)?.label}`}
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600 }}>Документ</div>
              {result && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>⚖ По {sellerLaw?.mainCode}</span>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => alert('PDF... (демо)')}>⬇ PDF</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => navigator.clipboard?.writeText(result)}>📋</button>
                </div>
              )}
            </div>

            {!result && !generating && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-3)', padding: '40px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚖</div>
                <div style={{ fontSize: 14, marginBottom: 8 }}>Выберите тип документа и заполните данные</div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  ИИ прочитает законы {sellerLaw?.country} ({sellerLaw?.mainCode})<br/>
                  и составит документ со ссылками на статьи
                </div>
              </div>
            )}

            {generating && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚖</div>
                <div style={{ color: 'var(--accent)', fontSize: 14, marginBottom: 6 }}>Анализирую {sellerLaw?.mainCode}...</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Подбираю применимые статьи</div>
              </div>
            )}

            {result && (
              <div style={{ flex: 1 }}>
                <pre style={{ fontSize: 11, lineHeight: 1.8, color: 'var(--text-2)', background: 'var(--navy-3)', padding: '14px', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 580, overflowY: 'auto' }}>{result}</pre>
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 7, fontSize: 11, color: 'var(--gold)' }}>
                  ⚠ Черновик. Рекомендуется проверка юристом перед подписанием. Ссылки на статьи актуальны на дату генерации.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SOURCES */}
      {activeTab === 'sources' && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Официальные правовые базы 11 стран СНГ</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
            ИИ читает только государственные и официально признанные правовые порталы. Сторонние и неофициальные сайты не используются.
          </div>

          {/* Country selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {legalSources.map(s => (
              <button key={s.code} onClick={() => setSourcesCountry(s.code)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none',
                background: sourcesCountry===s.code?'var(--accent)':'var(--navy-3)',
                color: sourcesCountry===s.code?'var(--navy)':'var(--text-2)',
                border: `1px solid ${sourcesCountry===s.code?'var(--accent)':'var(--border)'}`,
              }}>{s.flag} {s.country}</button>
            ))}
          </div>

          {viewSource && (
            <div>
              <div className="card" style={{ marginBottom: 16, padding: '20px 24px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 36 }}>{viewSource.flag}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>{viewSource.country}</div>
                    <div style={{ fontSize: 13, color: 'var(--accent)' }}>Основной кодекс: {viewSource.mainCode}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {viewSource.sites.map((site, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 16px', background: 'var(--navy-3)', borderRadius: 10, border: `1px solid ${site.type==='primary'?'rgba(0,212,170,0.2)':'var(--border)'}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: site.type==='primary'?'var(--accent-dim)':'var(--navy-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {site.type==='primary'?'⭐':'🔗'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{site.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{site.desc}</div>
                        <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>{site.url}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span className={`badge ${site.type==='primary'?'badge-green':'badge-gray'}`} style={{ fontSize: 10 }}>
                          {site.type==='primary'?'✓ Основной':'Дополнительный'}
                        </span>
                        {site.official && <span className="badge badge-blue" style={{ fontSize: 10 }}>Гос. портал</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* International */}
          <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)', marginTop: 24 }}>Международные правовые организации</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
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

      {/* ARTICLES */}
      {activeTab === 'articles' && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Ключевые статьи торгового права СНГ</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {legalSources.map(s => (
              <button key={s.code} onClick={() => setSourcesCountry(s.code)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none',
                background: sourcesCountry===s.code?'var(--accent)':'var(--navy-3)',
                color: sourcesCountry===s.code?'var(--navy)':'var(--text-2)',
                border: `1px solid ${sourcesCountry===s.code?'var(--accent)':'var(--border)'}`,
              }}>{s.flag} {s.code}</button>
            ))}
          </div>
          {viewSource && (
            <div>
              <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600, marginBottom: 16 }}>
                {viewSource.flag} {viewSource.country} — {viewSource.mainCode}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {viewSource.tradeArticles.map((art, i) => (
                  <div key={i} style={{ padding: '14px 18px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ padding: '3px 10px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 6, fontSize: 12, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap', flexShrink: 0 }}>{art.art}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{art.topic}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{art.text}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
