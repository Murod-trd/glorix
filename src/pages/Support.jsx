import { useState } from 'react';

const faqs = [
  { q: 'Как работает анонимность в тендере?', a: 'В процессе тендера все участники видят только технические характеристики и цены — без имён компаний. Победитель раскрывается только после D5 (закрытие тендера). Это исключает коррупцию, сговор и давление на поставщиков.' },
  { q: 'Что происходит с депозитом если сделка не состоялась?', a: 'Если покупатель отменил тендер (после 24-часового периода без штрафа) — его депозит переходит продавцу как компенсация. Если продавец не исполнил контракт — его депозит переходит покупателю. При форс-мажоре — депозиты замораживаются до разрешения ситуации.' },
  { q: 'Как ИИ проверяет санкционные товары?', a: 'ИИ-система в реальном времени сверяет каждый товар и контрагента с базами OFAC, EU Consolidated List, UN Sanctions List и национальными санкционными реестрами. При обнаружении совпадения — тендер блокируется автоматически.' },
  { q: 'Что такое RFI и зачем он нужен?', a: 'RFI (Request for Information) — запрос информации у поставщиков до объявления тендера. По стандарту CIPS это стадии 2–4 закупочного цикла. RFI помогает изучить рынок, понять реальные возможности поставщиков и сформировать точную спецификацию тендера.' },
  { q: 'Как работает Escrow в маркетплейсе?', a: 'Покупатель оплачивает заказ — деньги поступают на Escrow-счёт GLORIX. Продавец отгружает товар и загружает накладную + счёт-фактуру. ИИ верифицирует документы. Деньги мгновенно переходят продавцу. Если продавец не отгрузил — 100% возврат покупателю.' },
  { q: 'Что делать если возник спор с контрагентом?', a: 'Зафиксируйте нарушение в платформе через кнопку «Открыть спор». Платформа замораживает средства до разрешения ситуации. Первый этап — медиация через GLORIX (48 часов). Если не решено — дело передаётся в ТПП страны покупателя или международный арбитраж по условиям договора.' },
  { q: 'Можно ли предложить аналог товара в тендере?', a: 'Да. Продавец может предложить аналог если его качество равно или выше требуемого. ИИ сравнивает характеристики с открытыми базами данных. Покупатель получает уведомление и подтверждает или отклоняет аналог. После первого одобрения — все аналогичные предложения проходят автоматически.' },
  { q: 'Как рассчитывается рейтинг доверия?', a: 'Рейтинг = успешные сделки / общее количество сделок × 100%. Зелёная зона: 70–100% (стандартные условия). Жёлтая: 30–69% (предупреждения, лимиты). Красная: ниже 30% (обязательная предоплата 100%, финансовые ограничения).' },
];

const supportMessages = [
  { from: 'support', text: 'Добро пожаловать в поддержку GLORIX! Как могу помочь?', time: '09:00' },
];

export default function Support() {
  const [openFaq, setOpenFaq] = useState(null);
  const [tab, setTab] = useState('faq');
  const [messages, setMessages] = useState(supportMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const autoResponses = [
    'Спасибо за вопрос! По этой теме рекомендую ознакомиться с разделом FAQ — там подробный ответ. Если вопрос не закрыт — наш специалист свяжется в течение 2 часов.',
    'Понял вас. Это частый вопрос. Ключевое: депозит возвращается в течение 24 часов после успешной сделки. Если нужна детальная консультация — оставьте email и мы перезвоним.',
    'Отличный вопрос! В production версии этот процесс будет полностью автоматизирован. В демо некоторые функции симулированы. Что ещё хотите узнать?',
  ];

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { from: 'user', text: input, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = { from: 'support', text: autoResponses[Math.floor(Math.random() * autoResponses.length)], time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, reply]);
      setTyping(false);
    }, 1500);
  };

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ПОДДЕРЖКА</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>Помощь и поддержка</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>FAQ · Онлайн-чат · Документация</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 10, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {[['faq', '❓ FAQ'], ['chat', '💬 Чат с поддержкой'], ['contacts', '📞 Контакты']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: tab === v ? 'var(--accent)' : 'transparent',
            color: tab === v ? 'var(--navy)' : 'var(--text-2)',
            transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* FAQ */}
      {tab === 'faq' && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>Часто задаваемые вопросы — {faqs.length} ответов</div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                width: '100%', padding: '16px 20px', textAlign: 'left', background: openFaq === i ? 'rgba(0,212,170,0.06)' : 'var(--card)',
                border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontWeight: 500, fontSize: 14, color: openFaq === i ? 'var(--accent)' : 'var(--text)' }}>{faq.q}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 18, flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 20px 16px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, background: 'rgba(0,212,170,0.03)' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      {tab === 'chat' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: 'var(--navy-3)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>◎</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Поддержка GLORIX</div>
                <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Онлайн · Отвечаем за 2 часа</div>
              </div>
            </div>
            <div style={{ height: 360, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                    background: msg.from === 'user' ? 'var(--accent)' : 'var(--navy-3)',
                    color: msg.from === 'user' ? 'var(--navy)' : 'var(--text)',
                    borderBottomRightRadius: msg.from === 'user' ? 2 : 10,
                    borderBottomLeftRadius: msg.from === 'support' ? 2 : 10,
                  }}>
                    {msg.text}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: 'right' }}>{msg.time}</div>
                  </div>
                </div>
              ))}
              {typing && (
                <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-3)', animation: `pulse ${0.5+i*0.15}s infinite` }} />)}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Напишите вопрос..." style={{ flex: 1, padding: '9px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }} />
              <button className="btn btn-primary" onClick={send} style={{ padding: '9px 16px' }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts */}
      {tab === 'contacts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 720 }}>
          {[
            { icon: '📧', title: 'Email', value: 'support@glorix.io', desc: 'Ответ в течение 24 часов' },
            { icon: '📱', title: 'Telegram', value: '@glorix_support', desc: 'Быстрые вопросы — здесь' },
            { icon: '🌐', title: 'Документация', value: 'docs.glorix.io', desc: 'Полная техническая документация' },
          ].map((c, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
              <div style={{ color: 'var(--accent)', fontSize: 14, marginBottom: 6 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
