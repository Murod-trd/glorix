import { NavLink } from 'react-router-dom';
import { currentUser } from '../data/mock';

const nav = [
  { to: '/', icon: '⬡', label: 'Дашборд' },
  { to: '/marketplace', icon: '◈', label: 'Маркетплейс', divider: false },
  { to: '/tenders', icon: '◇', label: 'Тендеры' },
  { to: '/create', icon: '+', label: 'Создать тендер' },
  { to: '/rfi', icon: '?', label: 'RFI', badge: 'CIPS' },
  { to: '/suppliers', icon: '◉', label: 'Scorecard', badge: 'CIPS' },
  { to: '/ai-analysis', icon: '◎', label: 'ИИ-анализ' },
  { to: '/deposit', icon: '○', label: 'Депозит' },
  { to: '/trust', icon: '◌', label: 'Рейтинг доверия' },
  { to: '/profile', icon: '◍', label: 'Профиль' },
];

export default function Sidebar() {
  const score = currentUser.trustScore;
  const color = score >= 70 ? '#00D4AA' : score >= 30 ? '#F5A623' : '#FF4D4D';

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#0D1424',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100,
    }}>
      <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: 3, color: '#fff' }}>
          GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, letterSpacing: 1 }}>B2B TRADE PLATFORM · CIS</div>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', background: 'var(--navy-3)', borderRadius: 8, padding: 3 }}>
          <NavLink to="/marketplace" style={({ isActive }) => ({
            flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: isActive ? 'var(--accent)' : 'transparent',
            color: isActive ? 'var(--navy)' : 'var(--text-2)',
            textDecoration: 'none', transition: 'all 0.15s',
          })}>МАРКЕТ</NavLink>
          <NavLink to="/tenders" end style={({ isActive }) => ({
            flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: isActive ? 'rgba(245,166,35,0.2)' : 'transparent',
            color: isActive ? 'var(--gold)' : 'var(--text-2)',
            textDecoration: 'none', transition: 'all 0.15s',
          })}>ТЕНДЕР</NavLink>
          <NavLink to="/rfi" style={({ isActive }) => ({
            flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: isActive ? 'rgba(99,179,237,0.2)' : 'transparent',
            color: isActive ? '#63B3ED' : 'var(--text-2)',
            textDecoration: 'none', transition: 'all 0.15s',
          })}>RFI</NavLink>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 8, marginBottom: 1,
            fontSize: 13, fontWeight: isActive ? 500 : 400,
            color: isActive ? 'var(--accent)' : 'var(--text-2)',
            background: isActive ? 'rgba(0,212,170,0.08)' : 'transparent',
            transition: 'all 0.15s', textDecoration: 'none',
          })}>
            <span style={{ fontSize: 13, width: 16, textAlign: 'center', opacity: 0.8 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,179,237,0.15)', color: '#63B3ED', fontWeight: 700 }}>{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{currentUser.flag}</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>{currentUser.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)' }}>{currentUser.country} · Покупатель</div>
          </div>
        </div>
        <div style={{ background: 'var(--navy-3)', borderRadius: 6, padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-2)', marginBottom: 4 }}>
            <span>Trust Score</span><span style={{ color, fontWeight: 700 }}>{score}%</span>
          </div>
          <div style={{ height: 3, background: 'var(--navy)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
