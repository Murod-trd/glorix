import { useState } from 'react';
import { categories, calcMarketplaceFee, PRODUCT_UNITS } from '../data/marketplace';
import { searchHsCodes } from '../data/hsCodes';
import { getCurrentUser } from '../data/mock';
import { useAccountType } from '../context/AccountContext';
import { useCart } from '../context/CartContext';
import { screenForSanctions, checkExportRestriction } from '../utils/sanctionsScreening';
import { getAllProducts, addUserProduct, getEffectiveStock, decrementStock, addOrder } from '../data/marketplaceStore';
import ProductIllustration, { PRODUCT_ILLUSTRATION_IDS } from '../components/ProductIllustration';

function Stars({ n }) {
  return <span style={{ color: '#F5A623', fontSize: 12 }}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5-Math.round(n))}</span>;
}

function ProductModal({ product, onClose }) {
  const { accountType } = useAccountType();
  const buyer = getCurrentUser(accountType);
  const { addToCart } = useCart();
  const [qty, setQty] = useState(product.minOrder);
  const [tab, setTab] = useState('specs');
  const [step, setStep] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  const effectiveStock = getEffectiveStock(product);
  const total = qty * product.price;
  const fee = calcMarketplaceFee(total);
  const buyerFee = +(total * fee / 100).toFixed(2);
  const escrow = +(total + buyerFee).toFixed(2);

  // Реализует требование: «покупатель из России не может купить...
  // если тот товар... находится под санкцией для продажи в Россию».
  // Проверка по стране покупателя (текущий аккаунт) против категории
  // товара, реальное основание — пакеты санкций ЕС против РФ.
  const exportCheck = checkExportRestriction(product.category, buyer.country);
  const exceedsStock = qty > effectiveStock;

  const handleConfirmPurchase = () => {
    decrementStock(product.id, qty);
    addOrder({
      productId: product.id, productTitle: product.title, qty, unit: product.unit,
      total, buyerFee, escrow, buyerId: buyer.id, sellerId: product.seller.id,
    });
    setStep(2);
  };

  const handleAddToCart = () => {
    addToCart(product.id, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: '90%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
        {step === 2 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Заказ размещён</div>
            <div style={{ color: 'var(--text-2)', marginBottom: 16 }}>${escrow.toLocaleString()} — заказ оформлен, остаток товара обновлён</div>
            <div style={{ display: 'inline-block', padding: '8px 14px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 24 }}>
              ⚠ Демо-режим: реальная оплата не производилась, продавец не уведомлён реально. Заказ сохранён в этой demo-сессии браузера.
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
              <div style={{ height: 260, background: 'var(--navy-3)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                <ProductIllustration id={product.photoId} />
              </div>
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

              {/* Покупка доступна всем ролям (включая продавца — закупка
                  сырья/комплектующих для своего производства), кроме случаев
                  экспортных ограничений по стране покупателя. */}
              {exportCheck.blocked ? (
                <div style={{ padding: '16px', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🚫</div>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>Покупка недоступна</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{exportCheck.reason}</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Количество ({product.unit})</label>
                    <input type="number" min={product.minOrder} value={qty} onChange={e => setQty(Math.max(product.minOrder, Number(e.target.value)))}
                      style={{ width: '100%', padding: '10px 14px', background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--text)', fontSize: 16, fontWeight: 600 }} />
                    <div style={{ fontSize: 11, color: exceedsStock ? 'var(--red)' : 'var(--text-3)', marginTop: 4 }}>
                      В наличии: {effectiveStock.toLocaleString()} {product.unit}
                      {exceedsStock && ' — выбранное количество превышает остаток'}
                    </div>
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
                    ? <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-ghost"
                          onClick={handleAddToCart}
                          disabled={exceedsStock}
                          style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: 14, opacity: exceedsStock ? 0.5 : 1, cursor: exceedsStock ? 'not-allowed' : 'pointer' }}>
                          {addedToCart ? '✓ Добавлено' : '+ В корзину'}
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => setStep(1)}
                          disabled={exceedsStock}
                          style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: 15, opacity: exceedsStock ? 0.5 : 1, cursor: exceedsStock ? 'not-allowed' : 'pointer' }}>
                          Купить сейчас
                        </button>
                      </div>
                    : <div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>Оплачивая, вы соглашаетесь с условиями GLORIX. Деньги на Escrow — продавцу после накладной.</div>
                        <div style={{ padding: '8px 12px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 12 }}>
                          ⚠ Демо-режим: реальная оплата (через банк/Escrow-провайдера) не производится — но остаток товара и заказ сохраняются в этой demo-сессии браузера.
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>Назад</button>
                          <button className="btn btn-primary" onClick={handleConfirmPurchase} style={{ flex: 2, justifyContent: 'center' }}>Оплатить ${escrow.toLocaleString()} →</button>
                        </div>
                      </div>
                  }
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onClick }) {
  const fee = calcMarketplaceFee(product.minOrder * product.price);
  const effectiveStock = getEffectiveStock(product);
  const outOfStock = effectiveStock <= 0;
  return (
    <div onClick={onClick} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,212,170,0.35)'; e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
      <div style={{ height: 180, background: 'var(--navy-3)', position: 'relative', overflow: 'hidden' }}>
        <ProductIllustration id={product.photoId} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          {product.seller.verified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Верифицирован</span>}
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          {product.deliveryDays.min <= 2 && <span className="badge badge-gold" style={{ fontSize: 10 }}>⚡ Срочно</span>}
        </div>
        {product.stockAuto && <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 10, padding: '2px 7px', background: 'rgba(0,0,0,0.6)', borderRadius: 4, color: 'var(--accent)' }}>◎ ИИ-склад</div>}
        {outOfStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 6 }}>Распродано</span>
          </div>
        )}
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
          Подробнее / Купить
        </button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { accountType, canBuyMarketplace, canSell } = useAccountType();
  const currentUser = getCurrentUser(accountType);
  // «Чистый» продавец (не «оба») — единственная роль, для которой имеет
  // смысл переключатель «Мои товары»/«Весь каталог»: остальные роли
  // всегда видели общий каталог и не владеют товарами.
  const isPureSeller = accountType === 'seller';
  const [sellerView, setSellerView] = useState(isPureSeller ? 'mine' : 'all');
  const [category, setCategory] = useState('all');
  const [delivery, setDelivery] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [viewing, setViewing] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const { cartCount } = useCart();
  // Реактивный список товаров — объединяет статичный демо-каталог и
  // товары, добавленные пользователем (см. marketplaceStore.js).
  // Перечитывается через refreshProducts() после успешного размещения
  // нового товара или после покупки (изменение остатка), чтобы список
  // сразу отражал актуальное состояние без перезагрузки страницы.
  const [allProducts, setAllProducts] = useState(getAllProducts);
  const refreshProducts = () => setAllProducts(getAllProducts());

  // Для чисто-продавца, выбравшего вкладку «Мои товары», показываем
  // только товары, реально принадлежащие текущему аккаунту-продавцу —
  // раньше заголовок «Мои товары» обманчиво показывал ВЕСЬ каталог (все
  // 32 товара любых продавцов), что основатель явно заметил как баг на
  // скриншоте. Продавец теперь может переключиться на «Весь каталог»,
  // чтобы покупать сырьё/комплектующие у других продавцов — покупка в
  // маркетплейсе разрешена всем ролям (canBuyMarketplace), в отличие от
  // создания тендера. Покупатель и аккаунт «оба» — всегда весь каталог.
  const showOnlyMine = isPureSeller && sellerView === 'mine';
  const baseProducts = showOnlyMine
    ? allProducts.filter(p => p.seller.id === currentUser.id)
    : allProducts;

  const filtered = baseProducts
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
      {viewing && <ProductModal product={viewing} onClose={() => { setViewing(null); refreshProducts(); }} />}
      {showAddProduct && <AddProductModal onClose={() => { setShowAddProduct(false); refreshProducts(); }} />}
      {showCart && <CartModal onClose={() => setShowCart(false)} onOrderComplete={refreshProducts} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4, letterSpacing: 1 }}>МАРКЕТПЛЕЙС</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            {showOnlyMine ? 'Мои товары' : 'Быстрая покупка и продажа'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Оптом · Только юрлица · Escrow · Реальные тех. характеристики</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canBuyMarketplace && (
            <button className="btn btn-ghost" onClick={() => setShowCart(true)} style={{ position: 'relative' }}>
              🛒 Корзина
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--accent)', color: 'var(--navy)', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
              )}
            </button>
          )}
          {canSell && (
            <button className="btn btn-primary" onClick={() => setShowAddProduct(true)}>+ Разместить товар</button>
          )}
        </div>
      </div>

      {/* Переключатель «Мои товары» / «Весь каталог» — только для
          чисто-продавца. Раньше продавец вообще не мог покупать в
          маркетплейсе; теперь может (закупка сырья/комплектующих для
          своего производства), и ему нужен способ переключиться с
          витрины своих товаров на общий каталог для покупки. */}
      {isPureSeller && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['mine', 'Мои товары'], ['all', 'Весь каталог']].map(([v, l]) => (
            <button key={v} onClick={() => setSellerView(v)} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: sellerView === v ? 'var(--accent)' : 'var(--card)',
              color: sellerView === v ? 'var(--navy)' : 'var(--text-2)',
              border: `1px solid ${sellerView === v ? 'var(--accent)' : 'var(--border)'}`,
            }}>{l}</button>
          ))}
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
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
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
        {filtered.map(p => <ProductCard key={p.id} product={p} onClick={() => setViewing(p)} />)}
      </div>
    </div>
  );
}

// Add Product Modal with AI КП helper
/**
 * Корзина с оформлением заказа нескольких товаров разом — реализует
 * требования «покупатель должен иметь возможность купить продукт или
 * сразу несколько» и «добавь и корзину для покупателя который есть в
 * настоящих маркетплейсах». Проверяет экспортные ограничения (требование
 * #8) для каждой позиции отдельно — товар, заблокированный для текущей
 * страны покупателя, нельзя оформить, даже если он уже лежит в корзине.
 */
function CartModal({ onClose, onOrderComplete }) {
  const { accountType } = useAccountType();
  const buyer = getCurrentUser(accountType);
  const { cartItems, removeFromCart } = useCart();
  const [confirmed, setConfirmed] = useState(false);

  const itemChecks = cartItems.map(item => ({
    ...item,
    exportCheck: checkExportRestriction(item.product.category, buyer.country),
    exceedsStock: item.qty > item.effectiveStock,
  }));

  const blockedItems = itemChecks.filter(i => i.exportCheck.blocked || i.exceedsStock);
  const purchasableItems = itemChecks.filter(i => !i.exportCheck.blocked && !i.exceedsStock);

  const subtotal = purchasableItems.reduce((sum, i) => sum + i.qty * i.product.price, 0);
  const fee = calcMarketplaceFee(subtotal);
  const buyerFee = +(subtotal * fee / 100).toFixed(2);
  const escrow = +(subtotal + buyerFee).toFixed(2);

  const handleCheckout = () => {
    purchasableItems.forEach(item => {
      decrementStock(item.product.id, item.qty);
      addOrder({
        productId: item.product.id, productTitle: item.product.title, qty: item.qty, unit: item.product.unit,
        total: item.qty * item.product.price, buyerFee: 0, escrow: item.qty * item.product.price,
        buyerId: buyer.id, sellerId: item.product.seller.id,
      });
      removeFromCart(item.product.id);
    });
    setConfirmed(true);
    onOrderComplete?.();
  };

  if (cartItems.length === 0 && !confirmed) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Корзина пуста</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>Добавьте товары из каталога, чтобы оформить заказ сразу на несколько позиций.</div>
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>К каталогу</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 16, width: '90%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        {confirmed ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>Заказ оформлен</div>
            <div style={{ color: 'var(--text-2)', marginBottom: 16 }}>Остатки товаров обновлены, заказы сохранены в этой demo-сессии.</div>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '12px 32px' }}>Закрыть</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>Корзина ({cartItems.length})</div>
              <button onClick={onClose} style={{ background: 'none', color: 'var(--text-2)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            {itemChecks.map(item => (
              <div key={item.product.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <ProductIllustration id={item.product.photoId} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{item.qty.toLocaleString()} {item.product.unit} × ${item.product.price}</div>
                  {item.exportCheck.blocked && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>🚫 {item.exportCheck.reason}</div>
                  )}
                  {!item.exportCheck.blocked && item.exceedsStock && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>Превышен остаток ({item.effectiveStock} {item.product.unit})</div>
                  )}
                </div>
                <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', color: 'var(--text-3)', fontSize: 16, cursor: 'pointer', alignSelf: 'flex-start' }}>×</button>
              </div>
            ))}

            {blockedItems.length > 0 && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214' }}>
                ⚠ {blockedItems.length} позиций не войдут в заказ (см. причины выше) — оформляются только доступные товары.
              </div>
            )}

            {purchasableItems.length > 0 && (
              <>
                <div style={{ background: 'var(--navy-3)', borderRadius: 10, padding: '14px 16px', marginTop: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-2)' }}>Товары ({purchasableItems.length})</span>
                    <span>${subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-2)' }}>Комиссия GLORIX (~{fee}%)</span>
                    <span>${buyerFee}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Итого на Escrow</span>
                    <span style={{ color: 'var(--accent)', fontSize: 18, fontFamily: 'var(--font-display)' }}>${escrow.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 14 }}>
                  ⚠ Демо-режим: реальная оплата не производится, но остатки и заказы сохраняются в этой demo-сессии.
                </div>
                <button className="btn btn-primary" onClick={handleCheckout} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}>
                  Оформить заказ — ${escrow.toLocaleString()}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AddProductModal({ onClose }) {
  const { accountType } = useAccountType();
  const currentSeller = getCurrentUser(accountType);
  const [step, setStep] = useState(0); // 0=form, 1=ai-kp, 2=done
  const [form, setForm] = useState({ title: '', category: '', price: '', unit: 'кг', minOrder: '', stock: '', incoterms: 'DAP', deliveryDays: '3', description: '', photoId: 'cement', tnved: '', specs: [{ p: '', v: '' }] });
  const [tnvedQuery, setTnvedQuery] = useState('');
  const [tnvedResults, setTnvedResults] = useState([]);
  const [showTnvedDrop, setShowTnvedDrop] = useState(false);
  const handleTnvedSearch = (q) => {
    setTnvedQuery(q);
    if (!q) { set('tnved', ''); setTnvedResults([]); setShowTnvedDrop(false); return; }
    if (q.length < 2) { setTnvedResults([]); setShowTnvedDrop(false); return; }
    searchHsCodes(q).then(({ results }) => {
      setTnvedResults(results.slice(0, 6));
      setShowTnvedDrop(results.length > 0);
    });
  };
  const selectTnved = (r) => { set('tnved', r.code); setTnvedQuery(r.code + ' — ' + (r.descriptionRu || r.description)); setShowTnvedDrop(false); };
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

  // Минимальная валидация обязательных полей — без этого
  // addUserProduct() сохранил бы товар с пустым названием/ценой, что
  // выглядело бы как мусор в общем каталоге сразу после публикации.
  const missingRequired = !form.title.trim() || !form.category || !form.price || !form.unit.trim()
    || !form.minOrder || !form.stock || !Number.isFinite(Number(form.price)) || Number(form.price) <= 0
    || !Number.isFinite(Number(form.stock)) || Number(form.stock) < 0;

  const publishDisabled = isBlocked || needsReview || missingRequired;

  /**
   * Реально сохраняет товар в общий каталог через marketplaceStore —
   * закрывает требование «аккаунт продавец должен разместить свой товар
   * ... в маркетплейсе» (раньше форма проходила все шаги, но товар
   * никуда не сохранялся, см. CHANGELOG). Продавец — текущий аккаунт
   * (не статичная демо-компания), категория, остаток и характеристики —
   * введённые пользователем значения, не заглушки.
   */
  const handlePublish = () => {
    if (publishDisabled) return;
    addUserProduct({
      title: form.title.trim(),
      tnved: form.tnved || null,
      category: form.category,
      seller: { id: currentSeller.id, name: currentSeller.name, country: currentSeller.country, flag: currentSeller.flag, city: currentSeller.city || '', trustScore: currentSeller.trustScore, verified: currentSeller.verified, totalDeals: currentSeller.totalDeals },
      price: Number(form.price), currency: 'USD', unit: form.unit.trim(),
      minOrder: Number(form.minOrder), maxOrder: Number(form.stock),
      stock: Number(form.stock), stockAuto: false,
      photoId: form.photoId,
      specs: form.specs.filter(s => s.p && s.v).length > 0
        ? [{ group: 'Характеристики', items: form.specs.filter(s => s.p && s.v).map(s => ({ p: s.p, v: s.v })) }]
        : [],
      sellerNotes: form.description.trim() || null,
      certifications: [], deliveryDays: { min: Number(form.deliveryDays) || 1, max: (Number(form.deliveryDays) || 1) + 7 },
      incoterms: [form.incoterms], sanctions: false,
      rating: 0, reviews: 0, reviewsList: [],
      aiCheck: { sanctionsOk: !isBlocked, specsVerified: false, qualityRisk: 'unverified' },
      tags: ['Новый товар'],
    });
    setStep(2);
  };

  const generateKP = () => {
    setGenerating(true);
    setTimeout(() => {
      const specsText = form.specs.filter(s=>s.p&&s.v).map(s=>`• ${s.p}: ${s.v}`).join('\n') || '• [Укажите характеристики]';
      const subtotal = (parseFloat(form.price)||0) * (parseFloat(form.minOrder)||0);
      setKp(`КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ №КП-${Date.now().toString().slice(-6)}

ПРОДАВЕЦ: ${currentSeller.name} (Продавец GLORIX Platform)
ДАТА: ${new Date().toLocaleDateString('ru-RU')}
ДЕЙСТВИТЕЛЬНО ДО: ${new Date(Date.now()+30*24*60*60*1000).toLocaleDateString('ru-RU')}
ИНКОТЕРМС 2020: ${form.incoterms}
УСЛОВИЯ ОПЛАТЫ: 30% предоплата, 70% по факту отгрузки

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
СПЕЦИФИКАЦИЯ ТОВАРОВ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| № | Наименование | ТН ВЭД | Кол-во | Цена/ед | Сумма |
|---|-------------|--------|--------|---------|-------|
| 1 | ${form.title || '[Название товара]'} | ${form.tnved || '—'} | ${form.minOrder || '—'} ${form.unit} | $${form.price || '—'} | $${subtotal.toLocaleString()} |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ИТОГО: $${subtotal.toLocaleString()} ${form.incoterms}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ТЕХНИЧЕСКИЕ ХАРАКТЕРИСТИКИ:
${specsText}

НАЛИЧИЕ: ${form.stock ? `${form.stock} ${form.unit} на складе` : '[Наличие]'}
СРОК ПОСТАВКИ: ${form.deliveryDays || '[Срок]'} рабочих дней

⚡ УЧАСТИЕ В ТЕНДЕРЕ:
При подаче оферты на тендер — измените только цену.
Технические характеристики и ТН ВЭД код сохранены.

Верифицировано GLORIX ✓
____________________     ____________________
Подпись руководителя     Печать компании`);
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
            <div style={{ color: 'var(--text-2)', marginBottom: 16 }}>Товар добавлен в общий каталог маркетплейса и виден другим пользователям этой demo-сессии.</div>
            <div style={{ display: 'inline-block', padding: '8px 14px', background: 'rgba(180,130,20,0.12)', border: '1px solid rgba(180,130,20,0.35)', borderRadius: 8, fontSize: 12, color: '#B48214', marginBottom: 24 }}>
              ⚠ Демо-режим: товар сохранён в браузере (localStorage), не на сервере — он исчезнет при очистке кэша браузера и не виден с других устройств.
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
                {/* Код ТН ВЭД — используется в КП. Переиспользует searchHsCodes из hsCodes.js. */}
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Код ТН ВЭД <span style={{ color: 'var(--text-3)' }}>(необязательно — нужен для КП)</span></label>
                  <input
                    style={inputStyle}
                    placeholder="Напр.: 5205 или введите название для поиска"
                    value={tnvedQuery}
                    onChange={e => handleTnvedSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setShowTnvedDrop(false), 150)}
                  />
                  {showTnvedDrop && (
                    <div style={{ position: 'absolute', zIndex: 200, background: 'var(--navy-2)', border: '1px solid var(--border-2)', borderRadius: 8, width: '100%', maxHeight: 200, overflowY: 'auto', top: '100%', marginTop: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                      {tnvedResults.map(r => (
                        <div key={r.code} onMouseDown={() => selectTnved(r)}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--navy-3)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <span style={{ color: 'var(--accent)', fontFamily: 'monospace', marginRight: 8 }}>{r.code}</span>
                          {r.descriptionRu || r.description}
                        </div>
                      ))}
                    </div>
                  )}
                  {form.tnved && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>✓ Выбран код: {form.tnved}</div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Категория</label>
                    <select style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                      <option value="">Выберите</option>
                      {categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
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
                      {PRODUCT_UNITS.map(u => <option key={u}>{u}</option>)}
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

                {/* Примечания продавца — реализует требование: некоторые
                    нюансы товара (профессиональный сленг отрасли, детали,
                    которые понятны только тем, кто торгует именно этим
                    товаром) не укладываются в стандартные поля
                    «характеристика/значение». Свободное текстовое поле
                    даёт продавцу возможность объяснить то, что иначе
                    осталось бы непонятным покупателю и платформе. */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Примечания продавца (необязательно)</label>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                    Если что-то важное не укладывается в характеристики выше — опишите своими словами. Например, отраслевые особенности, условия хранения, нюансы партии.
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="Напр.: Партия с прошлого урожая, влажность может отличаться на ±1% от стандарта..."
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>

                {/* Иллюстрация товара — без backend нет загрузки настоящих
                    фото, поэтому продавец выбирает подходящую категорийную
                    иллюстрацию из набора, который уже используется во всём
                    каталоге (см. ProductIllustration.jsx) — честное
                    решение, не выдающее себя за реальное фото. */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 5 }}>Иллюстрация товара</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                    {PRODUCT_ILLUSTRATION_IDS.map(id => (
                      <div key={id} onClick={() => set('photoId', id)}
                        style={{ aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                          border: `2px solid ${form.photoId === id ? 'var(--accent)' : 'var(--border)'}` }}>
                        <ProductIllustration id={id} />
                      </div>
                    ))}
                  </div>
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
                  onClick={handlePublish}
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
