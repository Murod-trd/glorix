import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const accounts = [
  {
    id: 'buyer',
    icon: '🛒',
    title: 'Покупатель',
    color: '#63B3ED',
    gradient: 'rgba(99,179,237,0.08)',
    desc: 'Закупаю товары оптом, создаю тендеры, ищу поставщиков',
    docs: [
      { label: 'Свидетельство о регистрации юрлица', auto: true },
      { label: 'Свидетельство о постановке на налоговый учёт', auto: true },
    ],
    features: [
      '✓ Создание тендеров',
      '✓ Покупка в маркетплейсе',
      '✓ RFI запросы к поставщикам',
      '✓ ИИ-анализ оферт и TCO',
      '✓ Аналитика закупок',
      '✗ Продажа товаров',
      '✗ Подача оферт продавца',
    ],
    verificationTime: '~2 минуты',
    badge: 'Простая верификация',
  },
  {
    id: 'seller',
    icon: '🏭',
    title: 'Продавец',
    color: '#00D4AA',
    gradient: 'rgba(0,212,170,0.08)',
    desc: 'Продаю товары через маркетплейс, участвую в тендерах как поставщик',
    docs: [
      { label: 'Свидетельство о регистрации юрлица', auto: true },
      { label: 'Свидетельство о постановке на налоговый учёт', auto: true },
      { label: 'Лицензия на торговую деятельность', auto: false, required: true },
      { label: 'Сертификат происхождения товара (CT-1 / Form A)', auto: false, required: true },
      { label: 'Отраслевые сертификаты (по категории товара)', auto: false, required: false },
    ],
    features: [
      '✓ Размещение товаров в маркетплейсе',
      '✓ Участие в тендерах как продавец',
      '✓ Document Center (КП, счёт-фактура)',
      '✓ Аналитика продаж',
      '✓ Профиль поставщика с рейтингом',
      '✗ Создание тендеров как покупатель',
      '✗ Покупка в маркетплейсе',
    ],
    verificationTime: '~24 часа',
    badge: 'Расширенная верификация',
  },
  {
    id: 'both',
    icon: '🔄',
    title: 'Покупатель + Продавец',
    color: '#F5A623',
    gradient: 'rgba(245,166,35,0.08)',
    desc: 'Использую все возможности платформы — покупаю и продаю',
    docs: [
      { label: 'Свидетельство о регистрации юрлица', auto: true },
      { label: 'Свидетельство о постановке на налоговый учёт', auto: true },
      { label: 'Лицензия на торговую деятельность', auto: false, required: true },
      { label: 'Сертификат происхождения товара (CT-1 / Form A)', auto: false, required: true },
      { label: 'Отраслевые сертификаты (по категории товара)', auto: false, required: false },
    ],
    features: [
      '✓ Все функции покупателя',
      '✓ Все функции продавца',
      '✓ Единый аккаунт и аналитика',
      '✓ Document Center',
      '✓ Переключение режимов в один клик',
    ],
    verificationTime: '~24 часа',
    badge: 'Полная верификация',
    recommended: true,
  },
];

export default function AccountSelect() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('select'); // select | verify | done

  const acct = accounts.find(a => a.id === selected);

  const proceed = () => {
    if (!selected) return;
    localStorage.setItem('glorix_account_type', selected);
    setStep('verify');
  };

  const finish = () => {
    setStep('done');
    setTimeout(() => navigate('/'), 1500);
  };

  if (step === 'done') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✓</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Аккаунт создан!</div>
        <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Переходим на платформу...</div>
      </div>
    </div>
  );

  if (step === 'verify') return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
            GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Верификация аккаунта</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{acct.icon} {acct.title} · {acct.badge}</div>
        </div>

        <div className="card" style={{ padding: '28px 32px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Необходимые документы</div>
          {acct.docs.map((doc, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', marginBottom: 8, background: doc.auto ? 'rgba(0,212,170,0.06)' : 'var(--navy-3)', border: `1px solid ${doc.auto ? 'rgba(0,212,170,0.2)' : 'var(--border)'}`, borderRadius: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: doc.auto ? 'var(--accent)' : 'var(--navy-2)', border: `2px solid ${doc.auto ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: doc.auto ? 'var(--navy)' : 'var(--text-3)', fontWeight: 700, flexShrink: 0 }}>
                {doc.auto ? '✓' : '↑'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {doc.auto ? '◎ Автоматически через госреестр' : doc.required ? 'Обязательно — загрузите вручную' : 'По категории товара'}
                </div>
              </div>
              {!doc.auto && (
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Загрузить</button>
              )}
            </div>
          ))}
        </div>

        {(acct.id === 'seller' || acct.id === 'both') && (
          <div className="card" style={{ padding: '16px 20px', marginBottom: 16, background: 'rgba(255,77,77,0.05)', borderColor: 'rgba(255,77,77,0.2)' }}>
            <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 6, fontSize: 13 }}>⚖ Юридическое требование</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
              Продажа товаров без лицензии на торговую деятельность нарушает законодательство большинства стран СНГ. GLORIX не допускает к продажам компании без действующих лицензий. Это защищает вас, покупателей и платформу.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setStep('select')} style={{ flex: 1, justifyContent: 'center' }}>← Назад</button>
          <button className="btn btn-primary" onClick={finish} style={{ flex: 2, justifyContent: 'center', padding: '13px' }}>
            Создать аккаунт {acct.icon} {acct.title} →
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: 3, marginBottom: 12 }}>
            GLO<span style={{ color: 'var(--accent)' }}>RIX</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Выберите тип аккаунта</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Вы всегда сможете изменить тип позже через настройки профиля</div>
        </div>

        {/* Account cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {accounts.map(acct => (
            <div key={acct.id} onClick={() => setSelected(acct.id)} style={{
              padding: '24px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
              background: selected === acct.id ? acct.gradient : 'var(--card)',
              border: `2px solid ${selected === acct.id ? acct.color : 'var(--border)'}`,
              position: 'relative',
            }}>
              {acct.recommended && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', padding: '3px 14px', background: acct.color, borderRadius: 20, fontSize: 11, fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                  ★ Рекомендуем
                </div>
              )}
              <div style={{ fontSize: 36, marginBottom: 12 }}>{acct.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: acct.color, marginBottom: 6, fontFamily: 'var(--font-display)' }}>{acct.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>{acct.desc}</div>

              <div style={{ marginBottom: 16 }}>
                {acct.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 5, color: f.startsWith('✓') ? 'var(--text-2)' : 'var(--text-3)' }}>
                    <span style={{ color: f.startsWith('✓') ? acct.color : 'var(--border-2)' }}>{f.slice(0,1)}</span>
                    {f.slice(1)}
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>⏱ {acct.verificationTime}</span>
                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: `${acct.color}20`, color: acct.color, fontWeight: 600 }}>{acct.badge}</span>
              </div>

              {selected === acct.id && (
                <div style={{ marginTop: 12, padding: '8px', background: acct.color, borderRadius: 8, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                  ✓ Выбрано
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Documents comparison */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '14px 20px', background: 'var(--navy-3)', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Необходимые документы по типу аккаунта</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Документ</th>
                {accounts.map(a => <th key={a.id} style={{ padding: '12px 20px', textAlign: 'center', fontSize: 13, color: a.color, fontWeight: 600 }}>{a.icon} {a.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Свидетельство о регистрации юрлица (авто ◎)', '✓','✓','✓'],
                ['Налоговый учёт (авто ◎)', '✓','✓','✓'],
                ['Лицензия на торговую деятельность', '—','✓ обяз.','✓ обяз.'],
                ['Сертификат происхождения (CT-1 / Form A)', '—','✓ обяз.','✓ обяз.'],
                ['Отраслевые сертификаты (агро, медтех, хим)', '—','По кат.','По кат.'],
                ['Экспортная лицензия (при экспорте)', '—','Опц.','Опц.'],
              ].map(([label, b, s, both], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '10px 20px', fontSize: 13, color: 'var(--text-2)' }}>{label}</td>
                  {[b, s, both].map((v, j) => (
                    <td key={j} style={{ padding: '10px 20px', textAlign: 'center', fontSize: 13, color: v==='—'?'var(--text-3)':v.includes('обяз')?'var(--accent)':'var(--text-2)', fontWeight: v.includes('обяз')?600:400 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ padding: '12px 24px' }}>
            Посмотреть демо без регистрации
          </button>
          <button className="btn btn-primary" onClick={proceed} disabled={!selected} style={{ padding: '12px 32px', fontSize: 15, opacity: selected ? 1 : 0.5 }}>
            Продолжить {selected && `— ${accounts.find(a=>a.id===selected)?.title}`} →
          </button>
        </div>
      </div>
    </div>
  );
}
