import { NavLink, useNavigate } from 'react-router-dom';
import { currentUser } from '../data/mock';

const buyerNav = [
  { to: '/', icon: '⬡', label: 'Дашборд' },
  { divider: 'ЗАКУПКИ' },
  { to: '/marketplace', icon: '◈', label: 'Маркетплейс' },
  { to: '/tenders', icon: '◇', label: 'Тендеры' },
  { to: '/create', icon: '+', label: 'Создать тендер' },
  { divider: 'CIPS СТАНДАРТ' },
  { to: '/rfi', icon: '?', label: 'RFI', badge: 'CIPS' },
  { to: '/suppliers', icon: '◉', label: 'Scorecard', badge: 'CIPS' },
  { divider: 'ИИ И АНАЛИТИКА' },
  { to: '/analytics', icon: '📊', label: 'Аналитика закупок' },
  { to: '/ai-analysis', icon: '◎', label: 'ИИ-анализ оферт' },
  { to: '/ai-bots', icon: '🤖', label: 'ИИ-симуляция' },
  { divider: 'ФИНАНСЫ' },
  { to: '/deposit', icon: '○', label: 'Депозит' },
  { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
];

const sellerNav = [
  { to: '/', icon: '⬡', label: 'Дашборд' },
  { divider: 'ПРОДАЖИ' },
  { to: '/marketplace', icon: '◈', label: 'Мои товары' },
  { to: '/tenders', icon: '◇', label: 'Открытые тендеры' },
  { to: '/documents', icon: '📄', label: 'Document Center', badge: 'NEW' },
  { to: '/accounts', icon: '✅', label: 'Мои лицензии' },
  { divider: 'АНАЛИТИКА' },
  { to: '/analytics', icon: '📊', label: 'Аналитика продаж' },
  { to: '/suppliers', icon: '◉', label: 'Мой профиль', badge: 'CIPS' },
  { divider: 'ФИНАНСЫ' },
  { to: '/deposit', icon: '○', label: 'Депозит' },
  { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
];

const bothNav = [
  { to: '/', icon: '⬡', label: 'Дашборд' },
  { divider: 'ТОРГОВЛЯ' },
  { to: '/marketplace', icon: '◈', label: 'Маркетплейс' },
  { to: '/tenders', icon: '◇', label: 'Тендеры' },
  { to: '/create', icon: '+', label: 'Создать тендер' },
  { to: '/documents', icon: '📄', label: 'Document Center', badge: 'NEW' },
  { divider: 'CIPS СТАНДАРТ' },
  { to: '/rfi', icon: '?', label: 'RFI', badge: 'CIPS' },
  { to: '/suppliers', icon: '◉', label: 'Scorecard', badge: 'CIPS' },
  { divider: 'ИИ И АНАЛИТИКА' },
  { to: '/analytics', icon: '📊', label: 'Аналитика' },
  { to: '/ai-analysis', icon: '◎', label: 'ИИ-анализ оферт' },
  { to: '/ai-bots', icon: '🤖', label: 'ИИ-симуляция' },
  { divider: 'ФИНАНСЫ' },
  { to: '/deposit', icon: '○', label: 'Депозит' },
  { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
  { to: '/accounts', icon: '✅', label: 'Лицензии' },
];

const commonNav = [
  { divider: 'СЕРВИС' },
  { to: '/manager', icon: '👤', label: 'Мой менеджер', badge: 'NEW' },
  { divider: 'ПЛАТФОРМА' },
  { to: '/roadmap', icon: '🗺', label: 'Roadmap' },
  { to: '/legal', icon: '⚖', label: 'Правовая база' },
  { to: '/support', icon: '❓', label: 'Поддержка' },
  { to: '/profile', icon: '◍', label: 'Профиль' },
];

const accountConfig = {
  buyer:  { icon: '🛒', label: 'Покупатель', color: '#63B3ED', nav: buyerNav },
  seller: { icon: '🏭', label: 'Продавец',   color: '#00D4AA', nav: sellerNav },
  both:   { icon: '🔄', label: 'Покупатель + Продавец', color: '#F5A623', nav: bothNav },
};

export default function Sidebar() {
  const navigate = useNavigate();
  const score = currentUser.trustScore;
  const trustColor = score >= 70 ? '#00D4AA' : score >= 30 ? '#F5A623' : '#FF4D4D';

  const saved = localStorage.getItem('glorix_account_type') || 'buyer';
  const acct = accountConfig[saved] || accountConfig.buyer;
  const nav = [...acct.nav, ...commonNav];

  return (
    <aside style={{ width: 220, minHeight: '100vh', background: '#0D1424', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, zIndex: 100 }}>

      {/* Logo */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>
          GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, letterSpacing: 1 }}>B2B TRADE PLATFORM · CIS</div>
      </div>

      {/* Account type badge */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: `${acct.color}18`, border: `1px solid ${acct.color}44`, borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: acct.color, fontWeight: 600 }}>{acct.icon} {acct.label}</span>
          <button onClick={() => navigate('/account-select')} style={{ background: 'none', color: acct.color, fontSize: 10, cursor: 'pointer', opacity: 0.7 }}>сменить</button>
        </div>
      </div>

      {/* Demo badge */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>⚠ ДЕМО</span>
          <button onClick={() => navigate('/roadmap')} style={{ background: 'none', color: 'var(--gold)', fontSize: 9, cursor: 'pointer', textDecoration: 'underline' }}>Roadmap</button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {nav.map((item, i) => {
          if (item.divider) return (
            <div key={i} style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1.5, padding: '10px 10px 3px' }}>{item.divider}</div>
          );
          return (
            <NavLink key={item.to + i} to={item.to} end={item.to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 8, marginBottom: 1,
              fontSize: 13, fontWeight: isActive ? 500 : 400,
              color: isActive ? acct.color : 'var(--text-2)',
              background: isActive ? `${acct.color}14` : 'transparent',
              transition: 'all 0.15s', textDecoration: 'none',
            })}>
              <span style={{ fontSize: 13, width: 16, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: item.badge==='NEW'?'rgba(245,166,35,0.2)':'rgba(99,179,237,0.15)', color: item.badge==='NEW'?'var(--gold)':'#63B3ED', fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User card */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate('/profile')}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${acct.color}20`, border: `1px solid ${acct.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
            {currentUser.flag}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{currentUser.name}</div>
            <div style={{ fontSize: 10, color: acct.color }}>{acct.icon} {acct.label}</div>
          </div>
        </div>
        <div style={{ background: 'var(--navy-3)', borderRadius: 6, padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-2)', marginBottom: 4 }}>
            <span>Trust Score</span>
            <span style={{ color: trustColor, fontWeight: 700 }}>{score}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--navy)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${score}%`, background: trustColor, borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
