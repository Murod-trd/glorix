import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    id: 1, icon: '🏢', title: 'Верификация компании',
    desc: 'ИИ проверяет вашу компанию через госреестр за 2 минуты',
    fields: [
      { label: 'Страна регистрации', type: 'select', options: ['Узбекистан', 'Казахстан', 'Россия', 'Азербайджан', 'Другая страна СНГ'] },
      { label: 'ИНН / УНП / ИИН компании', type: 'text', placeholder: '123456789' },
      { label: 'Официальное название компании', type: 'text', placeholder: 'ООО "Ваша Компания"' },
    ],
    aiCheck: true,
  },
  {
    id: 2, icon: '👤', title: 'Роль на платформе',
    desc: 'Выберите как вы планируете использовать GLORIX',
    roles: [
      { id: 'buyer', icon: '🛒', title: 'Покупатель', desc: 'Создаю тендеры, закупаю товары оптом, ищу поставщиков' },
      { id: 'seller', icon: '🏭', title: 'Продавец', desc: 'Подаю оферты, продаю товары через маркетплейс' },
      { id: 'both', icon: '🔄', title: 'Покупатель и продавец', desc: 'Использую обе функции в зависимости от задачи' },
    ],
  },
  {
    id: 3, icon: '📋', title: 'Договорные предпочтения',
    desc: 'Настройте один раз — платформа применит автоматически',
    fields: [
      { label: 'Применимое право', type: 'select', options: ['По стране регистрации (авто)', 'Узбекистан', 'Казахстан', 'Международное'] },
      { label: 'Приоритет договора', type: 'select', options: ['Мой договор в приоритете', 'Принимаю договор другой стороны', 'Шаблон платформы GLORIX'] },
    ],
    checkbox: 'Согласен работать по шаблону GLORIX при договорном конфликте',
  },
  {
    id: 4, icon: '💰', title: 'Депозитный счёт',
    desc: 'Пополните счёт для участия в тендерах и маркетплейсе',
    info: [
      { icon: '🔒', text: 'Депозит хранится на Escrow счёте GLORIX' },
      { icon: '↩️', text: 'Возвращается после успешной сделки' },
      { icon: '⚡', text: 'Переводится продавцу мгновенно после загрузки накладной' },
      { icon: '⚠️', text: 'Валютный риск: сумма фиксируется в USD на дату внесения' },
    ],
  },
  {
    id: 5, icon: '🎯', title: 'Готово! Что делать дальше?',
    desc: 'Выберите с чего хотите начать',
    actions: [
      { icon: '📋', title: 'Создать первый тендер', desc: 'Объявите закупку и получите оферты от верифицированных поставщиков', path: '/create', color: 'var(--accent)' },
      { icon: '◈', title: 'Открыть маркетплейс', desc: 'Найдите нужный товар и купите прямо сейчас через Escrow', path: '/marketplace', color: '#63B3ED' },
      { icon: '?', title: 'Начать с RFI', desc: 'Изучите рынок поставщиков до объявления тендера (CIPS стандарт)', path: '/rfi', color: 'var(--gold)' },
    ],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(null);
  const [checked, setChecked] = useState(false);
  const navigate = useNavigate();
  const current = steps[step];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--navy)' }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#fff' }}>
            GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, letterSpacing: 1 }}>B2B TRADE PLATFORM · CIS</div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--navy-3)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Card */}
        <div className="card fade-in" style={{ padding: '32px 36px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{current.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-display)', marginBottom: 8 }}>{current.title}</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{current.desc}</div>
          </div>

          {/* Step 1: Company verification */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {current.fields.map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  {f.type === 'select' ? (
                    <select style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
              {current.aiCheck && (
                <div style={{ padding: '12px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                  <span>◎</span><span>ИИ автоматически проверит компанию через госреестр вашей страны. Обычно занимает 1–2 минуты.</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Role */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {current.roles.map(r => (
                <div key={r.id} onClick={() => setRole(r.id)} style={{
                  padding: '16px 18px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  background: role === r.id ? 'rgba(0,212,170,0.08)' : 'var(--navy-3)',
                  border: `2px solid ${role === r.id ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 24 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>{r.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.desc}</div>
                    </div>
                    {role === r.id && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 18 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Contract prefs */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {current.fields.map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <select style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{current.checkbox}</span>
              </label>
            </div>
          )}

          {/* Step 4: Deposit */}
          {step === 3 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {current.info.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: item.icon === '⚠️' ? 'var(--gold-dim)' : 'var(--navy-3)', border: `1px solid ${item.icon === '⚠️' ? 'rgba(245,166,35,0.2)' : 'var(--border)'}`, borderRadius: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                В демо-версии реальный депозит не требуется. В production версии потребуется верификация банковского счёта компании и внесение депозита через партнёрский банк.
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {current.actions.map(a => (
                <div key={a.path} onClick={() => navigate(a.path)} style={{
                  padding: '16px 18px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  background: 'var(--navy-3)', border: `1px solid var(--border)`,
                  display: 'flex', gap: 14, alignItems: 'center',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `${a.color}11`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--navy-3)'; }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 3, color: a.color }}>{a.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.desc}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && step < 4 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1, justifyContent: 'center' }}>← Назад</button>
            )}
            {step < 4 && (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
                style={{ flex: 2, justifyContent: 'center', padding: '12px' }}
                disabled={step === 1 && !role}>
                {step === 3 ? 'Завершить регистрацию →' : 'Далее →'}
              </button>
            )}
            {step === 4 && (
              <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ flex: 1, justifyContent: 'center' }}>Перейти на дашборд</button>
            )}
          </div>

          {/* Skip */}
          {step < 4 && (
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>
                Пропустить и посмотреть демо →
              </button>
            </div>
          )}
        </div>

        {/* Steps indicator */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
          Шаг {step + 1} из {steps.length}
        </div>
      </div>
    </div>
  );
}
