import { useState } from 'react';
import { rfiList } from '../data/cips';

export default function RFIModule() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', category: '', deadline: '', questions: [''] });

  const addQ = () => setForm(f => ({ ...f, questions: [...f.questions, ''] }));
  const updateQ = (i, v) => {
    const q = [...form.questions]; q[i] = v;
    setForm(f => ({ ...f, questions: q }));
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--navy-3)', border: '1px solid var(--border-2)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14,
  };

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>CIPS СТАДИЯ 2–4</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>RFI — Запрос информации</h1>
      <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 28 }}>
        Request for Information · Изучите рынок до тендера · Анонимно для поставщиков
      </div>

      {/* Explainer */}
      <div style={{ marginBottom: 24, padding: '16px 20px', background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.2)', borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 20 }}>◎</span>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Зачем RFI перед тендером?</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
              По стандарту CIPS — перед объявлением тендера нужно изучить рынок. RFI позволяет задать вопросы поставщикам без обязательств и без раскрытия вашей личности. На основе ответов вы формируете точную спецификацию тендера.
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>Мои RFI ({rfiList.length})</div>
        <button className="btn btn-primary" onClick={() => setCreating(!creating)}>
          {creating ? '× Отмена' : '+ Создать RFI'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card" style={{ marginBottom: 24, padding: '24px 28px' }}>
          <div style={{ fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Новый RFI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Тема RFI</label>
              <input style={inputStyle} placeholder="Напр.: Поставщики органической пшеницы" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Категория</label>
                <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Выберите</option>
                  <option>Агро / Зерновые</option><option>Оборудование</option>
                  <option>IT / Электроника</option><option>Стройматериалы</option>
                  <option>Текстиль</option><option>Металлы</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Дедлайн ответов</label>
                <input type="date" style={inputStyle} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 10 }}>Вопросы поставщикам</label>
              {form.questions.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', paddingTop: 12, width: 20 }}>{i + 1}.</span>
                  <input style={inputStyle} placeholder={`Вопрос ${i + 1}...`} value={q} onChange={e => updateQ(i, e.target.value)} />
                </div>
              ))}
              <button onClick={addQ} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px', marginTop: 4 }}>+ Добавить вопрос</button>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => { alert('RFI опубликован! (демо)'); setCreating(false); }}>Опубликовать RFI</button>
            </div>
          </div>
        </div>
      )}

      {/* RFI list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rfiList.map(rfi => (
          <div key={rfi.id} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{rfi.title}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="tag">{rfi.category}</span>
                  <span className="tag">Дедлайн: {rfi.deadline}</span>
                </div>
              </div>
              <span className={`badge ${rfi.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                {rfi.status === 'active' ? 'Активный' : 'Закрыт'}
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Вопросы ({rfi.questions.length}):</div>
              {rfi.questions.map((q, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4, display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{i + 1}.</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: 'var(--text-2)' }}>Ответов: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{rfi.responses}</span></span>
              </div>
              {rfi.status === 'active'
                ? <button className="btn btn-primary" style={{ fontSize: 13, padding: '7px 16px' }}>Смотреть ответы →</button>
                : <button className="btn btn-ghost" style={{ fontSize: 13, padding: '7px 16px' }}>Создать тендер на основе RFI →</button>}
            </div>
          </div>
        ))}
      </div>

      {/* CIPS cycle reference */}
      <div className="card" style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)' }}>CIPS Procurement Cycle — где вы находитесь</div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
          {[['1','Потребность','done'],['2','Рынок','done'],['3','RFI','active'],['4','Преквал.','active'],['5','Тендер','pending'],['6','Оценка','pending'],['7','Переговоры','pending'],['8','Контракт','pending'],['9','Доставка','pending'],['10','KPI','pending'],['11','SRM','pending'],['12','Закрытие','pending'],['13','Активы','pending']].map(([n, l, s]) => (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70, gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: s === 'done' ? 'var(--accent)' : s === 'active' ? 'var(--accent-dim)' : 'var(--navy-3)',
                border: `2px solid ${s === 'done' ? 'var(--accent)' : s === 'active' ? 'var(--accent)' : 'var(--border)'}`,
                color: s === 'done' ? 'var(--navy)' : s === 'active' ? 'var(--accent)' : 'var(--text-3)',
              }}>{s === 'done' ? '✓' : n}</div>
              <div style={{ fontSize: 10, color: s === 'active' ? 'var(--accent)' : 'var(--text-3)', textAlign: 'center' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
