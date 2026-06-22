import { useNavigate } from 'react-router-dom';
import { useAccountType } from '../context/AccountContext';
import { users } from '../data/mock';

const accounts = [
  {
    id: 'buyer',
    icon: '🛒',
    title: 'Покупатель',
    color: '#63B3ED',
    bg: 'rgba(99,179,237,0.08)',
    border: 'rgba(99,179,237,0.4)',
    desc: 'Закупаю товары оптом, создаю тендеры',
    can: ['Создание тендеров', 'Покупка в маркетплейсе', 'RFI запросы', 'Аналитика закупок'],
    cannot: ['Продажа товаров', 'Подача оферт продавца'],
    docs: ['Свидетельство о регистрации ✓', 'Налоговый учёт ✓'],
    verify: 'Базовая · ~2 мин',
  },
  {
    id: 'seller',
    icon: '🏭',
    title: 'Продавец',
    color: '#00D4AA',
    bg: 'rgba(0,212,170,0.08)',
    border: 'rgba(0,212,170,0.4)',
    desc: 'Продаю товары, закупаю сырьё и комплектующие, участвую в тендерах как поставщик',
    can: ['Продажа в маркетплейсе', 'Покупка в маркетплейсе', 'Участие в тендерах', 'Document Center', 'Аналитика продаж'],
    cannot: ['Создание тендеров'],
    docs: ['Свидетельство о регистрации ✓', 'Налоговый учёт ✓', 'Лицензия на торговлю ✓', 'Сертификат происхождения CT-1 ✓'],
    verify: 'Расширенная · ~24ч',
  },
  {
    id: 'both',
    icon: '🔄',
    title: 'Покупатель + Продавец',
    color: '#F5A623',
    bg: 'rgba(245,166,35,0.08)',
    border: 'rgba(245,166,35,0.4)',
    desc: 'Использую все функции — покупаю и продаю',
    can: ['Все функции покупателя', 'Все функции продавца', 'Document Center', 'Сводная аналитика'],
    cannot: [],
    docs: ['Свидетельство о регистрации ✓', 'Налоговый учёт ✓', 'Лицензия на торговлю ✓', 'Сертификат происхождения CT-1 ✓'],
    verify: 'Полная · ~24ч',
    recommended: true,
  },
];

export default function AccountSelect() {
  const navigate = useNavigate();
  const { setAccountType } = useAccountType();

  const login = (id) => {
    setAccountType(id);
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
      
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: 4, marginBottom: 8 }}>
          GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>Выберите аккаунт для входа</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Демо-режим · Три отдельных аккаунта</div>
      </div>

      {/* Account cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 320px)', gap: 20, maxWidth: 1020 }}>
        {accounts.map(a => (
          <div key={a.id} style={{
            background: a.bg, border: `2px solid ${a.border}`,
            borderRadius: 16, padding: '28px 24px', position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 48px ${a.border}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>

            {a.recommended && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', background: a.color, borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                ★ Рекомендуем
              </div>
            )}

            {/* Avatar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${a.color}20`, border: `2px solid ${a.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                {a.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: a.color }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{users[a.id]?.flag} {users[a.id]?.name}</div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 18, lineHeight: 1.6 }}>{a.desc}</div>

            {/* Can do */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>МОЖЕТ</div>
              {a.can.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>
                  <span style={{ color: a.color, fontWeight: 700 }}>✓</span>{f}
                </div>
              ))}
            </div>

            {/* Cannot */}
            {a.cannot.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>НЕ МОЖЕТ</div>
                {a.cannot.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-3)', marginBottom: 5 }}>
                    <span style={{ color: 'var(--red)' }}>✗</span>{f}
                  </div>
                ))}
              </div>
            )}

            {/* Docs */}
            <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ВЕРИФИКАЦИЯ · {a.verify}</div>
              {a.docs.map((d, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, display: 'flex', gap: 6 }}>
                  <span style={{ color: '#00D4AA' }}>✓</span>{d}
                </div>
              ))}
            </div>

            {/* Login button */}
            <button onClick={() => login(a.id)} style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: a.color, color: 'var(--navy)', fontSize: 14, fontWeight: 700,
              fontFamily: 'var(--font-display)', transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Войти как {a.title}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
        Это демо-версия GLORIX · Три аккаунта симулируют разные типы пользователей
      </div>
    </div>
  );
}
