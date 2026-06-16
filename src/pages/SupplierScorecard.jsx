import { useState } from 'react';
import { suppliers, kpiHistory, antiFraudChecks } from '../data/cips';

const c10labels = {
  competence: 'Компетентность', capacity: 'Мощность', commitment: 'Обязательность',
  control: 'Контроль', cash: 'Финансы', consistency: 'Стабильность',
  cost: 'Стоимость', compatibility: 'Совместимость', compliance: 'Соответствие', culture: 'Культура',
};

function ScoreBar({ value, max = 100, color = 'var(--accent)' }) {
  return (
    <div style={{ height: 6, background: 'var(--navy-3)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.6s' }} />
    </div>
  );
}

function RiskBadge({ level }) {
  const map = { low: ['badge-green', 'Низкий риск'], medium: ['badge-gold', 'Средний риск'], high: ['badge-red', 'Высокий риск'] };
  const [cls, label] = map[level] || map.low;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function SupplierScorecard() {
  const [selected, setSelected] = useState(suppliers[0]);
  const [tab, setTab] = useState('10c');

  const avg10c = Math.round(Object.values(selected.cips10c).reduce((a, b) => a + b, 0) / 10);
  const avgEsg = Math.round((selected.esg.environmental + selected.esg.social + selected.esg.governance) / 3);

  const tabs = [['10c', 'CIPS 10C'], ['esg', 'ESG'], ['kpi', 'KPI'], ['fraud', 'Anti-Fraud']];

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ПОСТАВЩИКИ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Scorecard поставщиков</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
        Оценка по стандарту CIPS 10C · ESG · KPI · Anti-Fraud
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
        {/* Supplier list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {suppliers.map(s => {
            const avg = Math.round(Object.values(s.cips10c).reduce((a, b) => a + b, 0) / 10);
            const isActive = selected.id === s.id;
            return (
              <div key={s.id} onClick={() => setSelected(s)} style={{
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                background: isActive ? 'rgba(0,212,170,0.08)' : 'var(--card)',
                border: `1px solid ${isActive ? 'rgba(0,212,170,0.4)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.flag} {s.name}</div>
                  <RiskBadge level={s.antiFraud.riskLevel} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{s.city} · {s.totalDeals} сделок</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-2)' }}>CIPS 10C</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{avg}/100</span>
                </div>
                <ScoreBar value={avg} />
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div>
          {/* Header */}
          <div className="card" style={{ marginBottom: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{selected.flag}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>{selected.name}</div>
                  <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{selected.city} · Участник с {selected.since}</div>
                  {selected.antiFraud.redFlags.length === 0
                    ? <span className="badge badge-green" style={{ marginTop: 4, display: 'inline-flex' }}>✓ Чист</span>
                    : <span className="badge badge-gold" style={{ marginTop: 4, display: 'inline-flex' }}>⚠ {selected.antiFraud.redFlags.length} флага</span>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'center' }}>
                {[
                  ['CIPS 10C', avg10c + '%', 'var(--accent)'],
                  ['ESG', avgEsg + '%', '#63B3ED'],
                  ['KPI', selected.kpi.onTimeDelivery + '%', 'var(--gold)'],
                  ['Доверие', selected.trustScore + '%', 'var(--accent)'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background: 'var(--navy-3)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontWeight: 700, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--navy-3)', borderRadius: 10, padding: 4 }}>
            {tabs.map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} style={{
                flex: 1, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: tab === v ? 'var(--accent)' : 'transparent',
                color: tab === v ? 'var(--navy)' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}>{l}</button>
            ))}
          </div>

          {/* CIPS 10C */}
          {tab === '10c' && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>CIPS 10C — Оценка поставщика</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 18 }}>Стандарт Chartered Institute of Procurement & Supply. Средний балл: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{avg10c}/100</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {Object.entries(selected.cips10c).map(([k, v]) => {
                  const color = v >= 85 ? 'var(--accent)' : v >= 70 ? 'var(--gold)' : 'var(--red)';
                  return (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-2)' }}>{c10labels[k]}</span>
                        <span style={{ fontWeight: 600, color }}>{v}</span>
                      </div>
                      <ScoreBar value={v} color={color} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ESG */}
          {tab === 'esg' && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>ESG — Экология, Социальная ответственность, Управление</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>По стандарту CIPS ESG Metrics Framework</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[['🌱', 'Экология (E)', selected.esg.environmental, '#4ADE80'],['👥', 'Социальное (S)', selected.esg.social, '#63B3ED'],['⚖️', 'Управление (G)', selected.esg.governance, 'var(--gold)']].map(([icon, l, v, c]) => (
                  <div key={l} style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
                    <ScoreBar value={v} color={c} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['CO₂ сертификат', selected.esg.co2certified],
                  ['Соответствие трудовому праву', selected.esg.laborCompliant],
                  ['Индекс диверсификации', selected.esg.diversityScore + '%'],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: v === true ? 'var(--accent)' : v === false ? 'var(--red)' : 'var(--text)' }}>
                      {v === true ? '✓ Да' : v === false ? '✗ Нет' : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI */}
          {tab === 'kpi' && (
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>KPI — Операционные показатели</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>По CIPS — KPI должны быть согласованы до подписания контракта</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  ['Доставка вовремя', selected.kpi.onTimeDelivery + '%', 'var(--accent)'],
                  ['Качество товара', selected.kpi.qualityScore + '%', '#63B3ED'],
                  ['Время ответа', selected.kpi.responseTime + ' ч', 'var(--gold)'],
                  ['Кол-во споров', selected.kpi.disputeRate + '%', selected.kpi.disputeRate < 5 ? 'var(--accent)' : 'var(--red)'],
                  ['Средний срок', selected.kpi.avgLeadDays + ' дн', 'var(--text)'],
                  ['Успешных сделок', selected.successDeals + '/' + selected.totalDeals, 'var(--accent)'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>История по месяцам</div>
              {kpiHistory.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 70, fontSize: 12, color: 'var(--text-2)' }}>{h.month}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--navy-3)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${h.onTime}%`, background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', width: 100, textAlign: 'right' }}>
                    <span style={{ color: 'var(--accent)' }}>{h.onTime}%</span> · споры: {h.disputes}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Anti-Fraud */}
          {tab === 'fraud' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)' }}>Anti-Fraud проверка</div>
                <RiskBadge level={selected.antiFraud.riskLevel} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 20 }}>
                Автоматические + ручные проверки по стандарту CIPS Compliance
              </div>

              {selected.antiFraud.redFlags.length > 0 && (
                <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--red-dim)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 8 }}>⚠ Red Flags</div>
                  {selected.antiFraud.redFlags.map((f, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>• {f}</div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {antiFraudChecks.map(check => {
                  const passed = check.id === 'c1' ? selected.antiFraud.registryVerified
                    : check.id === 'c2' ? selected.antiFraud.addressVerified
                    : check.id === 'c3' ? selected.antiFraud.bankVerified
                    : check.id === 'c4' ? selected.antiFraud.taxVerified
                    : check.id === 'c5' ? selected.antiFraud.redFlags.length === 0
                    : true;
                  return (
                    <div key={check.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: passed ? 'rgba(0,212,170,0.04)' : 'var(--red-dim)',
                      border: `1px solid ${passed ? 'rgba(0,212,170,0.15)' : 'rgba(255,77,77,0.2)'}`,
                      borderRadius: 8,
                    }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: passed ? 'var(--accent)' : 'var(--red)', fontSize: 11, color: 'var(--navy)', flexShrink: 0 }}>
                        {passed ? '✓' : '✗'}
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>{check.label}</div>
                      <span className="badge" style={{ fontSize: 10, background: check.auto ? 'var(--accent-dim)' : 'var(--gold-dim)', color: check.auto ? 'var(--accent)' : 'var(--gold)' }}>
                        {check.auto ? 'Авто' : 'Ручная'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
