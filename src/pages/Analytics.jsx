import { useState } from 'react';

const monthlyData = [
  { month: 'Янв', spend: 48000, deals: 3, saved: 4200 },
  { month: 'Фев', spend: 62000, deals: 4, saved: 5800 },
  { month: 'Мар', spend: 31000, deals: 2, saved: 2100 },
  { month: 'Апр', spend: 89000, deals: 6, saved: 9400 },
  { month: 'Май', spend: 74000, deals: 5, saved: 7200 },
  { month: 'Июн', spend: 95000, deals: 7, saved: 11000 },
  { month: 'Июл', spend: 112000, deals: 8, saved: 13500 },
];

const categorySpend = [
  { cat: 'Агро / Зерновые', amount: 185000, pct: 38, color: '#00D4AA' },
  { cat: 'Стройматериалы', amount: 124000, pct: 26, color: '#63B3ED' },
  { cat: 'Оборудование', amount: 98000, pct: 20, color: '#F5A623' },
  { cat: 'Текстиль', amount: 62000, pct: 13, color: '#B794F4' },
  { cat: 'Другое', amount: 14000, pct: 3, color: '#4A5568' },
];

const topSuppliers = [
  { name: 'AgroTrade KZ', country: '🇰🇿', deals: 8, volume: 185000, avgScore: 94, onTime: 96 },
  { name: 'BekabadMetal', country: '🇺🇿', deals: 5, volume: 98000, avgScore: 96, onTime: 98 },
  { name: 'UzBuild LLC', country: '🇺🇿', deals: 4, volume: 124000, avgScore: 91, onTime: 94 },
];

const alerts = [
  { type: 'price', icon: '📉', text: 'Цена на пшеницу 3-го класса упала на 8% за последние 2 недели', action: 'Создать тендер', color: 'var(--accent)' },
  { type: 'supplier', icon: '⭐', text: 'AgroTrade KZ добавил новую позицию: ячмень 2-го класса', action: 'Посмотреть', color: '#63B3ED' },
  { type: 'tender', icon: '⏰', text: 'Тендер «Холодильное оборудование» закрывается через 3 дня', action: 'Перейти', color: 'var(--gold)' },
];

const maxSpend = Math.max(...monthlyData.map(d => d.spend));

export default function Analytics() {
  const [period, setPeriod] = useState('7m');

  const totalSpend = monthlyData.reduce((s, d) => s + d.spend, 0);
  const totalSaved = monthlyData.reduce((s, d) => s + d.saved, 0);
  const totalDeals = monthlyData.reduce((s, d) => s + d.deals, 0);
  const avgDeal = Math.round(totalSpend / totalDeals);

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>АНАЛИТИКА ЗАКУПОК</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Дашборд закупок</h1>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Tashkent Agro LLC · 2025 год</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['7m','7 мес'], ['3m','3 мес'], ['1m','1 мес']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none', background: period===v?'var(--accent)':'var(--card)', color: period===v?'var(--navy)':'var(--text-2)', border: `1px solid ${period===v?'var(--accent)':'var(--border)'}` }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {alerts.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>{a.text}</span>
            <button style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none', background: `${a.color}22`, color: a.color, fontWeight: 600 }}>{a.action} →</button>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          ['Общий объём закупок', `$${(totalSpend/1000).toFixed(0)}K`, 'var(--accent)', '+23% vs прошлый год'],
          ['Сэкономлено через ИИ-анализ', `$${(totalSaved/1000).toFixed(0)}K`, '#63B3ED', 'TCO оптимизация'],
          ['Закрытых сделок', totalDeals, 'var(--gold)', 'Успешных 100%'],
          ['Средний чек', `$${(avgDeal/1000).toFixed(0)}K`, 'var(--text)', 'на сделку'],
        ].map(([l, v, c, sub]) => (
          <div key={l} className="card" style={{ textAlign: 'center', padding: '18px 14px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: c, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{v}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 20 }}>
        {/* Spend chart */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Динамика закупок по месяцам</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
            {monthlyData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>${(d.spend/1000).toFixed(0)}K</div>
                <div style={{ width: '100%', background: 'var(--accent)', borderRadius: '4px 4px 0 0', height: `${(d.spend/maxSpend)*120}px`, transition: 'height 0.5s', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(d.saved/d.spend)*100}%`, background: '#63B3ED', borderRadius: '4px 4px 0 0', opacity: 0.6 }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.month}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-3)' }}>
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ width: 10, height: 10, background: 'var(--accent)', borderRadius: 2, display: 'inline-block' }} />Закупки</span>
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ width: 10, height: 10, background: '#63B3ED', borderRadius: 2, display: 'inline-block' }} />Экономия ИИ</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>По категориям</div>
          {categorySpend.map((c, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-2)' }}>{c.cat}</span>
                <span style={{ fontWeight: 600 }}>{c.pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--navy-3)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>${(c.amount/1000).toFixed(0)}K</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top suppliers */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Топ поставщики</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {topSuppliers.map((s, i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'var(--navy-3)', borderRadius: 10, border: i===0 ? '1px solid rgba(0,212,170,0.3)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{s.country}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                  {i===0 && <span className="badge badge-green" style={{ fontSize: 9 }}>★ Лучший</span>}
                </div>
              </div>
              {[['Объём', `$${(s.volume/1000).toFixed(0)}K`], ['Сделок', s.deals], ['Score', `${s.avgScore}%`], ['В срок', `${s.onTime}%`]].map(([l,v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-3)' }}>{l}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '6px', marginTop: 8 }}>Повторить заказ ↺</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
