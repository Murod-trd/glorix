import { useState } from 'react';
import { products, categories, calcMarketplaceFee } from '../data/marketplace';

function Stars({ n }) {
  return <span style={{ color: '#F5A623', fontSize: 12, letterSpacing: 1 }}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}</span>;
}

function AIBadge({ check }) {
  if (!check.sanctionsOk) return <span className="badge badge-red">⚠ Санкции</span>;
  if (check.qualityRisk === 'high') return <span className="badge badge-gold">⚠ Риск</span>;
  return <span className="badge badge-green" style={{ fontSize: 10 }}>◎ ИИ проверено</span>;
}

function ProductModal({ product, onClose }) {
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(product.minOrder);
  const [tab, setTab] = useState('specs');
  const [buying, setBuying] = useState(false);
  const [done, setDone] = useState(false);

  const total = qty * product.price;
  const fee = calcMarketplaceFee(total);
  const buyerFee = +(total * fee / 100).toFixed(2);
  const escrow = +(total + buyerFee).toFixed(2);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: '90%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>

        {done ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Заказ размещён</div>
            <div style={{ color: 'var(--text-2)', marginBottom: 24 }}>${escrow.toLocaleString()} зачислено на Escrow · Продавец уведомлён</div>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: 20, textAlign: 'left', maxWidth: 400, margin: '0 auto 24px' }}>
              {['Продавец отгружает товар', 'Загружает накладную + счёт-фактуру', 'Деньги мгновенно переходят продавцу', 'Вы получаете трекинг-номер'].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{i+1}.</span>
                  <span style={{ color: 'var(--text-2)' }}>{s}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '12px 32px' }}>Отслеживать заказ</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px' }}>
            {/* Left: product info */}
            <div style={{ padding: '28px 24px', borderRight: '1px solid var(--border)' }}>
              {/* Photos */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ width: '100%', height: 280, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'var(--navy-3)' }}>
                  <img src={product.photos[photo]} alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                </div>
                {product.photos.length > 1 && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {product.photos.map((p, i) => (
                      <div key={i} onClick={() => setPhoto(i)} style={{ width: 60, height: 60, borderRadius: 6, overflow: 'hidden', border: `2px solid ${photo === i ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', background: 'var(--navy-3)' }}>
                        <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', marginBottom: 6 }}>{product.title}</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <AIBadge check={product.aiCheck} />
                {product.tags.map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>{t}</span>)}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 8, padding: 3, marginBottom: 16 }}>
                {[['specs','Характеристики'],['certs','Сертификаты'],['reviews','Отзывы']].map(([v,l]) => (
                  <button key={v} onClick={() => setTab(v)} style={{
                    flex: 1, padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: tab === v ? 'var(--accent)' : 'transparent',
                    color: tab === v ? 'var(--navy)' : 'var(--text-2)',
                  }}>{l}</button>
                ))}
              </div>

              {tab === 'specs' && (
                <div>
                  {product.specs.map((group, gi) => (
                    <div key={gi} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{group.group.toUpperCase()}</div>
                      {group.items.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < group.items.length-1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.p}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'certs' && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Действующие сертификаты и стандарты:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {product.certifications.map(c => (
                      <div key={c} style={{ padding: '8px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>✓ {c}</div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)' }}>
                    ◎ ИИ верифицировал соответствие спецификаций заявленным стандартам
                  </div>
                </div>
              )}

              {tab === 'reviews' && (
                <div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{product.rating}</div>
                      <Stars n={product.rating} />
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{product.reviews} отзывов</div>
                    </div>
                  </div>
                  {product.reviewsList.map((r, i) => (
                    <div key={i} style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.company}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.date}</span>
                      </div>
                      <Stars n={r.rating} />
                      <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>{r.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: buy panel */}
            <div style={{ padding: '28px 24px' }}>
              <button onClick={onClose} style={{ background: 'none', color: 'var(--text-2)', fontSize: 20, float: 'right', marginTop: -8 }}>×</button>

              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                ${product.price.toLocaleString()} <span style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 400 }}>/ {product.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>Мин. заказ: {product.minOrder.toLocaleString()} {product.unit}</div>

              {/* Seller */}
              <div style={{ padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{product.seller.flag}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{product.seller.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{product.seller.city} · {product.seller.totalDeals} сделок</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{product.seller.trustScore}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>доверие</div>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Количество ({product.unit})</label>
                <input type="number" min={product.minOrder} step={product.minOrder} value={qty}
                  onChange={e => setQty(Math.max(product.minOrder, Number(e.target.value)))}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 16, fontWeight: 600 }} />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>В наличии: {product.stock.toLocaleString()} {product.unit}</div>
              </div>

              {/* Incoterms */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Incoterms 2020</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {product.incoterms.map(t => (
                    <span key={t} style={{ padding: '5px 10px', background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Delivery */}
              <div style={{ padding: '10px 14px', background: product.deliveryDays.min <= 2 ? 'var(--accent-dim)' : 'var(--navy-3)', border: `1px solid ${product.deliveryDays.min <= 2 ? 'rgba(0,212,170,0.2)' : 'var(--border)'}`, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {product.deliveryDays.min <= 2 ? '⚡ ' : '🚚 '}
                Доставка: {product.deliveryDays.min === product.deliveryDays.max ? `${product.deliveryDays.min} дн.` : `${product.deliveryDays.min}–${product.deliveryDays.max} дн.`}
              </div>

              {/* Price breakdown */}
              <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-2)' }}>{qty.toLocaleString()} {product.unit} × ${product.price}</span>
                  <span>${total.toLocaleString(undefined, {maximumFractionDigits:2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-2)' }}>Комиссия GLORIX ({fee}%)</span>
                  <span>${buyerFee.toLocaleString()}</span>
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>На Escrow</span>
                  <span style={{ color: 'var(--accent)', fontSize: 18, fontFamily: 'var(--font-display)' }}>${escrow.toLocaleString()}</span>
                </div>
              </div>

              {!buying ? (
                <button className="btn btn-primary" onClick={() => setBuying(true)} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}>
                  Купить
                </button>
              ) : (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>
                    Оплачивая, вы соглашаетесь с условиями GLORIX. Деньги на Escrow — продавцу после загрузки накладной.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setBuying(false)} style={{ flex: 1, justifyContent: 'center' }}>Назад</button>
                    <button className="btn btn-primary" onClick={() => setDone(true)} style={{ flex: 2, justifyContent: 'center' }}>
                      Оплатить ${escrow.toLocaleString()} →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onClick }) {
  const minTotal = product.minOrder * product.price;
  const fee = calcMarketplaceFee(minTotal);

  return (
    <div onClick={onClick} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,170,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>

      {/* Photo */}
      <div style={{ height: 180, background: 'var(--navy-3)', position: 'relative', overflow: 'hidden' }}>
        <img src={product.photo} alt={product.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
          onError={e => { e.target.style.display = 'none'; }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.target.style.transform = 'none'} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span className={`badge ${product.seller.verified ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
            {product.seller.verified ? '✓ Верифицирован' : 'Не верифицирован'}
          </span>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          {product.deliveryDays.min <= 2 && <span className="badge badge-gold" style={{ fontSize: 10 }}>⚡ Срочно</span>}
        </div>
        {product.stockAuto && (
          <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, padding: '2px 7px', background: 'rgba(0,0,0,0.6)', borderRadius: 4, color: 'var(--accent)' }}>◎ ИИ-склад</div>
        )}
      </div>

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{product.title}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stars n={product.rating} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({product.reviews})</span>
        </div>

        {/* Top specs preview */}
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {product.specs[0]?.items.slice(0, 2).map((s, i) => (
            <div key={i}><span style={{ color: 'var(--text-3)' }}>{s.p}:</span> {s.v}</div>
          ))}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
            ${product.price} <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>/ {product.unit}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Мин. {product.minOrder.toLocaleString()} {product.unit} · Комиссия {fee}%
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: 'var(--text-2)' }}>{product.seller.flag} {product.seller.city}</span>
          <span style={{ color: 'var(--text-2)' }}>🚚 {product.deliveryDays.min}–{product.deliveryDays.max} дн.</span>
        </div>

        <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '9px', fontSize: 13 }}
          onClick={e => { e.stopPropagation(); onClick(); }}>
          Подробнее / Купить
        </button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [category, setCategory] = useState('all');
  const [delivery, setDelivery] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [viewing, setViewing] = useState(null);

  const filtered = products
    .filter(p => {
      const matchCat = category === 'all' || p.category === category;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchDelivery = delivery === 'all' || (delivery === 'urgent' && p.deliveryDays.min <= 2);
      return matchCat && matchSearch && matchDelivery;
    })
    .sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'trust') return b.seller.trustScore - a.seller.trustScore;
      return 0;
    });

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {viewing && <ProductModal product={viewing} onClose={() => setViewing(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>МАРКЕТПЛЕЙС</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Быстрая покупка и продажа</h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Оптом · Только юрлица · Escrow · Реальные тех. характеристики</div>
        </div>
        <button className="btn btn-ghost">+ Разместить товар</button>
      </div>

      {/* ИИ баннер */}
      <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span>◎</span>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ИИ проверил все товары:</span> санкционные списки, соответствие спецификаций стандартам, верификация поставщиков через госреестры СНГ
        </span>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Поиск товара, характеристики..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 14, flex: 1, minWidth: 200 }} />

        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 }}>
          <option value="rating">По рейтингу</option>
          <option value="trust">По доверию</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>

        {[['all','Все сроки'],['urgent','⚡ Срочно (1–2 дня)']].map(([v,l]) => (
          <button key={v} onClick={() => setDelivery(v)} style={{
            padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: delivery === v ? (v === 'urgent' ? 'var(--gold-dim)' : 'var(--accent)') : 'var(--card)',
            color: delivery === v ? (v === 'urgent' ? 'var(--gold)' : 'var(--navy)') : 'var(--text-2)',
            border: `1px solid ${delivery === v ? (v === 'urgent' ? 'rgba(245,166,35,0.4)' : 'var(--accent)') : 'var(--border)'}`,
          }}>{l}</button>
        ))}
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: category === c.id ? 'var(--accent)' : 'var(--navy-3)',
            color: category === c.id ? 'var(--navy)' : 'var(--text-2)',
            border: `1px solid ${category === c.id ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all 0.15s',
          }}>{c.icon} {c.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>
        Найдено: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{filtered.length}</span> товаров
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filtered.map(p => <ProductCard key={p.id} product={p} onClick={() => setViewing(p)} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Товары не найдены</div>
          <div style={{ fontSize: 14 }}>Попробуйте другую категорию или уберите фильтр</div>
        </div>
      )}
    </div>
  );
}
