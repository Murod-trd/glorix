import { useState } from 'react';

const managers = [
  {
    id: 'rm1',
    name: 'Азиза Каримова',
    title: 'Senior Relationship Manager',
    photo: '👩‍💼',
    languages: ['RU', 'UZ', 'EN'],
    specialization: ['Агро / Зерновые', 'Текстиль', 'Химикаты'],
    countries: ['UZ', 'KZ', 'TJ'],
    rating: 4.9,
    deals: 312,
    responseTime: '< 2 часов',
    available: true,
    bio: 'Специализируюсь на аграрном экспорте и текстильных закупках в СНГ. Помогла 312 компаниям закрыть сделки на общую сумму $47M. Знаю все нюансы таможенного оформления на границах UZ–KZ.',
    schedule: 'Пн–Пт 09:00–18:00 (UTC+5)',
  },
  {
    id: 'rm2',
    name: 'Рустам Назаров',
    title: 'Relationship Manager',
    photo: '👨‍💼',
    languages: ['RU', 'EN', 'AZ'],
    specialization: ['Металлы', 'Стройматериалы', 'Оборудование'],
    countries: ['RU', 'KZ', 'AZ'],
    rating: 4.8,
    deals: 198,
    responseTime: '< 3 часов',
    available: true,
    bio: 'Эксперт по промышленным закупкам и металлоторговле. Работал в Evraz и ММК до прихода на GLORIX. Помогу с тендерами на оборудование и стройматериалы в РФ и Казахстане.',
    schedule: 'Пн–Пт 08:00–17:00 (UTC+3)',
  },
  {
    id: 'rm3',
    name: 'Лейла Алиева',
    title: 'Junior Relationship Manager',
    photo: '👩‍💼',
    languages: ['RU', 'AZ', 'TR'],
    specialization: ['Продукты питания', 'Упаковка', 'Химикаты'],
    countries: ['AZ', 'TR', 'GE'],
    rating: 4.7,
    deals: 89,
    responseTime: '< 4 часов',
    available: false,
    bio: 'Специализируюсь на торговле между Азербайджаном, Грузией и Турцией. Отлично знаю логистику через Баку и таможенные особенности региона Южного Кавказа.',
    schedule: 'Пн–Пт 09:00–18:00 (UTC+4)',
  },
];

const myManager = managers[0];

const messages = [
  { from: 'manager', text: 'Добрый день! Я Азиза, ваш персональный менеджер на GLORIX. Готова помочь с любыми вопросами по тендерам и маркетплейсу.', time: '09:15' },
  { from: 'user', text: 'Азиза, здравствуйте! Интересует поставка хлопковой пряжи Ne 30/1, объём 5000 кг.', time: '09:32' },
  { from: 'manager', text: 'Отлично! По данному запросу у нас 3 верифицированных поставщика в Фергане с подходящим объёмом. Рекомендую начать с RFI — я помогу составить правильные вопросы чтобы сразу отсеять слабых кандидатов. Запустить?', time: '09:34' },
  { from: 'user', text: 'Да, давайте!', time: '09:40' },
  { from: 'manager', text: 'Запускаю RFI. Также проверила: по Incoterms FOB Фергана доставка до Ташкента обойдётся около $0.08/кг. Итого ориентировочно $2.88/кг с доставкой. Это хорошая отправная точка для тендера.', time: '09:41' },
];

export default function RelationshipManager() {
  const [tab, setTab] = useState('my');
  const [input, setInput] = useState('');
  const [chat, setChat] = useState(messages);
  const [typing, setTyping] = useState(false);

  const replies = [
    'Понял вас! Уже проверяю доступных поставщиков по этому запросу. Дайте мне несколько минут.',
    'Хороший вопрос. По данной категории рекомендую Incoterms DAP — продавец берёт все риски до вашего склада. Хотите запустить тендер?',
    'Проверила рейтинг доверия этого поставщика — 91%, 47 успешных сделок. Надёжный партнёр, работаем с ними давно.',
    'Депозит для этого объёма составит около $8,500 с каждой стороны (ставка ИИ: 8.5%). Это нормально для такой суммы сделки.',
  ];

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { from: 'user', text: input, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
    setChat(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = { from: 'manager', text: replies[Math.floor(Math.random() * replies.length)], time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
      setChat(prev => [...prev, reply]);
      setTyping(false);
    }, 2000);
  };

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ПЕРСОНАЛЬНЫЙ СЕРВИС</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Relationship Manager</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}>Персональный менеджер который знает ваш бизнес и помогает закрывать сделки</div>
      <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 28, padding: '6px 14px', background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 8, display: 'inline-block' }}>
        ⭐ Главная причина лояльности клиентов go4WorldBusiness — персональный менеджер. GLORIX внедрил это с первого дня.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--navy-3)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['my', 'Мой менеджер'], ['all', 'Все менеджеры'], ['schedule', 'Записаться']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: tab === v ? 'var(--accent)' : 'transparent',
            color: tab === v ? 'var(--navy)' : 'var(--text-2)',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'my' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          {/* Manager card */}
          <div>
            <div className="card" style={{ padding: '24px', marginBottom: 16, borderColor: 'rgba(0,212,170,0.3)' }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{myManager.photo}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{myManager.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{myManager.title}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', marginTop: 2 }} />
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>Онлайн</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>{myManager.bio}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['⭐ Рейтинг', myManager.rating + '/5'], ['📋 Сделок', myManager.deals], ['⏱ Ответ', myManager.responseTime], ['🕐 График', 'Пн–Пт']].map(([l, v]) => (
                  <div key={l} style={{ padding: '8px 10px', background: 'var(--navy-3)', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Специализация:</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {myManager.specialization.map(s => <span key={s} className="tag" style={{ fontSize: 10 }}>{s}</span>)}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Языки:</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {myManager.languages.map(l => <span key={l} style={{ padding: '2px 8px', background: 'var(--accent-dim)', borderRadius: 4, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{l}</span>)}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setTab('schedule')} style={{ width: '100%', justifyContent: 'center' }}>📅 Записаться на звонок</button>
          </div>

          {/* Chat */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', background: 'var(--navy-3)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>{myManager.photo}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{myManager.name}</div>
                <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Онлайн · {myManager.responseTime}</div>
              </div>
            </div>
            <div style={{ flex: 1, height: 380, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chat.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '78%', padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                    background: msg.from === 'user' ? 'var(--accent)' : 'var(--navy-3)',
                    color: msg.from === 'user' ? 'var(--navy)' : 'var(--text)',
                    borderBottomRightRadius: msg.from === 'user' ? 2 : 10,
                    borderBottomLeftRadius: msg.from === 'manager' ? 2 : 10,
                  }}>
                    {msg.text}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>{msg.time}</div>
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `pulse ${0.5+i*0.15}s infinite` }} />)}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Напишите менеджеру..." style={{ flex: 1, padding: '9px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
              <button className="btn btn-primary" onClick={send} style={{ padding: '9px 16px' }}>→</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {managers.map(m => (
            <div key={m.id} className="card" style={{ padding: '20px', borderColor: m.id === myManager.id ? 'rgba(0,212,170,0.3)' : 'var(--border)' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{m.photo}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{m.title}</div>
                  <div style={{ fontSize: 11, marginTop: 3 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.available ? 'var(--accent)' : 'var(--text-3)', display: 'inline-block', marginRight: 4 }} />
                    <span style={{ color: m.available ? 'var(--accent)' : 'var(--text-3)' }}>{m.available ? 'Онлайн' : 'Недоступен'}</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>{m.bio.slice(0, 100)}...</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
                <span style={{ color: 'var(--text-3)' }}>⭐ {m.rating} · {m.deals} сделок</span>
                <span style={{ color: 'var(--text-3)' }}>⏱ {m.responseTime}</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                {m.languages.map(l => <span key={l} style={{ padding: '2px 7px', background: 'var(--accent-dim)', borderRadius: 4, fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>{l}</span>)}
              </div>
              {m.id === myManager.id
                ? <span className="badge badge-green" style={{ width: '100%', justifyContent: 'center' }}>✓ Ваш менеджер</span>
                : <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>Запросить смену менеджера</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'schedule' && (
        <div style={{ maxWidth: 500 }}>
          <div className="card" style={{ padding: '28px 32px' }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>Записаться на звонок с {myManager.name}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Тема звонка</label>
                <select style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}>
                  <option>Консультация по тендеру</option>
                  <option>Помощь с выбором поставщика</option>
                  <option>Вопрос по Incoterms / логистике</option>
                  <option>Проблема со сделкой</option>
                  <option>Другое</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Дата</label>
                <input type="date" style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Время</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00'].map(t => (
                    <button key={t} style={{ padding: '8px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'var(--navy-3)', border: '1px solid var(--border)', color: 'var(--text-2)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-2)'; }}>{t}</button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => alert('Звонок запланирован! Менеджер пришлёт подтверждение. (демо)')} style={{ justifyContent: 'center', padding: '13px' }}>
                Запланировать звонок
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
