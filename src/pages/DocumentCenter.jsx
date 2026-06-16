import { useState } from 'react';
import { docTemplates } from '../data/accounts';

const generated = {
  commercial_offer: `КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ №КП-2025-0142

От: Tashkent Agro LLC
ИНН: 123456789 | Адрес: г. Ташкент, ул. Навои 12
Тел: +998 71 123-45-67 | Email: info@tashkentagro.uz

Кому: [Название компании покупателя]
Дата: ${new Date().toLocaleDateString('ru-RU')}
Действительно до: ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('ru-RU')}

ПРЕДМЕТ ПРЕДЛОЖЕНИЯ:
Пшеница 3-го класса (ГОСТ Р 52554-2006)

ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ:
• Влажность: не более 14%
• Протеин: не менее 12%
• Клейковина: не менее 23%
• Упаковка: биг-бэги по 1 тонне

КОММЕРЧЕСКИЕ УСЛОВИЯ:
• Объём: 500 метрических тонн
• Цена: 188 USD/тонна (CIF Ташкент)
• Инкотермс 2020: CIF
• Условия оплаты: 30% предоплата, 70% по факту отгрузки

ДОСТАВКА:
• Срок: 12 рабочих дней
• Маршрут: ж/д через Казахстан
• Страховка включена в цену CIF

ИТОГО: 94,000 USD (девяносто четыре тысячи долларов США)

Настоящее КП подготовлено с использованием платформы GLORIX.
Документ верифицирован GLORIX согласно данным госреестра.

С уважением,
___________________          ___________________
Подпись                      Печать компании`,

  invoice: `СЧЁТ-ФАКТУРА №СФ-2025-0089

Продавец: Tashkent Agro LLC
ИНН: 123456789 | р/с: 20208000900000000001 в «Асакабанк»

Покупатель: [Название компании]
ИНН: [ИНН покупателя]

Дата: ${new Date().toLocaleDateString('ru-RU')}

№  Наименование         Кол-во    Цена/ед    Сумма
1  Пшеница 3 кл.        500 т     188 USD    94,000 USD

Итого без НДС:                               94,000 USD
НДС (12%):                                   11,280 USD
ИТОГО К ОПЛАТЕ:                             105,280 USD

Основание: Договор №2025-089 от ${new Date().toLocaleDateString('ru-RU')}

Руководитель: ___________________
Гл. бухгалтер: __________________`,
};

export default function DocumentCenter() {
  const [selected, setSelected] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({});

  const categories = ['all', 'Продажи', 'Финансы', 'Логистика', 'Тендеры', 'Юридические', 'Таможня', 'Качество'];

  const filtered = filter === 'all' ? docTemplates : docTemplates.filter(d => d.category === filter);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setResult(generated[selected.id] || `[ИИ-черновик документа "${selected.title}" готов]\n\nДокумент сгенерирован на основе ваших данных.\nОтредактируйте, поставьте подпись и печать компании.\n\nVERIFIED BY GLORIX ✓`);
      setGenerating(false);
    }, 2000);
  };

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>DOCUMENT CENTER</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Центр документов</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
        ИИ генерирует черновик · Вы редактируете и подписываете · Документ от вашей компании, не от ИИ
      </div>

      {/* Key principle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { step: '1', icon: '◎', title: 'ИИ создаёт черновик', desc: 'За 30 секунд на основе ваших данных', color: 'var(--accent)' },
          { step: '2', icon: '✏️', title: 'Вы редактируете', desc: 'Проверяете, корректируете детали', color: 'var(--gold)' },
          { step: '3', icon: '🖊️', title: 'Подписываете и отправляете', desc: 'Документ от вашей компании с вашей печатью', color: '#63B3ED' },
        ].map(s => (
          <div key={s.step} className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 18px', borderColor: `${s.color}33` }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${s.color}20`, border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: s.color, marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {!selected ? (
        <div>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {categories.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: filter === c ? 'var(--accent)' : 'var(--navy-3)',
                color: filter === c ? 'var(--navy)' : 'var(--text-2)',
                border: `1px solid ${filter === c ? 'var(--accent)' : 'var(--border)'}`,
              }}>{c === 'all' ? 'Все документы' : c}</button>
            ))}
          </div>

          {/* Templates grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filtered.map(doc => (
              <div key={doc.id} onClick={() => { setSelected(doc); setResult(null); }} style={{
                padding: '20px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: 'var(--card)', border: '1px solid var(--border)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{doc.icon}</span>
                  <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                    {doc.popular && <span className="badge badge-gold" style={{ fontSize: 9 }}>★ Популярный</span>}
                    {doc.glorixVerified && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ GLORIX</span>}
                    {doc.aiEnabled && <span className="badge badge-blue" style={{ fontSize: 9 }}>◎ ИИ</span>}
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{doc.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.5 }}>{doc.desc}</div>
                <span className="tag" style={{ fontSize: 10 }}>{doc.category}</span>
                {doc.note && <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 8, lineHeight: 1.5 }}>⚠ {doc.note}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Form */}
          <div>
            <button onClick={() => { setSelected(null); setResult(null); }} style={{ background: 'none', color: 'var(--text-2)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              ← Назад к шаблонам
            </button>

            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 28 }}>{selected.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>{selected.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{selected.category}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selected.fields.map((field, i) => (
                  <div key={i}>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>{field}</label>
                    <input
                      style={{ width: '100%', padding: '9px 13px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}
                      placeholder={`Введите: ${field.toLowerCase()}`}
                      value={formData[field] || ''}
                      onChange={e => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {selected.note && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--gold)' }}>
                  ⚠ {selected.note}
                </div>
              )}

              <button className="btn btn-primary" onClick={generate} style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: '13px' }} disabled={generating}>
                {generating ? '◎ ИИ генерирует...' : '◎ Сгенерировать документ'}
              </button>

              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
                ИИ создаёт черновик. Вы его редактируете и подписываете своей печатью. Нигде не указывается что документ создан ИИ.
              </div>
            </div>
          </div>

          {/* Result */}
          <div>
            <div className="card" style={{ padding: '24px', height: '100%', minHeight: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Результат</div>
                {result && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>✏️ Редактировать</button>
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => alert('Скачивание PDF... (демо)')}>⬇ PDF</button>
                  </div>
                )}
              </div>

              {!result && !generating && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <div>Заполните форму и нажмите «Сгенерировать»</div>
                </div>
              )}

              {generating && (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>◎</div>
                  <div style={{ fontSize: 14, color: 'var(--accent)', marginBottom: 8 }}>ИИ анализирует данные...</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Применяет стандарты GLORIX и СНГ</div>
                </div>
              )}

              {result && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {selected.glorixVerified && <span className="badge badge-green">✓ Верифицировано GLORIX</span>}
                    <span className="badge badge-blue">◎ ИИ-черновик</span>
                  </div>
                  <pre style={{
                    fontSize: 11, lineHeight: 1.8, color: 'var(--text-2)',
                    background: 'var(--navy-3)', padding: '16px', borderRadius: 8,
                    whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 480, overflowY: 'auto',
                  }}>{result}</pre>
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--gold)' }}>
                    ⚠ Это черновик. Проверьте все данные, добавьте подпись и печать прежде чем отправить контрагенту.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
