import { NavLink, useNavigate } from 'react-router-dom';
import { useAccountType } from '../context/AccountContext';

const configs = {
  buyer: {
    color: '#63B3ED', icon: '🛒', label: 'Покупатель',
    name: 'Tashkent Agro LLC', flag: '🇺🇿', score: 87,
    nav: [
      { to: '/', icon: '⬡', label: 'Дашборд' },
      { divider: 'ЗАКУПКИ' },
      { to: '/marketplace', icon: '◈', label: 'Маркетплейс' },
      { to: '/tenders', icon: '◇', label: 'Тендеры' },
      { to: '/create', icon: '+', label: 'Создать тендер' },
      { divider: 'CIPS' },
      { to: '/rfi', icon: '?', label: 'RFI', badge: 'CIPS' },
      { to: '/suppliers', icon: '◉', label: 'Scorecard', badge: 'CIPS' },
      { divider: 'АНАЛИТИКА' },
      { to: '/analytics', icon: '📊', label: 'Аналитика закупок' },
      { to: '/ai-analysis', icon: '◎', label: 'ИИ-анализ оферт' },
      { to: '/ai-bots', icon: '🤖', label: 'ИИ-симуляция' },
      { divider: 'ФИНАНСЫ' },
      { to: '/deposit', icon: '○', label: 'Депозит' },
      { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
    ],
  },
  seller: {
    color: '#00D4AA', icon: '🏭', label: 'Продавец',
    name: 'FerganaTex Export', flag: '🇺🇿', score: 91,
    nav: [
      { to: '/', icon: '⬡', label: 'Дашборд' },
      { divider: 'МОИ ПРОДАЖИ' },
      { to: '/marketplace', icon: '◈', label: 'Мои товары' },
      { to: '/tenders', icon: '◇', label: 'Открытые тендеры' },
      { to: '/documents', icon: '📄', label: 'Document Center', badge: 'NEW' },
      { to: '/accounts', icon: '✅', label: 'Мои лицензии' },
      { divider: 'АНАЛИТИКА' },
      { to: '/analytics', icon: '📊', label: 'Аналитика продаж' },
      { to: '/suppliers', icon: '◉', label: 'Мой профиль' },
      { divider: 'ФИНАНСЫ' },
      { to: '/deposit', icon: '○', label: 'Депозит' },
      { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
    ],
  },
  both: {
    color: '#F5A623', icon: '🔄', label: 'Покуп. + Продавец',
    name: 'BekabadMetal Group', flag: '🇺🇿', score: 96,
    nav: [
      { to: '/', icon: '⬡', label: 'Дашборд' },
      { divider: 'ТОРГОВЛЯ' },
      { to: '/marketplace', icon: '◈', label: 'Маркетплейс' },
      { to: '/tenders', icon: '◇', label: 'Тендеры' },
      { to: '/create', icon: '+', label: 'Создать тендер' },
      { to: '/documents', icon: '📄', label: 'Document Center', badge: 'NEW' },
      { divider: 'CIPS' },
      { to: '/rfi', icon: '?', label: 'RFI', badge: 'CIPS' },
      { to: '/suppliers', icon: '◉', label: 'Scorecard', badge: 'CIPS' },
      { divider: 'АНАЛИТИКА' },
      { to: '/analytics', icon: '📊', label: 'Аналитика' },
      { to: '/ai-analysis', icon: '◎', label: 'ИИ-анализ' },
      { to: '/ai-bots', icon: '🤖', label: 'ИИ-симуляция' },
      { divider: 'ФИНАНСЫ' },
      { to: '/deposit', icon: '○', label: 'Депозит' },
      { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
      { to: '/accounts', icon: '✅', label: 'Лицензии' },
    ],
  },
};

const commonNav = [
  { divider: 'СЕРВИС' },
  { to: '/manager', icon: '👤', label: 'Мой менеджер', badge: 'NEW' },
  { divider: 'ПЛАТФОРМА' },
  { to: '/roadmap', icon: '🗺', label: 'Roadmap' },
  { to: '/legal-ai', icon: '⚖', label: 'Правовой ИИ', badge: 'NEW' },
  { to: '/legal', icon: '📜', label: 'Правовая база' },
  { to: '/support', icon: '❓', label: 'Поддержка' },
  { to: '/profile', icon: '◍', label: 'Профиль' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { accountType: type } = useAccountType();
  const cfg = configs[type] || configs.buyer;
  const score = cfg.score;
  const trustColor = score >= 70 ? '#00D4AA' : score >= 30 ? '#F5A623' : '#FF4D4D';
  const nav = [...cfg.nav, ...commonNav];

  return (
    <aside style={{ width: 220, height: '100vh', background: '#0D1424', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100, overflow: 'hidden' }}>

      {/* Logo */}
      <div style={{ padding: '16px 20px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>
          GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1, letterSpacing: 1 }}>B2B TRADE PLATFORM · CIS</div>
      </div>

      {/* Account badge */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: `${cfg.color}18`, border: `1px solid ${cfg.color}55`, borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: cfg.color, fontWeight: 700 }}>{cfg.icon} {cfg.label}</span>
          <button onClick={() => navigate('/account-select')} style={{ background: 'none', color: cfg.color, fontSize: 10, cursor: 'pointer', opacity: 0.75, textDecoration: 'underline' }}>сменить</button>
        </div>
      </div>

      {/* Demo */}
      <div style={{ padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>⚠ ДЕМО</span>
          <button onClick={() => navigate('/roadmap')} style={{ background: 'none', color: 'var(--gold)', fontSize: 9, cursor: 'pointer', textDecoration: 'underline' }}>Roadmap</button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 10px', overflowY: 'auto' }}>
        {nav.map((item, i) => {
          if (item.divider) return (
            <div key={i} style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1.5, padding: '9px 10px 3px' }}>{item.divider}</div>
          );
          return (
            <NavLink key={`${item.to}-${i}`} to={item.to} end={item.to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, marginBottom: 1,
              fontSize: 13, fontWeight: isActive ? 500 : 400,
              color: isActive ? cfg.color : 'var(--text-2)',
              background: isActive ? `${cfg.color}15` : 'transparent',
              transition: 'all 0.15s', textDecoration: 'none',
            })}>
              <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                  background: item.badge==='NEW'?'rgba(245,166,35,0.2)':item.badge==='CIPS'?'rgba(99,179,237,0.15)':'rgba(0,212,170,0.15)',
                  color: item.badge==='NEW'?'var(--gold)':item.badge==='CIPS'?'#63B3ED':'var(--accent)',
                }}>{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate('/profile')}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${cfg.color}20`, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cfg.flag}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{cfg.name}</div>
            <div style={{ fontSize: 10, color: cfg.color }}>{cfg.icon} {cfg.label}</div>
          </div>
        </div>
        <div style={{ background: 'var(--navy-3)', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-2)', marginBottom: 4 }}>
            <span>Trust Score</span>
            <span style={{ color: trustColor, fontWeight: 700 }}>{score}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--navy)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${score}%`, background: trustColor, borderRadius: 2 }} />
          </div>
        </div>
        <button onClick={() => navigate('/account-select')} style={{ width: '100%', padding: '7px', background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: 7, color: cfg.color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          ⇄ Сменить аккаунт
        </button>
      </div>
    </aside>
  );
}
