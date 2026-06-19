import { useState } from 'react';
import { accountTypes, originCertTypes } from '../data/accounts';

function VerificationBadge({ level }) {
  const map = {
    none: { label: 'Не верифицирован', cls: 'badge-red', icon: '✗' },
    basic: { label: 'Базовая верификация', cls: 'badge-gold', icon: '◎' },
    full: { label: 'Полная верификация', cls: 'badge-green', icon: '✓' },
  };
  const b = map[level];
  return <span className={`badge ${b.cls}`}>{b.icon} {b.label}</span>;
}

export default function AccountVerification() {
  const [selectedType, setSelectedType] = useState('buyer');
  const [tab, setTab] = useState('types');
  const [uploadedDocs, setUploadedDocs] = useState({ registration: true, tax: true });
  const [category, setCategory] = useState('Агро / Продукты');

  const acct = accountTypes.find(a => a.id === selectedType);
  const allRequired = acct.requiredDocs.filter(d => d.required).every(d => uploadedDocs[d.id]);
  const verLevel = !uploadedDocs.registration ? 'none' : allRequired ? 'full' : 'basic';

  const toggleDoc = (id) => setUploadedDocs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>АККАУНТЫ И ВЕРИФИКАЦИЯ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Типы аккаунтов</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
        Три типа аккаунта · Лицензионная верификация · Сертификаты происхождения
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['types','Типы аккаунтов'],['verify','Верификация продавца'],['origin','Сертификаты происхождения']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: tab === v ? 'var(--accent)' : 'transparent',
            color: tab === v ? 'var(--navy)' : 'var(--text-2)',
            transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* TYPES TAB */}
      {tab === 'types' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {accountTypes.map(type => (
              <div key={type.id} onClick={() => setSelectedType(type.id)} style={{
                padding: '22px 20px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                background: selectedType === type.id ? `${type.color}10` : 'var(--card)',
                border: `2px solid ${selectedType === type.id ? type.color : 'var(--border)'}`,
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{type.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: type.color, marginBottom: 6 }}>{type.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, lineHeight: 1.6 }}>{type.desc}</div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ВОЗМОЖНОСТИ</div>
                  {type.features.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3, display: 'flex', gap: 6 }}>
                      <span style={{ color: type.color }}>✓</span>{f}
                    </div>
                  ))}
                </div>

                {type.restrictions.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ОГРАНИЧЕНИЯ</div>
                    {type.restrictions.map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3, display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--red)' }}>✗</span>{r}
                      </div>
                    ))}
                  </div>
                )}

                {selectedType === type.id && (
                  <div style={{ marginTop: 14, padding: '8px 12px', background: `${type.color}20`, borderRadius: 8, fontSize: 12, color: type.color, fontWeight: 600, textAlign: 'center' }}>
                    ✓ Выбран
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: 'var(--navy-3)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              Сравнение типов аккаунтов
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Функция</th>
                    {accountTypes.map(t => (
                      <th key={t.id} style={{ padding: '12px 20px', textAlign: 'center', fontSize: 13, color: t.color, fontWeight: 600 }}>{t.icon} {t.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Создание тендеров', true, false, true],
                    ['Покупка в маркетплейсе', true, false, true],
                    ['Продажа в маркетплейсе', false, true, true],
                    ['Подача оферт на тендеры', false, true, true],
                    ['RFI запросы', true, false, true],
                    ['Document Center', false, true, true],
                    ['Аналитика закупок', true, false, true],
                    ['Аналитика продаж', false, true, true],
                    ['Лицензионная верификация', false, true, true],
                    ['Сертификат происхождения', false, true, true],
                  ].map(([label, buyer, seller, both], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 20px', fontSize: 13, color: 'var(--text-2)' }}>{label}</td>
                      {[buyer, seller, both].map((v, j) => (
                        <td key={j} style={{ padding: '10px 20px', textAlign: 'center', fontSize: 16 }}>
                          {v ? <span style={{ color: 'var(--accent)' }}>✓</span> : <span style={{ color: 'var(--border-2)' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VERIFICATION TAB */}
      {tab === 'verify' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          <div>
            {/* Account type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {accountTypes.filter(t => t.canSell).map(t => (
                <button key={t.id} onClick={() => setSelectedType(t.id)} style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none', fontWeight: 500,
                  background: selectedType === t.id ? t.color : 'var(--card)',
                  color: selectedType === t.id ? 'var(--navy)' : 'var(--text-2)',
                  border: `1px solid ${selectedType === t.id ? t.color : 'var(--border)'}`,
                }}>{t.icon} {t.title}</button>
              ))}
            </div>

            {/* Required docs */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: 'var(--font-display)' }}>Обязательные документы</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
                Без этих документов аккаунт продавца не активируется. ИИ верифицирует через госреестры.
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 16 }}>
                ⚠ Демо-режим: кнопки «Загрузить» не принимают реальные файлы, проверка через госреестр не выполняется
              </div>
              {acct.requiredDocs.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8,
                  background: uploadedDocs[doc.id] ? 'rgba(0,212,170,0.06)' : 'var(--navy-3)',
                  border: `1px solid ${uploadedDocs[doc.id] ? 'rgba(0,212,170,0.25)' : 'var(--border)'}`,
                  borderRadius: 8,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: uploadedDocs[doc.id] ? 'var(--accent)' : 'var(--navy-2)',
                    border: `2px solid ${uploadedDocs[doc.id] ? 'var(--accent)' : 'var(--border)'}`,
                    color: uploadedDocs[doc.id] ? 'var(--navy)' : 'var(--text-3)',
                    fontSize: 12, fontWeight: 700,
                  }}>{uploadedDocs[doc.id] ? '✓' : '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      {doc.auto ? '◎ Проверяется автоматически через госреестр' : 'Загрузите документ вручную'}
                      {!doc.required && ' · Необязательно'}
                    </div>
                  </div>
                  {!doc.auto && (
                    <button onClick={() => toggleDoc(doc.id)} className={`btn ${uploadedDocs[doc.id] ? 'btn-ghost' : 'btn-primary'}`}
                      style={{ fontSize: 12, padding: '6px 14px' }}>
                      {uploadedDocs[doc.id] ? '✓ Загружен' : '+ Загрузить'}
                    </button>
                  )}
                  {doc.auto && uploadedDocs[doc.id] && <span className="badge badge-green" style={{ fontSize: 10 }}>◎ ИИ проверил</span>}
                </div>
              ))}
            </div>

            {/* Category-specific docs */}
            {acct.canSell && acct.categoryDocs && (
              <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>Документы по категории товара</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>Выберите категорию товара который планируете продавать</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {acct.categoryDocs.map(c => (
                    <button key={c.category} onClick={() => setCategory(c.category)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: 'none',
                      background: category === c.category ? 'var(--accent)' : 'var(--navy-3)',
                      color: category === c.category ? 'var(--navy)' : 'var(--text-2)',
                      border: `1px solid ${category === c.category ? 'var(--accent)' : 'var(--border)'}`,
                    }}>{c.category}</button>
                  ))}
                </div>
                {acct.categoryDocs.find(c => c.category === category)?.docs.map((doc, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8, marginBottom: 8 }}>
                    <span style={{ color: 'var(--gold)', fontSize: 16 }}>⚠</span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>{doc}</span>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 12px' }}>Загрузить</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status sidebar */}
          <div>
            <div className="card" style={{ marginBottom: 16, padding: '20px', borderColor: verLevel === 'full' ? 'rgba(0,212,170,0.3)' : verLevel === 'basic' ? 'rgba(245,166,35,0.3)' : 'rgba(255,77,77,0.3)' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontFamily: 'var(--font-display)' }}>Статус верификации</div>
              <VerificationBadge level={verLevel} />
              <div style={{ marginTop: 14 }}>
                {[
                  { label: 'Регистрация юрлица', done: uploadedDocs.registration },
                  { label: 'Налоговый учёт', done: uploadedDocs.tax },
                  { label: 'Торговая лицензия', done: uploadedDocs.trade_license },
                  { label: 'Сертификат происхождения', done: uploadedDocs.origin_cert },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: s.done ? 'var(--accent)' : 'var(--navy-3)', border: `1px solid ${s.done ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: s.done ? 'var(--navy)' : 'var(--text-3)', flexShrink: 0 }}>
                      {s.done ? '✓' : '○'}
                    </div>
                    <span style={{ fontSize: 12, color: s.done ? 'var(--text)' : 'var(--text-3)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
              {verLevel === 'full' && (
                <>
                  <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 11.5, color: '#B48214' }}>
                    ⚠ Демо-режим: активация не создаёт реальный продающий аккаунт
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                    Активировать аккаунт продавца →
                  </button>
                </>
              )}
            </div>

            <div className="card" style={{ padding: '16px', background: 'rgba(245,166,35,0.05)', borderColor: 'rgba(245,166,35,0.2)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>⚖ Юридическое предупреждение</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                Продажа товаров без действующей лицензии на торговую деятельность является административным или уголовным нарушением в большинстве стран СНГ. GLORIX несёт ответственность за верификацию и не допускает невалидных продавцов к торговле.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORIGIN CERT TAB */}
      {tab === 'origin' && (
        <div>
          <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)' }}>
            ◎ <strong style={{ color: 'var(--accent)' }}>Зачем нужен сертификат происхождения:</strong> Подтверждает страну производства товара. Даёт право на льготные таможенные пошлины (CT-1 в СНГ = 0% пошлина между странами-участниками). Обязателен для экспорта во многие страны.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {originCertTypes.map((cert, i) => (
              <div key={cert.id} className="card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{cert.name}</div>
                  {cert.id === 'ct1' && <span className="badge badge-green" style={{ fontSize: 10 }}>★ СНГ</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8, fontWeight: 600 }}>📍 {cert.region}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{cert.desc}</div>
              </div>
            ))}
          </div>

          {/* CT-1 detail */}
          <div className="card" style={{ borderColor: 'rgba(0,212,170,0.25)' }}>
            <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)' }}>🌍 СТ-1 — самый важный для СНГ</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Кто выдаёт СТ-1:</div>
                {[['Узбекистан 🇺🇿', 'ТПП Узбекистана, Минэкономики'], ['Казахстан 🇰🇿', 'НПП «Атамекен», таможенные органы'], ['Россия 🇷🇺', 'ТПП РФ, региональные ТПП'], ['Азербайджан 🇦🇿', 'ТПП Азербайджана']].map(([c, org]) => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span>{c}</span><span style={{ color: 'var(--text-2)', fontSize: 12 }}>{org}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>Что нужно для получения СТ-1:</div>
                {['Контракт купли-продажи', 'Счёт-фактура (инвойс)', 'Упаковочный лист', 'Документы подтверждающие производство в стране', 'Заявление в ТПП', 'Оплата госпошлины (~$10–30)'].map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--text-2)' }}>
                    <span style={{ color: 'var(--accent)' }}>{i+1}.</span>{s}
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--accent-dim)', borderRadius: 8, fontSize: 12, color: 'var(--accent)' }}>
                  ◎ GLORIX Document Center поможет подготовить все необходимые документы для получения СТ-1
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
