import { useState } from 'react';
import { rfiList, rfiAnswers, communityMessages } from '../data/cips';
import { useNavigate } from 'react-router-dom';

const botResponses = [
  'По данным GLORIX и открытых источников: {query}. Рекомендую также проверить ESG профиль поставщика перед тендером.',
  'ИИ-анализ показывает: для данной категории оптимальный Incoterms — DAP или CIF. Стоимость доставки обычно составляет 5-12% от стоимости товара.',
  'На платформе GLORIX зарегистрировано 847 верифицированных поставщиков в этой категории. Рекомендую запустить RFI для предварительного отбора.',
  'Важно: по стандарту CIPS перед тендером нужно провести преквалификацию по 10C. GLORIX делает это автоматически через Scorecard.',
];

function RFIAnswersModal({ rfi, onClose, onCreateTender }) {
  const answers = rfiAnswers[rfi.id] || [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: '90%', maxWidth: 800, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--navy-2)', zIndex: 1 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>{rfi.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{answers.length} ответов · Все поставщики анонимны</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={onCreateTender} style={{ fontSize: 13 }}>
              Создать тендер на основе RFI →
            </button>
            <button onClick={onClose} style={{ background: 'none', color: 'var(--text-2)', fontSize: 20 }}>×</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* AI Summary */}
          <div style={{ marginBottom: 20, padding: '14px 18px', background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18 }}>◎</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>ИИ-сводка ответов</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  Получено {answers.length} ответа. Лучший кандидат: <span style={{ color: 'var(--accent)' }}>Поставщик #{answers.findIndex(a => a.aiScore === Math.max(...answers.map(x => x.aiScore))) + 1}</span> (ИИ-оценка {Math.max(...answers.map(a => a.aiScore))}/100).
                  {answers.filter(a => a.aiScore >= 80).length} из {answers.length} поставщиков соответствуют требованиям. Рекомендую допустить топ-2 к тендеру.
                </div>
              </div>
            </div>
          </div>

          {/* Sorted answers */}
          {[...answers].sort((a, b) => b.aiScore - a.aiScore).map((ans, idx) => (
            <div key={ans.id} className="card" style={{ marginBottom: 14, borderColor: idx === 0 ? 'rgba(0,212,170,0.3)' : 'var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--navy-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{ans.flag}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ans.anonymous}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{ans.country} · Верифицирован · Trust {ans.trustScore}%</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {idx === 0 && <span className="badge badge-green" style={{ display: 'block', marginBottom: 4 }}>◎ Рекомендован ИИ</span>}
                  <div style={{ fontSize: 20, fontWeight: 700, color: ans.aiScore >= 80 ? 'var(--accent)' : ans.aiScore >= 60 ? 'var(--gold)' : 'var(--red)', fontFamily: 'var(--font-display)' }}>{ans.aiScore}/100</div>
                </div>
              </div>

              {rfi.questions.map((q, i) => (
                <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < rfi.questions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Вопрос {i+1}: {q}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{ans.answers[i]}</div>
                </div>
              ))}

              <div style={{ padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 8 }}>
                <span>◎</span><span><strong>ИИ-вывод:</strong> {ans.aiNote}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TenderFromRFIModal({ rfi, onClose }) {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: 560, padding: '28px 32px' }}>
        <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Создать тендер на основе RFI</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>ИИ автоматически заполнит спецификации из ответов на RFI</div>

        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Что ИИ заполнит автоматически:</div>
          {['Название и категория тендера из RFI', 'Технические требования из лучших ответов', 'Допущенные поставщики (преквалификация пройдена)', 'Предлагаемые дедлайны на основе дат RFI', 'Incoterms из предпочтений поставщиков'].map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 5, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent)' }}>✓</span>{s}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Отмена</button>
          <button className="btn btn-primary" onClick={() => { onClose(); navigate('/create'); }} style={{ flex: 2, justifyContent: 'center' }}>
            Перейти к созданию тендера →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RFIModule() {
  const [creating, setCreating] = useState(false);
  const [viewingAnswers, setViewingAnswers] = useState(null);
  const [creatingTender, setCreatingTender] = useState(null);
  const [communityTab, setCommunityTab] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState(communityMessages);
  const [botTyping, setBotTyping] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', deadline: '', questions: [''] });

  const addQ = () => setForm(f => ({ ...f, questions: [...f.questions, ''] }));
  const updateQ = (i, v) => { const q = [...form.questions]; q[i] = v; setForm(f => ({ ...f, questions: q })); };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      id: 'm' + Date.now(), type: 'user', anonymous: 'Вы (Компания E)', country: 'UZ', flag: '🇺🇿',
      text: newMessage, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      likes: 0, category: 'Общие вопросы',
    };
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setBotTyping(true);
    setTimeout(() => {
      const botMsg = {
        id: 'bot' + Date.now(), type: 'bot', botName: 'ИИ-ассистент GLORIX',
        text: botResponses[Math.floor(Math.random() * botResponses.length)].replace('{query}', 'по вашему запросу найдено несколько решений'),
        time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
        likes: 0, category: 'Общие вопросы',
      };
      setMessages(prev => [...prev, botMsg]);
      setBotTyping(false);
    }, 2000);
  };

  const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14 };
  const cats = ['all', 'Стройматериалы', 'Агро / Зерновые', 'Оборудование', 'Общие вопросы'];
  const filteredMsgs = communityTab === 'all' ? messages : messages.filter(m => m.category === communityTab);

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {viewingAnswers && <RFIAnswersModal rfi={viewingAnswers} onClose={() => setViewingAnswers(null)} onCreateTender={() => { setCreatingTender(viewingAnswers); setViewingAnswers(null); }} />}
      {creatingTender && <TenderFromRFIModal rfi={creatingTender} onClose={() => setCreatingTender(null)} />}

      <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>CIPS СТАДИЯ 2–4</div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>RFI — Запрос информации</h1>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>Request for Information · Изучите рынок до тендера · Анонимно для поставщиков</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: RFI list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600 }}>Мои RFI ({rfiList.length})</div>
            <button className="btn btn-primary" onClick={() => setCreating(!creating)} style={{ fontSize: 12, padding: '7px 14px' }}>
              {creating ? '× Отмена' : '+ Создать RFI'}
            </button>
          </div>

          {creating && (
            <div className="card" style={{ marginBottom: 16, padding: '20px' }}>
              <div style={{ fontWeight: 600, marginBottom: 14 }}>Новый RFI</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={inputStyle} placeholder="Тема RFI" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Категория</option>
                    <option>Агро / Зерновые</option><option>Оборудование</option><option>IT / Электроника</option><option>Стройматериалы</option>
                  </select>
                  <input type="date" style={inputStyle} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                {form.questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', paddingTop: 11, width: 18 }}>{i+1}.</span>
                    <input style={inputStyle} placeholder={`Вопрос ${i+1}`} value={q} onChange={e => updateQ(i, e.target.value)} />
                  </div>
                ))}
                <button onClick={addQ} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>+ Вопрос</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setCreating(false)} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>Отмена</button>
                  <button className="btn btn-primary" onClick={() => { alert('RFI опубликован! (демо)'); setCreating(false); }} style={{ flex: 2, justifyContent: 'center', fontSize: 12 }}>Опубликовать</button>
                </div>
              </div>
            </div>
          )}

          {rfiList.map(rfi => (
            <div key={rfi.id} className="card" style={{ marginBottom: 12, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{rfi.title}</div>
                <span className={`badge ${rfi.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{rfi.status === 'active' ? 'Активный' : 'Закрыт'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <span className="tag" style={{ fontSize: 10 }}>{rfi.category}</span>
                <span className="tag" style={{ fontSize: 10 }}>До: {rfi.deadline}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
                {rfi.questions.slice(0, 2).map((q, i) => <div key={i} style={{ marginBottom: 2 }}>{i+1}. {q}</div>)}
                {rfi.questions.length > 2 && <div style={{ color: 'var(--text-3)' }}>+{rfi.questions.length - 2} ещё...</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Ответов: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{rfi.responses}</span></span>
                {rfi.status === 'active'
                  ? <button className="btn btn-primary" onClick={() => setViewingAnswers(rfi)} style={{ fontSize: 12, padding: '6px 14px' }}>Смотреть ответы →</button>
                  : <button className="btn btn-ghost" onClick={() => setCreatingTender(rfi)} style={{ fontSize: 12, padding: '6px 14px' }}>Создать тендер →</button>}
              </div>
            </div>
          ))}

          {/* CIPS cycle */}
          <div className="card" style={{ marginTop: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>CIPS Procurement Cycle</div>
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
              {[['1','Потребность','done'],['2','Рынок','done'],['3','RFI','active'],['4','Преквал.','active'],['5','Тендер','pending'],['6','Оценка','pending'],['7','Перегов.','pending'],['8','Контракт','pending'],['9','Доставка','pending'],['10','KPI','pending'],['11','SRM','pending'],['12','Закрытие','pending'],['13','Активы','pending']].map(([n,l,s]) => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, gap: 4 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: s==='done'?'var(--accent)':s==='active'?'var(--accent-dim)':'var(--navy-3)', border: `2px solid ${s==='done'?'var(--accent)':s==='active'?'var(--accent)':'var(--border)'}`, color: s==='done'?'var(--navy)':s==='active'?'var(--accent)':'var(--text-3)' }}>{s==='done'?'✓':n}</div>
                  <div style={{ fontSize: 9, color: s==='active'?'var(--accent)':'var(--text-3)', textAlign: 'center' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Community chat */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>◎ Анонимный форум участников</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>Делитесь опытом анонимно. ИИ-ассистент отвечает на вопросы. Имена компаний скрыты.</div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCommunityTab(c)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: communityTab === c ? 'var(--accent)' : 'var(--navy-3)',
                color: communityTab === c ? 'var(--navy)' : 'var(--text-2)',
                border: `1px solid ${communityTab === c ? 'var(--accent)' : 'var(--border)'}`,
              }}>{c === 'all' ? 'Все темы' : c}</button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ height: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {filteredMsgs.map(msg => (
              <div key={msg.id} className="fade-in" style={{ padding: '12px 14px', borderRadius: 10, background: msg.type === 'bot' ? 'rgba(0,212,170,0.06)' : 'var(--card)', border: `1px solid ${msg.type === 'bot' ? 'rgba(0,212,170,0.2)' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14 }}>{msg.type === 'bot' ? '◎' : msg.flag}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: msg.type === 'bot' ? 'var(--accent)' : 'var(--text)' }}>
                      {msg.type === 'bot' ? msg.botName : msg.anonymous}
                    </span>
                    {msg.type !== 'bot' && <span className="tag" style={{ fontSize: 9 }}>{msg.country}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{msg.text}</div>
                {msg.likes > 0 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>👍 {msg.likes}</div>}
              </div>
            ))}
            {botTyping && (
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)' }}>
                <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 6 }}>◎ ИИ-ассистент печатает...</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `pulse ${0.5 + i*0.15}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Задайте вопрос анонимно... (Enter для отправки)"
              style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
            <button className="btn btn-primary" onClick={sendMessage} style={{ padding: '10px 16px', fontSize: 13 }}>→</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>Ваше сообщение видно другим как «Компания E» — полная анонимность</div>
        </div>
      </div>
    </div>
  );
}
