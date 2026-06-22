import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';
import { getAllTenders, getDisplayBuyerName, getTotalOfferCount, getMyOfferForTender, submitOffer } from '../data/tenderStore';

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Активный', cls: 'badge-green' },
    agreement: { label: 'Согласование', cls: 'badge-gold' },
    completed: { label: 'Завершён', cls: 'badge-gray' },
  };
  const s = map[status] || map.active;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function TenderList() {
  const navigate = useNavigate();
  const { canCreateTender, accountType } = useAccountType();
  const currentUser = getCurrentUser(accountType);
  const [filter, setFilter] = useState('all');
  const allTenders = getAllTenders();

  const filtered = filter === 'all' ? allTenders : allTenders.filter(t => t.status === filter);

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ТЕНДЕРЫ</div>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Все тендеры</h1>
        </div>
        {canCreateTender && (
          <button className="btn btn-primary" onClick={() => navigate('/create')}>+ Создать тендер</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all','Все'], ['active','Активные'], ['agreement','Согласование'], ['completed','Завершённые']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: filter === v ? 'var(--accent)' : 'var(--card)',
            color: filter === v ? 'var(--navy)' : 'var(--text-2)',
            border: `1px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(t => {
          const progress = Object.values(t.deadlines).filter(d => d.done).length;
          return (
            <div key={t.id} className="card" onClick={() => navigate(`/tenders/${t.id}`)}
              style={{ cursor: 'pointer', padding: '20px 24px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.3)'; e.currentTarget.style.background = 'rgba(0,212,170,0.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className="tag">{t.category}</span>
                    <span className="tag">{t.incoterms}</span>
                    <span className="tag">📍 {t.destination}</span>
                    <span className="tag">📦 {t.quantity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{getDisplayBuyerName(t, currentUser.id)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={t.status} />
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)', marginTop: 6, fontFamily: 'var(--font-display)' }}>
                    ${t.budget.min.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>— ${t.budget.max.toLocaleString()} {t.budget.currency}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  <span>Прогресс тендера</span>
                  <span>{progress}/5 этапов · {getTotalOfferCount(t)} оферт</span>
                </div>
                <div style={{ height: 4, background: 'var(--navy-3)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${(progress/5)*100}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TenderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canSell, accountType } = useAccountType();
  const currentUser = getCurrentUser(accountType);
  const [, setRefreshTick] = useState(0);
  const tender = getAllTenders().find(t => t.id === id);
  if (!tender) return <div style={{ padding: 40 }}>Тендер не найден</div>;

  const deadlineKeys = ['d1','d2','d3','d4','d5'];
  const progress = deadlineKeys.filter(k => tender.deadlines[k].done).length;
  const totalOffers = getTotalOfferCount(tender);
  const myOffer = canSell ? getMyOfferForTender(tender.id, currentUser.id) : null;
  // Продавец не может подать оферту на собственный тендер (роль «оба»,
  // создавшая тендер как покупатель) — нет конфликта с анонимными демо-
  // тендерами без buyerId, по ним подать оферту может любой продавец.
  const canBidOnThisTender = canSell && tender.status === 'active' && tender.buyerId !== currentUser.id;

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      <button onClick={() => navigate('/tenders')} style={{ background: 'none', color: 'var(--text-2)', fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Назад к тендерам
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>ТЕНДЕР #{tender.id.toUpperCase()}</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>{tender.title}</h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span className="tag">{tender.category}</span>
            <span className="tag">{tender.incoterms} · {tender.destination}</span>
            <span className="tag">📦 {tender.quantity}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{getDisplayBuyerName(tender, currentUser.id)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge status={tender.status} />
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginTop: 8, fontFamily: 'var(--font-display)' }}>
            ${tender.budget.min.toLocaleString()} – ${tender.budget.max.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Deadlines */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>Этапы тендера</div>
          <div style={{ height: 4, background: 'var(--navy-3)', borderRadius: 2, marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${(progress/5)*100}%`, background: 'var(--accent)', borderRadius: 2 }} />
          </div>
          {deadlineKeys.map((k, i) => {
            const d = tender.deadlines[k];
            const isCurrent = !d.done && (i === 0 || tender.deadlines[deadlineKeys[i-1]]?.done);
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: d.done ? 'var(--accent)' : isCurrent ? 'var(--accent-dim)' : 'var(--navy-3)',
                  border: `2px solid ${d.done ? 'var(--accent)' : isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 12, fontWeight: 700,
                  color: d.done ? 'var(--navy)' : isCurrent ? 'var(--accent)' : 'var(--text-3)',
                }}>
                  {d.done ? '✓' : i+1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: d.done ? 'var(--text-2)' : 'var(--text)' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.date}</div>
                </div>
                {isCurrent && <span className="badge badge-gold" style={{ fontSize: 10 }}>Сейчас</span>}
              </div>
            );
          })}
        </div>

        {/* Specs + deposit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 14, fontFamily: 'var(--font-display)' }}>Технические требования</div>
            {tender.specs.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < tender.specs.length-1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.param}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ borderColor: 'rgba(245,166,35,0.2)', background: 'var(--gold-dim)' }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontFamily: 'var(--font-display)' }}>Депозит</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Ставка депозита</span>
              <span style={{ fontWeight: 600, color: 'var(--gold)' }}>{tender.deposit.rate}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Сумма с каждой стороны</span>
              <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 16 }}>${tender.deposit.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offers count + actions */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Получено оферт: <span style={{ color: 'var(--accent)' }}>{totalOffers}</span></div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Все продавцы анонимны до завершения тендера</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/ai-analysis')}>◎ ИИ-анализ оферт</button>
          {tender.status === 'active' && <button className="btn btn-danger">Отменить тендер</button>}
        </div>
      </div>

      {/* Подача оферты продавцом — реализует требование «продавец видит
          все тендеры и подаёт оферту с КП», раньше подачи оферты не
          существовало вообще, только статичный счётчик. */}
      {canBidOnThisTender && (
        <OfferForm tender={tender} currentUser={currentUser} existingOffer={myOffer} onSubmitted={() => setRefreshTick(v => v + 1)} />
      )}

      {/* Winner block */}
      {tender.winner && (
        <div className="card" style={{ marginTop: 20, borderColor: 'rgba(0,212,170,0.3)', background: 'rgba(0,212,170,0.04)' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>✓ Победитель определён</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div><span style={{ color: 'var(--text-2)', fontSize: 13 }}>Страна: </span><span>{tender.winner.flag} {tender.winner.country}</span></div>
            <div><span style={{ color: 'var(--text-2)', fontSize: 13 }}>Сумма товара: </span><span style={{ fontWeight: 600 }}>${tender.winner.totalCost.toLocaleString()}</span></div>
            <div><span style={{ color: 'var(--text-2)', fontSize: 13 }}>Доставка: </span><span>${tender.winner.deliveryCost.toLocaleString()}</span></div>
            <div><span style={{ color: 'var(--text-2)', fontSize: 13 }}>Итого: </span><span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>${(tender.winner.totalCost + tender.winner.deliveryCost).toLocaleString()}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Форма подачи оферты продавца на тендер — цена, срок поставки и
 * свободный текст (КП/примечания, тот же принцип, что свободное поле
 * примечаний продавца в Marketplace.jsx — не всё укладывается в строгие
 * поля). Если у продавца уже есть своя оферта по этому тендеру — форма
 * предзаполняется ей, повторная отправка обновляет, а не дублирует запись.
 */
function OfferForm({ tender, currentUser, existingOffer, onSubmitted }) {
  const [price, setPrice] = useState(existingOffer?.price ?? '');
  const [deliveryDays, setDeliveryDays] = useState(existingOffer?.deliveryDays ?? '');
  const [message, setMessage] = useState(existingOffer?.message ?? '');
  const [justSubmitted, setJustSubmitted] = useState(false);

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--navy-3)', border: '1px solid var(--border-2)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14,
  };
  const labelStyle = { fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 };

  const canSubmit = Number(price) > 0 && Number(deliveryDays) > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitOffer(tender.id, {
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      sellerCountry: currentUser.country,
      sellerFlag: currentUser.flag,
      sellerTrustScore: currentUser.trustScore,
      price: Number(price),
      deliveryDays: Number(deliveryDays),
      message: message.trim(),
    });
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2500);
    onSubmitted?.();
  };

  return (
    <div className="card" style={{ marginTop: 20, borderColor: 'rgba(0,212,170,0.25)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: 'var(--font-display)' }}>
        {existingOffer ? 'Ваша оферта' : 'Подать оферту'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
        {existingOffer
          ? 'Вы уже подали оферту на этот тендер — можно скорректировать и отправить заново.'
          : 'Покупатель увидит вашу оферту анонимно, по рейтингу доверия — без раскрытия названия компании до согласования.'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Цена ({tender.budget.currency})</label>
          <input style={inputStyle} type="number" placeholder="100000" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Срок поставки (дней)</label>
          <input style={inputStyle} type="number" placeholder="14" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>КП / примечания (необязательно)</label>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="Условия оплаты, особенности партии, сертификаты..."
          value={message} onChange={e => setMessage(e.target.value)} />
      </div>
      <div style={{ padding: '8px 12px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 14 }}>
        ⚠ Демо-режим: оферта сохраняется в этой demo-сессии браузера, реальная отправка покупателю не производится.
      </div>
      <button
        className="btn btn-primary"
        disabled={!canSubmit}
        style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        onClick={handleSubmit}>
        {justSubmitted ? '✓ Оферта сохранена' : existingOffer ? 'Обновить оферту' : 'Отправить оферту'}
      </button>
    </div>
  );
}
