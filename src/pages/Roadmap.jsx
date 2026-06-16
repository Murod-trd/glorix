const roadmap = [
  {
    phase: 'Демо', status: 'current', color: 'var(--accent)', period: 'Сейчас',
    items: ['Тендерный цикл (5 дедлайнов)', 'Маркетплейс с фото и спецификациями', 'ИИ-анализ TCO + Incoterms', 'Система депозитов и рейтинга доверия', 'RFI модуль (CIPS стандарт)', 'Supplier Scorecard 10C + ESG', 'Anti-Fraud проверка', 'ИИ-боты симуляция сделок', 'Анонимный форум участников'],
  },
  {
    phase: 'MVP', status: 'next', color: '#63B3ED', period: 'Q3 2025 — 6 месяцев',
    items: ['Реальная авторизация (JWT)', 'База данных PostgreSQL', 'API backend (Node.js)', 'Верификация через госреестры (реальная)', 'Интеграция с Payme / Kaspi (Escrow)', 'Email и Telegram уведомления', 'Мобильная версия (PWA)', 'Первые 10 реальных компаний'],
  },
  {
    phase: 'Бета', status: 'planned', color: 'var(--gold)', period: 'Q4 2025 — 3 месяца',
    items: ['Реальный ИИ (OpenAI / Claude API)', 'Санкционный фильтр (реальные базы)', 'Трекинг доставки (API перевозчиков)', 'Контрактный конструктор', 'KYC / AML верификация', '50+ верифицированных компаний', 'Первая монетизация (комиссия)'],
  },
  {
    phase: 'Production', status: 'planned', color: 'var(--text-2)', period: '2026',
    items: ['Глобальный выход (за пределы СНГ)', 'Собственный Escrow (лицензия)', 'Интеграция с 1С и ERP системами', 'Мобильное приложение (iOS / Android)', 'Аналитика для закупщиков', 'SRM платформа (управление отношениями)', 'API для корпоративных клиентов', '500+ компаний'],
  },
];

const competitors = [
  { name: 'go4WorldBusiness', strength: 'Большая база, 30 лет', weakness: 'Устаревший UI, нет ИИ, нет TCO-анализа, нет СНГ-фокуса', glorix: '✓ ИИ-анализ, ✓ СНГ, ✓ Escrow, ✓ CIPS' },
  { name: 'Alibaba B2B', strength: 'Глобальный охват, огромная база', weakness: 'Нет тендеров, нет анонимности, много мошенников', glorix: '✓ Тендеры, ✓ Анонимность, ✓ Верификация' },
  { name: 'Uzum Business', strength: 'Локальный лидер UZ', weakness: 'Только UZ, нет тендеров, нет B2B специфики', glorix: '✓ СНГ регион, ✓ Тендеры, ✓ Incoterms' },
  { name: 'TenderPro / Zakupki', strength: 'Гос. тендеры RU', weakness: 'Только госзакупки, нет маркетплейса, нет ИИ', glorix: '✓ Частный сектор, ✓ Маркетплейс, ✓ ИИ' },
];

const metrics = [
  { label: 'Объём B2B e-commerce СНГ (2026)', value: '$2.1T', color: 'var(--accent)' },
  { label: 'Компаний в СНГ занимаются экспортом', value: '180,000+', color: '#63B3ED' },
  { label: 'Средняя комиссия конкурентов', value: '3–5%', color: 'var(--gold)' },
  { label: 'Наша комиссия (маркетплейс)', value: '0.5–1.5%', color: 'var(--accent)' },
];

export default function Roadmap() {
  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>СТРАТЕГИЯ</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Roadmap и позиционирование</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32 }}>Для инвесторов, партнёров и команды</div>

      {/* Positioning */}
      <div className="card" style={{ marginBottom: 28, padding: '24px 28px', borderColor: 'rgba(0,212,170,0.3)', background: 'rgba(0,212,170,0.04)' }}>
        <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', marginBottom: 12, color: 'var(--accent)' }}>
          GLORIX — единственная B2B платформа для СНГ с прозрачными тендерами, ИИ-анализом реальной стоимости сделки и полным CIPS-совместимым закупочным циклом.
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.8 }}>
          Мы решаем три главные боли B2B торговли в СНГ: <strong style={{ color: 'var(--text)' }}>коррупция в тендерах</strong> (анонимность), <strong style={{ color: 'var(--text)' }}>скрытые расходы</strong> (ИИ-анализ TCO + Incoterms), <strong style={{ color: 'var(--text)' }}>мошенничество</strong> (верификация + Escrow).
        </div>
      </div>

      {/* Market metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {metrics.map((m, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '18px 14px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: 'var(--font-display)', marginBottom: 6 }}>{m.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16 }}>Roadmap развития</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {roadmap.map((phase, i) => (
          <div key={i} className="card" style={{ borderColor: phase.status === 'current' ? phase.color : 'var(--border)', background: phase.status === 'current' ? `${phase.color}08` : 'var(--card)', padding: '18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: phase.color, fontSize: 15 }}>{phase.phase}</div>
              {phase.status === 'current' && <span className="badge badge-green" style={{ fontSize: 10 }}>Сейчас</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>{phase.period}</div>
            {phase.items.map((item, j) => (
              <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 5, fontSize: 12, color: 'var(--text-2)' }}>
                <span style={{ color: phase.color, flexShrink: 0 }}>{phase.status === 'current' ? '✓' : '○'}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Competitors */}
      <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16 }}>Конкурентный анализ</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 2fr 2fr', background: 'var(--navy-3)', padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: 0.5 }}>
          <div>Конкурент</div><div>Сильные стороны</div><div>Слабые стороны</div><div style={{ color: 'var(--accent)' }}>GLORIX решает</div>
        </div>
        {competitors.map((c, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 2fr 2fr', padding: '14px 20px', borderBottom: i < competitors.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{c.name}</div>
            <div style={{ color: 'var(--text-2)' }}>{c.strength}</div>
            <div style={{ color: 'var(--red)', fontSize: 12 }}>{c.weakness}</div>
            <div style={{ color: 'var(--accent)', fontSize: 12 }}>{c.glorix}</div>
          </div>
        ))}
      </div>

      {/* Partners */}
      <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 16, marginTop: 32 }}>Целевые партнёры</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { icon: '🏦', title: 'Банки СНГ', examples: 'Payme, Click, Kaspi, Тинькофф', role: 'Escrow и платёжная инфраструктура' },
          { icon: '📦', title: 'Логистика', examples: 'FESCO, Globaltruck, Deliver', role: 'Трекинг и интеграция накладных' },
          { icon: '🏛️', title: 'Торговые палаты', examples: 'ТПП УЗ, НПП РК, ТПП РФ', role: 'Верификация компаний и арбитраж' },
          { icon: '🤝', title: 'Таможенные брокеры', examples: 'GTL, AsstrA, Meridian', role: 'Оформление и compliance' },
          { icon: '📊', title: 'ERP системы', examples: '1С, SAP, Oracle', role: 'Интеграция закупочных процессов' },
          { icon: '🏫', title: 'Бизнес-ассоциации', examples: 'UzCCI, KAZENERGY, РСПП', role: 'Привлечение первых клиентов' },
        ].map((p, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>{p.examples}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
