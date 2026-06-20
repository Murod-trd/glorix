import { useState } from 'react';
import { products, categories, calcMarketplaceFee } from '../data/marketplace';
import { useAccountType } from '../context/AccountContext';
import { screenForSanctions } from '../utils/sanctionsScreening';

function Stars({ n }) {
  return <span style={{ color: '#F5A623', fontSize: 12 }}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5-Math.round(n))}</span>;
}

function ProductModal({ product, onClose, canBuy }) {
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(product.minOrder);
  const [tab, setTab] = useState('specs');
  const [step, setStep] = useState(0);

  const total = qty * product.price;
  const fee = calcMarketplaceFee(total);
  const buyerFee = +(total * fee / 100).toFixed(2);
  const escrow = +(total + buyerFee).toFixed(2);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: '90%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
        {step === 2 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Заказ размещён</div>
            <div style={{ color: 'var(--text-2)', marginBottom: 16 }}>${escrow.toLocaleString()} зачислено на Escrow · Продавец уведомлён</div>
            <div style={{ display: 'inline-block', padding: '8px 14px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 24 }}>
              ⚠ Демо-режим: реальная оплата не производилась, продавец не уведомлён
            </div>
            <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, padding: 20, textAlign: 'left', maxWidth: 400, margin: '0 auto 24px' }}>
              {['Продавец отгружает товар','Загружает накладную + счёт-фактуру','Деньги мгновенно переходят продавцу','Вы получаете трекинг-номер'].map((s,i) => (
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
            {/* Left */}
            <div style={{ padding: '28px 24px', borderRight: '1px solid var(--border)' }}>
              <div style={{ height: 260, background: 'var(--navy-3)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
                <img src={product.photos[photo]} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              </div>
              {product.photos.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {product.photos.map((p,i) => (
                    <div key={i} onClick={() => setPhoto(i)} style={{ width: 56, height: 56, borderRadius: 6, overflow: 'hidden', border: `2px solid ${photo===i?'var(--accent)':'var(--border)'}`, cursor: 'pointer' }}>
                      <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{product.title}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {product.tags.map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>{t}</span>)}
              </div>
              <div style={{ display: 'flex', gap: 0, background: 'var(--navy-3)', borderRadius: 8, padding: 3, marginBottom: 14 }}>
                {[['specs','Характеристики'],['certs','Сертификаты'],['reviews','Отзывы']].map(([v,l]) => (
                  <button key={v} onClick={() => setTab(v)} style={{ flex: 1, padding: '7px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: tab===v?'var(--accent)':'transparent', color: tab===v?'var(--navy)':'var(--text-2)' }}>{l}</button>
                ))}
              </div>
              {tab === 'specs' && product.specs.map((group,gi) => (
                <div key={gi} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>{group.group.toUpperCase()}</div>
                  {group.items.map((s,i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i<group.items.length-1?'1px solid var(--border)':'none' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.p}</span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              ))}
              {tab === 'certs' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {product.certifications.map(c => (
                    <div key={c} style={{ padding: '8px 14px', background: 'var(--accent-dim)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--accent)' }}>✓ {c}</div>
                  ))}
                </div>
              )}
              {tab === 'reviews' && product.reviewsList.map((r,i) => (
                <div key={i} style={{ marginBottom: 10, padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.company}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.date}</span>
                  </div>
                  <Stars n={r.rating} />
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 5 }}>{r.text}</div>
                </div>
              ))}
            </div>

            {/* Right */}
            <div style={{ padding: '28px 24px' }}>
              <button onClick={onClose} style={{ background: 'none', color: 'var(--text-2)', fontSize: 20, float: 'right', marginTop: -8, cursor: 'pointer' }}>×</button>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                ${product.price} <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 400 }}>/ {product.unit}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>Мин. заказ: {product.minOrder.toLocaleString()} {product.unit}</div>
              <div style={{ padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{product.seller.flag}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{product.seller.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{product.seller.city} · Trust {product.seller.trustScore}%</div>
                  </div>
                </div>
              </div>

              {/* Buyer sees buy form, seller sees info only */}
              {canBuy ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Количество ({product.unit})</label>
                    <input type="number" min={product.minOrder} value={qty} onChange={e => setQty(Math.max(product.minOrder, Number(e.target.value)))}
                      style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 16, fontWeight: 600 }} />
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>В наличии: {product.stock.toLocaleString()} {product.unit}</div>
                  </div>
                  <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-2)' }}>{qty.toLocaleString()} {product.unit} × ${product.price}</span>
                      <span>${total.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-2)' }}>Комиссия GLORIX ({fee}%)</span>
                      <span>${buyerFee}</span>
                    </div>
                    <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>На Escrow</span>
                      <span style={{ color: 'var(--accent)', fontSize: 18, fontFamily: 'var(--font-display)' }}>${escrow.toLocaleString()}</span>
                    </div>
                  </div>
                  {step === 0
                    ? <button className="btn btn-primary" onClick={() => setStep(1)} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}>Купить</button>
                    : <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>Оплачивая, вы соглашаетесь с условиями GLORIX. Деньги на Escrow — продавцу после накладной.</div>
                        <div style={{ padding: '8px 12px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 12 }}>
                          ⚠ Демо-режим: оплата не происходит реально, средства не списываются
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>Назад</button>
                          <button className="btn btn-primary" onClick={() => setStep(2)} style={{ flex: 2, justifyContent: 'center' }}>Оплатить ${escrow.toLocaleString()} →</button>
                        </div>
                      </div>
                  }
                </>
              ) : (
                <div style={{ padding: '16px', background: 'var(--navy-3)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🏭</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Аккаунт продавца</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>Продавцы не могут покупать товары. Переключитесь на аккаунт «Покупатель + Продавец» для обеих функций.</div>
                  <button className="btn btn-ghost" onClick={() => { onClose(); window.location.href='/account-select'; }} style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                    ⇄ Сменить аккаунт
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onClick, canBuy }) {
  const fee = calcMarketplaceFee(product.minOrder * product.price);
  return (
    <div onClick={onClick} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,212,170,0.35)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
      <div style={{ height: 180, background: 'var(--navy-3)', position: 'relative', overflow: 'hidden' }}>
        <img src={product.photo} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          {product.seller.verified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Верифицирован</span>}
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          {product.deliveryDays.min <= 2 && <span className="badge badge-gold" style={{ fontSize: 10 }}>⚡ Срочно</span>}
        </div>
        {product.stockAuto && <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, padding: '2px 7px', background: 'rgba(0,0,0,0.6)', borderRadius: 4, color: 'var(--accent)' }}>◎ ИИ-склад</div>}
      </div>
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{product.title}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stars n={product.rating} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({product.reviews})</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {product.specs[0]?.items.slice(0,2).map((s,i) => <div key={i}><span style={{ color: 'var(--text-3)' }}>{s.p}:</span> {s.v}</div>)}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
            ${product.price} <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>/ {product.unit}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Мин. {product.minOrder.toLocaleString()} {product.unit} · Комиссия {fee}%</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-2)' }}>{product.seller.flag} {product.seller.city}</span>
          <span style={{ color: 'var(--text-2)' }}>🚚 {product.deliveryDays.min}–{product.deliveryDays.max} дн.</span>
        </div>
        <button className="btn btn-primary" style={{ justifyContent: 'center', padding: '9px', fontSize: 13 }}
          onClick={e => { e.stopPropagation(); onClick(); }}>
          {canBuy ? 'Подробнее / Купить' : 'Посмотреть товар'}
        </button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { canBuy, canSell } = useAccountType();
  const [category, setCategory] = useState('all');
  const [delivery, setDelivery] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [viewing, setViewing] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const filtered = products
    .filter(p => {
      const matchCat = category === 'all' || p.category === category;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchDelivery = delivery === 'all' || (delivery === 'urgent' && p.deliveryDays.min <= 2);
      return matchCat && matchSearch && matchDelivery;
    })
    .sort((a,b) => {
      if (sort==='rating') return b.rating - a.rating;
      if (sort==='price_asc') return a.price - b.price;
      if (sort==='price_desc') return b.price - a.price;
      if (sort==='trust') return b.seller.trustScore - a.seller.trustScore;
      return 0;
    });

  return (
    <div className="fade-in" style={{ padding: '28px 32px' }}>
      {viewing && <ProductModal product={viewing} onClose={() => setViewing(null)} canBuy={canBuy} />}
      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>МАРКЕТПЛЕЙС</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            {canSell && !canBuy ? 'Мои товары' : 'Быстрая покупка и продажа'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Оптом · Только юрлица · Escrow · Реальные тех. характеристики</div>
        </div>
        {canSell && (
          <button className="btn btn-primary" onClick={() => setShowAddProduct(true)}>+ Разместить товар</button>
        )}
      </div>

      {/* Seller warning */}
      {!canBuy && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--gold)' }}>
          🏭 Режим продавца · Вы видите витрину маркетплейса, но не можете покупать. Для закупок переключитесь на аккаунт «Покупатель + Продавец».
        </div>
      )}

      <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span>◎</span>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ИИ проверил все товары:</span> санкционные списки, соответствие спецификаций стандартам, верификация поставщиков через госреестры СНГ
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
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
            padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: delivery===v?(v==='urgent'?'var(--gold-dim)':'var(--accent)'):'var(--card)',
            color: delivery===v?(v==='urgent'?'var(--gold)':'var(--navy)'):'var(--text-2)',
            border: `1px solid ${delivery===v?(v==='urgent'?'rgba(245,166,35,0.4)':'var(--accent)'):'var(--border)'}`,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
            background: category===c.id?'var(--accent)':'var(--navy-3)',
            color: category===c.id?'var(--navy)':'var(--text-2)',
            border: `1px solid ${category===c.id?'var(--accent)':'var(--border)'}`,
          }}>{c.icon} {c.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>
        Найдено: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{filtered.length}</span> товаров
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {filtered.map(p => <ProductCard key={p.id} product={p} onClick={() => setViewing(p)} canBuy={canBuy} />)}
      </div>
    </div>
  );
}

// Add Product Modal with AI КП helper
function AddProductModal({ onClose }) {
  const [step, setStep] = useState(0); // 0=form, 1=ai-kp, 2=done
  const [form, setForm] = useState({ title: '', category: '', price: '', unit: 'кг', minOrder: '', stock: '', incoterms: 'DAP', deliveryDays: '3', description: '', specs: [{ p: '', v: '' }] });
  const [kp, setKp] = useState('');
  const [generating, setGenerating] = useState(false);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const set = (k,v) => setForm(f => ({...f, [k]: v}));
  const addSpec = () => set('specs', [...form.specs, {p:'',v:''}]);
  const updateSpec = (i,k,v) => { const s=[...form.specs]; s[i][k]=v; set('specs',s); };

  const specsText = form.specs.map(s => `${s.p} ${s.v}`).join(' ');
  const screening = screenForSanctions(form.title, form.category, form.description, specsText);
  const isBlocked = screening.status === 'blocked';
  const needsReview = screening.status === 'review_required' && !confirmedReview;
  const publishDisabled = isBlocked || needsReview;

  const generateKP = () => {
    setGenerating(true);
    setTimeout(() => {
      setKp(`КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ

От: FerganaTex Export (Продавец GLORIX)
Дата: ${new Date().toLocaleDateString('ru-RU')}
Действительно: 30 дней

ТОВАР: ${form.title || '[Название товара]'}
Категория: ${form.category || '[Категория]'}

ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ:
${form.specs.filter(s=>s.p&&s.v).map(s=>`• ${s.p}: ${s.v}`).join('\n') || '• [Укажите характеристики]'}

КОММЕРЧЕСКИЕ УСЛОВИЯ:
• Цена: ${form.price ? `$${form.price} / ${form.unit}` : '[Цена]'}
• Минимальный заказ: ${form.minOrder ? `${form.minOrder} ${form.unit}` : '[Мин. заказ]'}
• Срок поставки: ${form.deliveryDays || '[Срок]'} рабочих дней
• Инкотермс 2020: ${form.incoterms}
• Условия оплаты: 30% предоплата, 70% по факту отгрузки

НАЛИЧИЕ: ${form.stock ? `${form.stock} ${form.unit} на складе` : '[Наличие]'}

ПРИМЕЧАНИЕ: Технические характеристики сохранены.
При участии в тендере — измените только цену.

Верифицировано GLORIX ✓
____________________    ____________________
Подпись                 Печать`);
      setGenerating(false);
      setStep(1);
    }, 2000);
  };

  const inputStyle = { width: '100%', padding: '9px 13px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 13 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: '90%', maxWidth: 860, maxHeight: '92vh', overflowY: 'auto' }}>
        {step === 2 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Товар размещён!</div>
            <div style={{ color: 'var(--text-2)', marginBottom: 8 }}>ИИ проверяет санкционные списки и спецификации...</div>
            <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 16 }}>◎ Верификация обычно занимает 2–5 минут</div>
            <div style={{ display: 'inline-block', padding: '8px 14px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 24 }}>
              ⚠ Демо-режим: товар не публикуется реально, проверка не выполняется
            </div>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '12px 32px' }}>Вернуться в маркетплейс</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left: form */}
            <div style={{ padding: '28px 24px', borderRight: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17, fontFamily: 'var(--font-display)', marginBottom: 4 }}>Разместить товар</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>ИИ поможет создать КП для тендеров</div>
                </div>
                <button onClick={onClose} style={{ background: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Название товара</label>
                  <input style={inputStyle} placeholder="Напр.: Хлопковая пряжа Ne 30/1" value={form.title} onChange={e => set('title', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Категория</label>
                    <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                      <option value="">Выберите</option>
                      <option>Агро / Продукты</option><option>Текстиль</option><option>Металлы</option>
                      <option>Стройматериалы</option><option>Оборудование</option><option>Химикаты</option><option>Упаковка</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Incoterms</label>
                    <select style={inputStyle} value={form.incoterms} onChange={e => set('incoterms', e.target.value)}>
                      {['EXW','FOB','CIF','DAP','DDP','CFR'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Цена ($)</label>
                    <input style={inputStyle} type="number" placeholder="2.80" value={form.price} onChange={e => set('price', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Единица</label>
                    <select style={inputStyle} value={form.unit} onChange={e => set('unit', e.target.value)}>
                      {['кг','тонна','штука','литр','м²','мешок'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Мин. заказ</label>
                    <input style={inputStyle} type="number" placeholder="500" value={form.minOrder} onChange={e => set('minOrder', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Наличие на складе</label>
                    <input style={inputStyle} type="number" placeholder="45000" value={form.stock} onChange={e => set('stock', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Срок поставки (дн.)</label>
                    <input style={inputStyle} type="number" placeholder="7" value={form.deliveryDays} onChange={e => set('deliveryDays', e.target.value)} />
                  </div>
                </div>

                {/* Specs */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Технические характеристики</label>
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8, padding: '6px 10px', background: 'var(--accent-dim)', borderRadius: 6 }}>
                    ◎ Характеристики сохранятся в КП. При тендере меняете только цену.
                  </div>
                  {form.specs.map((s,i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <input style={inputStyle} placeholder="Параметр (напр.: Влажность)" value={s.p} onChange={e => updateSpec(i,'p',e.target.value)} />
                      <input style={inputStyle} placeholder="Значение (напр.: ≤ 8.5%)" value={s.v} onChange={e => updateSpec(i,'v',e.target.value)} />
                    </div>
                  ))}
                  <button onClick={addSpec} className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}>+ Параметр</button>
                </div>
              </div>

              {isBlocked && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 8, fontSize: 12, color: 'var(--red)' }}>
                  🚫 <strong>Публикация блокирована.</strong> Описание товара содержит признаки категории, запрещённой к торговле на платформе (вооружение, военная техника, ядерные/химические/биологические материалы). Это автоматическая проверка по ключевым словам, а не полная экспортная классификация — если считаете срабатывание ошибочным, измените описание или обратитесь в поддержку.
                </div>
              )}

              {screening.status === 'review_required' && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.4)', borderRadius: 8, fontSize: 12, color: 'var(--gold)' }}>
                  ⚠ <strong>Требуется проверка.</strong> Товар относится к категории двойного назначения (может требовать экспортной лицензии в зависимости от точной спецификации и страны назначения). Это автоматическая проверка по ключевым словам, не замена реальной экспортной классификации (ECCN / EU Dual-Use Annex I) — платформа не утверждает, что товар «чист», только что он требует ручной проверки перед реальной торговлей.
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={confirmedReview} onChange={e => setConfirmedReview(e.target.checked)} />
                    Я проверил(а) товар самостоятельно и подтверждаю, что публикация соответствует применимым экспортным ограничениям
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>Отмена</button>
                <button
                  className="btn btn-primary"
                  onClick={() => setStep(2)}
                  disabled={publishDisabled}
                  style={{ flex: 2, justifyContent: 'center', fontSize: 13, opacity: publishDisabled ? 0.5 : 1, cursor: publishDisabled ? 'not-allowed' : 'pointer' }}
                >
                  Разместить товар →
                </button>
              </div>
            </div>

            {/* Right: AI КП */}
            <div style={{ padding: '28px 24px' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontFamily: 'var(--font-display)' }}>◎ ИИ-помощник: Коммерческое предложение</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
                Нажмите кнопку — ИИ создаст КП на основе ваших данных. При участии в тендере меняете только цену, характеристики остаются.
              </div>

              <button className="btn btn-ghost" onClick={generateKP} disabled={generating} style={{ width: '100%', justifyContent: 'center', marginBottom: 16, borderColor: 'rgba(0,212,170,0.3)', color: 'var(--accent)' }}>
                {generating ? '◎ ИИ генерирует КП...' : '◎ Сгенерировать КП'}
              </button>

              {!kp && !generating && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                  <div style={{ fontSize: 13 }}>Заполните форму слева и нажмите «Сгенерировать КП»</div>
                </div>
              )}

              {kp && (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <span className="badge badge-green">✓ Верифицировано GLORIX</span>
                    <span className="badge badge-blue">◎ ИИ-черновик</span>
                  </div>
                  <pre style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text)', background: 'var(--navy-3)', padding: '18px 22px', borderRadius: 8, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, "Times New Roman", serif', maxHeight: 360, overflowY: 'auto' }}>{kp}</pre>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--gold)', padding: '8px 12px', background: 'var(--gold-dim)', borderRadius: 6, lineHeight: 1.6 }}>
                    ⚠ Это черновик. Проверьте данные, поставьте подпись и печать. В КП нигде не указано что документ создан ИИ.
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => import('../utils/pdfExport').then(m => m.downloadTextAsPdf(kp, 'glorix-kp.pdf'))}>⬇ PDF</button>
                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => import('../utils/docxExport').then(m => m.downloadTextAsDocx(kp, 'glorix-kp.docx'))}>⬇ Word</button>
                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(kp); alert('Скопировано!'); }}>📋 Копировать</button>
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
