import { useState } from 'react';
import { products, categories, calcMarketplaceFee } from '../data/marketplace';

function Stars({ n }) {
  return <span style={{ color: '#F5A623', fontSize: 12 }}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}</span>;
}

function TrustDot({ score }) {
  const color = score >= 70 ? 'var(--accent)' : score >= 30 ? 'var(--gold)' : 'var(--red)';
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 4 }} />;
}

function BuyModal({ product, onClose }) {
  const [qty, setQty] = useState(product.minOrder);
  const [delivery, setDelivery] = useState('standard');
  const [step, setStep] = useState(0); // 0=form, 1=confirm, 2=success

  const total = qty * product.price;
  const fee = calcMarketplaceFee(total);
  const buyerFee = +(total * fee / 100).toFixed(2);
  const sellerFee = buyerFee;
  const escrow = +(total + buyerFee).toFixed(2);

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--navy-3)', border: '1px solid var(--border-2)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--navy-2)', border: '1px solid var(--border-2)',
        borderRadius: 16, padding: '28px 32px', width: 520, maxHeight: '90vh', overflowY: 'auto',
      }}>
        {step === 2 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>
              Заказ размещён
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
              ${escrow.toLocaleString()} зачислено на Escrow счёт GLORIX.<br />
              Продавец уведомлён и обязан отгрузить товар немедленно.
            </div>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 6 }}>Что дальше:</div>
              <div style={{ fontSize: 13, lineHeight: 2 }}>
                1. Продавец отгружает товар<br />
                2. Загружает накладную и счёт-фактуру<br />
                3. Деньги с Escrow мгновенно переходят продавцу<br />
                4. Вы получаете товар и трекинг-номер
              </div>
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
              Отслеживать заказ
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{product.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {product.seller.flag} {product.seller.city} · Рейтинг {product.seller.trustScore}%
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', color: 'var(--text-2)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                    Количество (мин. {product.minOrder} {product.unit})
                  </label>
                  <input type="number" style={inputStyle} min={product.minOrder} step={product.minOrder}
                    value={qty} onChange={e => setQty(Math.max(product.minOrder, Number(e.target.value)))} />
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                    В наличии: {product.stock.toLocaleString()} {product.unit}
                    {product.stockAuto && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>◎ ИИ-мониторинг</span>}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Срок доставки</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['urgent','Срочно (сегодня/завтра)'],['standard',`${product.deliveryDays.min}–${product.deliveryDays.max} дня`]].map(([v,l]) => (
                      <button key={v} onClick={() => setDelivery(v)} style={{
                        flex: 1, padding: '10px', borderRadius: 8, fontSize: 13,
                        background: delivery === v ? 'var(--accent-dim)' : 'var(--navy-3)',
                        border: `1px solid ${delivery === v ? 'rgba(0,212,170,0.4)' : 'var(--border)'}`,
                        color: delivery === v ? 'var(--accent)' : 'var(--text-2)',
                      }}>{l}</button>
                    ))}
                  </div>
                  {delivery === 'urgent' && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', padding: '8px 12px', background: 'var(--accent-dim)', borderRadius: 6 }}>
                      ◎ ИИ показывает только продавцов которые гарантированно доставят сегодня или завтра
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-2)' }}>Стоимость товара</span>
                    <span>${total.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-2)' }}>Комиссия платформы ({fee}%)</span>
                    <span>${buyerFee.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>На Escrow счёт</span>
                    <span style={{ color: 'var(--accent)', fontSize: 18, fontFamily: 'var(--font-display)' }}>${escrow.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                    Деньги переходят продавцу только после загрузки накладной и счёт-фактуры
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => setStep(1)} style={{ justifyContent: 'center', padding: '13px' }}>
                  Перейти к оплате →
                </button>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 10, padding: '16px' }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Подтверждение заказа</div>
                  {[
                    ['Товар', product.title],
                    ['Количество', `${qty.toLocaleString()} ${product.unit}`],
                    ['Цена за единицу', `$${product.price} / ${product.unit}`],
                    ['Доставка', delivery === 'urgent' ? 'Срочно (сегодня/завтра)' : `${product.deliveryDays.min}–${product.deliveryDays.max} дня`],
                    ['Комиссия GLORIX', `${fee}% = $${buyerFee}`],
                    ['Итого к оплате', `$${escrow.toLocaleString()}`],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                      <span style={{ color: 'var(--text-2)' }}>{k}</span>
                      <span style={{ fontWeight: k === 'Итого к оплате' ? 700 : 400, color: k === 'Итого к оплате' ? 'var(--gold)' : 'var(--text)' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Оплачивая заказ вы соглашаетесь с условиями договора платформы GLORIX. Продавец обязан отгрузить товар немедленно после поступления средств на Escrow.
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>← Назад</button>
                  <button className="btn btn-primary" onClick={() => setStep(2)} style={{ flex: 2, justifyContent: 'center' }}>
                    Оплатить ${escrow.toLocaleString()} →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onBuy }) {
  const total1 = product.minOrder * product.price;
  const fee = calcMarketplaceFee(total1);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 32 }}>{product.images[0]}</div>
        <div style={{ textAlign: 'right' }}>
          {product.seller.verified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Верифицирован</span>}
          {product.stockAuto && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>◎ ИИ-склад</div>}
        </div>
      </div>

      {/* Title */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>{product.title}</div>
        <span className="tag" style={{ fontSize: 11 }}>{product.category}</span>
      </div>

      {/* Price */}
      <div style={{ background: 'var(--navy-3)', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
          ${product.price} <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 400 }}>/ {product.unit}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
          Мин. заказ: {product.minOrder.toLocaleString()} {product.unit} · от ${(product.minOrder * product.price).toLocaleString(undefined,{maximumFractionDigits:0})}
        </div>
      </div>

      {/* Seller */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13 }}>
          <TrustDot score={product.seller.trustScore} />
          {product.seller.flag} {product.seller.city}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          <Stars n={product.rating} /> ({product.reviews})
        </div>
      </div>

      {/* Delivery */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text-2)' }}>Доставка</span>
        <span style={{ color: product.deliveryDays.min <= 1 ? 'var(--accent)' : 'var(--text)' }}>
          {product.deliveryDays.min === product.deliveryDays.max
            ? `${product.deliveryDays.min} д.`
            : `${product.deliveryDays.min}–${product.deliveryDays.max} д.`}
          {product.deliveryDays.min <= 1 && ' ⚡'}
        </span>
        <span style={{ color: 'var(--text-2)' }}>Комиссия: {fee}%</span>
      </div>

      {/* Specs preview */}
      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
        {product.specs.slice(0,2).map((s,i) => (
          <span key={i}>{s.p}: <span style={{ color: 'var(--text)' }}>{s.v}</span>{i < 1 ? ' · ' : ''}</span>
        ))}
      </div>

      <button className="btn btn-primary" onClick={() => onBuy(product)} style={{ justifyContent: 'center', marginTop: 'auto' }}>
        Купить
      </button>
    </div>
  );
}

export default function Marketplace() {
  const [category, setCategory] = useState('Все категории');
  const [delivery, setDelivery] = useState('all');
  const [search, setSearch] = useState('');
  const [buying, setBuying] = useState(null);

  const filtered = products.filter(p => {
    const matchCat = category === 'Все категории' || p.category === category;
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchDelivery = delivery === 'all' || (delivery === 'urgent' && p.deliveryDays.min <= 1);
    return matchCat && matchSearch && matchDelivery;
  });

  return (
    <div className="fade-in" style={{ padding: '32px 36px' }}>
      {buying && <BuyModal product={buying} onClose={() => setBuying(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, letterSpacing: 1 }}>МАРКЕТПЛЕЙС</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Быстрая покупка и продажа</h1>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Оптовые сделки для юрлиц · Оплата через Escrow · Только верифицированные компании</div>
        </div>
        <button className="btn btn-ghost">+ Разместить товар</button>
      </div>

      {/* AI urgent banner */}
      <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 20 }}>◎</span>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ИИ-фильтр срочной доставки:</span>{' '}
          включите режим «Срочно» — система покажет только продавцов, которые гарантированно доставят товар сегодня или завтра исходя из геолокации и наличия на складе.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍 Поиск товара..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '10px 14px', background: 'var(--navy-3)',
            border: '1px solid var(--border-2)', borderRadius: 8,
            color: 'var(--text)', fontSize: 14, width: 220,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','Все сроки'],['urgent','⚡ Срочно (сегодня/завтра)']].map(([v,l]) => (
            <button key={v} onClick={() => setDelivery(v)} style={{
              padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: delivery === v ? (v === 'urgent' ? 'var(--gold-dim)' : 'var(--accent)') : 'var(--card)',
              color: delivery === v ? (v === 'urgent' ? 'var(--gold)' : 'var(--navy)') : 'var(--text-2)',
              border: `1px solid ${delivery === v ? (v === 'urgent' ? 'rgba(245,166,35,0.4)' : 'var(--accent)') : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            background: category === c ? 'var(--accent)' : 'var(--navy-3)',
            color: category === c ? 'var(--navy)' : 'var(--text-2)',
            border: `1px solid ${category === c ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all 0.15s',
          }}>{c}</button>
        ))}
      </div>

      {/* Results count */}
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
        Найдено: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{filtered.length}</span> товаров
        {delivery === 'urgent' && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>⚡ Только срочная доставка</span>}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(p => <ProductCard key={p.id} product={p} onBuy={setBuying} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Товары не найдены</div>
          <div style={{ fontSize: 14 }}>Попробуйте другую категорию или уберите фильтр срочной доставки</div>
        </div>
      )}

      {/* Commission info */}
      <div className="card" style={{ marginTop: 28 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontFamily: 'var(--font-display)' }}>Комиссия маркетплейса</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[['До $5 000','1.5%'],['$5 000 – $50 000','0.5% – 1.5% (ИИ)'],['От $50 000','0.5%']].map(([r,f]) => (
            <div key={r} style={{ flex: 1, minWidth: 160, background: 'var(--navy-3)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{r}</div>
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{f}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
          Комиссия взимается с покупателя и продавца в равных долях. Деньги поступают на Escrow счёт GLORIX и переводятся продавцу после загрузки накладной и счёт-фактуры.
        </div>
      </div>
    </div>
  );
}
