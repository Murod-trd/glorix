import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calcDeposit } from '../data/mock';
import { useAccountType } from '../context/AccountContext';
import { screenForSanctions } from '../utils/sanctionsScreening';

const steps = ['Основное', 'Спецификации', 'Логистика', 'Депозит'];

export default function CreateTender() {
  const navigate = useNavigate();
  const { canBuy } = useAccountType();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '', category: '', quantity: '', unit: 'тонн',
    budgetMin: '', budgetMax: '', currency: 'USD',
    incoterms: 'CIF', destination: '',
    specs: [{ param: '', value: '' }],
    d1: '', d2: '', d3: '', d4: '', d5: '',
    contractPref: 'own', acceptTemplate: true,
  });
  const [confirmedReview, setConfirmedReview] = useState(false);

  if (!canBuy) {
    return (
      <div className="fade-in" style={{ padding: '32px 36px' }}>
        <div className="card" style={{ padding: 24, maxWidth: 480 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Недоступно для вашего типа аккаунта</div>
          <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 16 }}>
            Создание тендеров доступно только покупателям. Ваш текущий тип аккаунта — продавец.
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/tenders')}>← К списку тендеров</button>
        </div>
      </div>
    );
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const budget = Number(form.budgetMax) || Number(form.budgetMin) || 0;
  const dep = budget > 0 ? calcDeposit(budget) : null;
  const specsText = form.specs.map(s => `${s.param} ${s.value}`).join(' ');
  const screening = screenForSanctions(form.title, form.category, specsText);
  const isBlocked = screening.status === 'blocked';
  const needsReview = screening.status === 'review_required' && !confirmedReview;
  const publishDisabled = isBlocked || needsReview;

  const addSpec = () => set('specs', [...form.specs, { param: '', value: '' }]);
  const updateSpec = (i, k, v) => {
    const specs = [...form.specs];
    specs[i][k] = v;
    set('specs', specs);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--navy-3)', border: '1px solid var(--border-2)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14,
  };
  const labelStyle = { fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 };

  return (
    <div className="fade-in" style={{ padding: '32px 36px', maxWidth: 760 }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>НОВЫЙ ТЕНДЕР</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 28 }}>Создать тендер</h1>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--navy-3)', borderRadius: 10, padding: 4 }}>
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: step === i ? 'var(--accent)' : 'transparent',
            color: step === i ? 'var(--navy)' : i < step ? 'var(--accent)' : 'var(--text-2)',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {i < step ? '✓ ' : ''}{s}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '28px 32px' }}>
        {/* Step 0: Basic */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Название тендера</label>
              <input style={inputStyle} placeholder="Напр.: Поставка пшеницы 3-го класса" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Категория</label>
                <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Выберите категорию</option>
                  <option>Агро / Зерновые</option>
                  <option>Оборудование</option>
                  <option>IT / Электроника</option>
                  <option>Строительные материалы</option>
                  <option>Химикаты</option>
                  <option>Текстиль</option>
                  <option>Металлы</option>
                  <option>Другое</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Количество</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 2 }} placeholder="500" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                  <select style={{ ...inputStyle, flex: 1 }} value={form.unit} onChange={e => set('unit', e.target.value)}>
                    <option>тонн</option><option>штук</option><option>кг</option><option>литров</option><option>м²</option><option>единиц</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Бюджет</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="от 50 000" type="number" value={form.budgetMin} onChange={e => set('budgetMin', e.target.value)} />
                <span style={{ color: 'var(--text-2)' }}>—</span>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="до 120 000" type="number" value={form.budgetMax} onChange={e => set('budgetMax', e.target.value)} />
                <select style={{ ...inputStyle, width: 80, flex: 'none' }} value={form.currency} onChange={e => set('currency', e.target.value)}>
                  <option>USD</option><option>EUR</option><option>UZS</option><option>KZT</option><option>RUB</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Specs */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20, padding: '12px 14px', background: 'var(--accent-dim)', borderRadius: 8, border: '1px solid rgba(0,212,170,0.2)' }}>
              ◎ Укажите технические требования. Продавцы смогут предложить аналог равного или более высокого качества — ИИ сравнит характеристики автоматически.
            </div>
            {form.specs.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
                <input style={inputStyle} placeholder="Параметр (напр.: Влажность)" value={s.param} onChange={e => updateSpec(i, 'param', e.target.value)} />
                <input style={inputStyle} placeholder="Значение (напр.: не более 14%)" value={s.value} onChange={e => updateSpec(i, 'value', e.target.value)} />
              </div>
            ))}
            <button onClick={addSpec} className="btn btn-ghost" style={{ marginTop: 8, fontSize: 13 }}>+ Добавить параметр</button>
          </div>
        )}

        {/* Step 2: Logistics */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Incoterms 2020</label>
                <select style={inputStyle} value={form.incoterms} onChange={e => set('incoterms', e.target.value)}>
                  {['EXW','FOB','CIF','CFR','DAP','DDP','FCA','CPT','CIP'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Пункт назначения</label>
                <input style={inputStyle} placeholder="Ташкент, UZ" value={form.destination} onChange={e => set('destination', e.target.value)} />
              </div>
            </div>
            <div className="divider" />
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Дедлайны (5 этапов)</div>
            {[['d1','Тех. требования покупателя'],['d2','Оферты продавцов'],['d3','Согласование спецификаций'],['d4','Финальные цены + доставка'],['d5','Результат тендера']].map(([k,l]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>{l}</span>
                <input type="date" style={{ ...inputStyle, width: 180 }} value={form[k]} onChange={e => set(k, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Deposit */}
        {step === 3 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)', fontSize: 18 }}>Депозит по тендеру</div>
            {dep ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '20px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Сумма тендера</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)' }}>${budget.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 10, padding: '20px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Ставка депозита</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{dep.rate}%</div>
                </div>
                <div style={{ background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 10, padding: '20px', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>Ваш депозит (замораживается на счёте GLORIX)</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>${dep.deposit.toLocaleString()}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>Возвращается после успешного завершения сделки</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', background: 'var(--navy-3)', borderRadius: 10, color: 'var(--text-2)', fontSize: 14, marginBottom: 24 }}>
                Укажите бюджет на шаге «Основное» для расчёта депозита
              </div>
            )}

            <div style={{ padding: '14px 16px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              Нажимая «Опубликовать тендер», вы соглашаетесь с условиями оферты платформы GLORIX, включая депозитные обязательства и рейтинговую систему доверия.
            </div>

            <div style={{ padding: '10px 16px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12.5, color: '#B48214', marginBottom: 20 }}>
              ⚠ Демо-режим: тендер не будет опубликован реально и не виден другим пользователям. Депозит не списывается, оплата не происходит.
            </div>

            {isBlocked && (
              <div style={{ marginTop: -4, marginBottom: 20, padding: '12px 14px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                🚫 <strong>Публикация блокирована.</strong> Описание тендера содержит признаки категории, запрещённой к торговле на платформе (вооружение, военная техника, ядерные/химические/биологические материалы). Это автоматическая проверка по ключевым словам, а не полная экспортная классификация — если считаете срабатывание ошибочным, измените описание или обратитесь в поддержку.
              </div>
            )}

            {screening.status === 'review_required' && (
              <div style={{ marginTop: -4, marginBottom: 20, padding: '12px 14px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: 8, fontSize: 12, color: 'var(--gold)' }}>
                ⚠ <strong>Требуется проверка.</strong> Товар тендера относится к категории двойного назначения (может требовать экспортной лицензии в зависимости от точной спецификации и страны назначения). Это автоматическая проверка по ключевым словам, не замена реальной экспортной классификации (ECCN / EU Dual-Use Annex I) — платформа не утверждает, что товар «чист», только что он требует ручной проверки перед реальной торговлей.
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={confirmedReview} onChange={e => setConfirmedReview(e.target.checked)} />
                  Я проверил(а) товар самостоятельно и подтверждаю, что публикация соответствует применимым экспортным ограничениям
                </label>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, opacity: publishDisabled ? 0.5 : 1, cursor: publishDisabled ? 'not-allowed' : 'pointer' }}
              disabled={publishDisabled}
              onClick={() => { alert('Тендер опубликован! (демо)'); navigate('/tenders'); }}>
              Опубликовать тендер
            </button>
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => step > 0 ? setStep(s => s-1) : navigate('/tenders')} style={{ fontSize: 13 }}>
              {step === 0 ? 'Отмена' : '← Назад'}
            </button>
            <button className="btn btn-primary" onClick={() => setStep(s => s+1)} style={{ fontSize: 13 }}>
              Далее →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
