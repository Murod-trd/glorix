import { useState } from 'react';
import { calcDeposit, depositRates, currentUser } from '../data/mock';

export function DepositCalculator() {
  const [amount, setAmount] = useState(50000);
  const result = calcDeposit(amount);

  const fmt = n => '$' + Number(n).toLocaleString('en-US');

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ДЕПОЗИТ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 28 }}>Калькулятор депозита</h1>

      {/* Calculator */}
      <div className="card" style={{ marginBottom: 24, padding: '28px 32px' }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Сумма тендера (USD)</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
              style={{
                flex: 1, padding: '12px 16px', background: 'var(--navy-3)',
                border: '1px solid var(--border-2)', borderRadius: 8,
                color: 'var(--text)', fontSize: 18, fontWeight: 600,
              }}
            />
            <span style={{ color: 'var(--text-2)', fontSize: 16 }}>USD</span>
          </div>
          <input type="range" min={1000} max={2000000} step={1000} value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            style={{ width: '100%', marginTop: 12, accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
            <span>$1,000</span><span>$2,000,000</span>
          </div>
        </div>

        <div className="divider" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Ставка депозита</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{result.rate}%</div>
          </div>
          <div style={{ background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Депозит с каждой стороны</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{fmt(result.deposit)}</div>
          </div>
          <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Итого заморожено</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{fmt(result.deposit * 2)}</div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)' }}>
          ◎ ИИ рассчитал ставку {result.rate}% методом линейной интерполяции внутри диапазона. Депозит удерживается на счёте платформы до завершения сделки.
        </div>
      </div>

      {/* Rate table */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Шкала депозитных ставок</div>
        {depositRates.map((r, i) => {
          const isActive = amount >= r.min && (r.max === Infinity ? true : amount < r.max) ||
            (amount === 10000 && i === 0) || (amount === 50000 && i === 1) || (amount === 1000000 && i === 2);
          const active = (() => {
            if (amount <= 10000 && i === 0) return true;
            if (amount > 10000 && amount <= 50000 && i === 1) return true;
            if (amount > 50000 && amount <= 1000000 && i === 2) return true;
            if (amount > 1000000 && i === 3) return true;
            return false;
          })();
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
              borderRadius: 8, marginBottom: 6,
              background: active ? 'rgba(0,212,170,0.06)' : 'transparent',
              border: `1px solid ${active ? 'rgba(0,212,170,0.25)' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontWeight: active ? 600 : 400 }}>{r.range}</div>
              <div style={{ color: r.color, fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16 }}>
                {r.rateMin === r.rateMax ? `${r.rateMin}%` : `${r.rateMin}% – ${r.rateMax}%`}
              </div>
              {active && <span className="badge badge-green" style={{ fontSize: 11 }}>Ваш диапазон</span>}
            </div>
          );
        })}
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)', padding: '0 4px' }}>
          * На границах диапазонов: $10 000 = 15%, $50 000 = 10%, $1 000 000 = 5%
        </div>
      </div>
    </div>
  );
}

export function TrustRating() {
  const score = currentUser.trustScore;
  const color = score >= 70 ? 'var(--accent)' : score >= 30 ? 'var(--gold)' : 'var(--red)';
  const zone = score >= 70 ? 'Зелёная зона' : score >= 30 ? 'Жёлтая зона' : 'Красная зона';

  const history = [
    { date: '2025-07', total: 5, success: 5, score: 100 },
    { date: '2025-06', total: 6, success: 5, score: 83 },
    { date: '2025-05', total: 4, success: 3, score: 75 },
    { date: '2025-04', total: 5, success: 4, score: 80 },
    { date: '2025-03', total: 3, success: 3, score: 100 },
  ];

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>РЕЙТИНГ ДОВЕРИЯ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 28 }}>Trust Score</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Score card */}
        <div className="card" style={{ padding: '28px 32px', borderColor: `${color}33` }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>{currentUser.name}</div>
          <div style={{ fontSize: 64, fontWeight: 700, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>
            {score}<span style={{ fontSize: 28 }}>%</span>
          </div>
          <div style={{ marginTop: 12, marginBottom: 16 }}>
            <span style={{ color, fontWeight: 600, fontSize: 14 }}>{zone}</span>
          </div>
          <div style={{ height: 8, background: 'var(--navy-3)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 4, transition: 'width 0.8s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
            <span>30% — минимум</span><span>100%</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Всего сделок', value: currentUser.totalDeals, color: 'var(--text)' },
            { label: 'Успешных', value: currentUser.successDeals, color: 'var(--accent)' },
            { label: 'Отменено', value: currentUser.totalDeals - currentUser.successDeals, color: 'var(--red)' },
            { label: 'Формула', value: `${currentUser.successDeals} ÷ ${currentUser.totalDeals} × 100`, color: 'var(--gold)' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Zones */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)' }}>Уровни рейтинга</div>
        {[
          { range: '70% – 100%', label: 'Зелёная зона', color: 'var(--accent)', desc: 'Стандартные условия. Нет ограничений.' },
          { range: '30% – 69%', label: 'Жёлтая зона', color: 'var(--gold)', desc: 'Предупреждение. Депозит +5%. Лимит на кол-во тендеров.' },
          { range: 'Ниже 30%', label: 'Красная зона', color: 'var(--red)', desc: 'Предоплата 100%. Финансовый лимит аккаунта. Жёсткие ограничения.' },
        ].map((z, i) => (
          <div key={i} style={{
            display: 'flex', gap: 14, alignItems: 'center', padding: '12px 14px',
            borderRadius: 8, marginBottom: 6,
            background: z.color === color ? 'rgba(0,212,170,0.05)' : 'transparent',
            border: `1px solid ${z.color === color ? z.color + '33' : 'transparent'}`,
          }}>
            <div style={{ width: 4, height: 40, borderRadius: 2, background: z.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: z.color }}>{z.range}</span>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>— {z.label}</span>
                {z.color === color && <span className="badge badge-green" style={{ fontSize: 10 }}>Ваш уровень</span>}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{z.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)' }}>История по месяцам</div>
        {history.map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 60, fontSize: 12, color: 'var(--text-2)' }}>{h.date}</div>
            <div style={{ flex: 1, height: 6, background: 'var(--navy-3)', borderRadius: 3 }}>
              <div style={{ height: '100%', width: `${h.score}%`, background: h.score >= 70 ? 'var(--accent)' : 'var(--gold)', borderRadius: 3 }} />
            </div>
            <div style={{ width: 80, textAlign: 'right', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{h.score}%</span>
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}> ({h.success}/{h.total})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
