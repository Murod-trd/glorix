import { products as staticProducts } from './marketplace';
import { PRODUCT_ILLUSTRATION_IDS } from '../components/ProductIllustration';

/**
 * Хранилище маркетплейса — превращает демо-витрину в реально работающий
 * внутри браузера маркетплейс.
 *
 * КОНТЕКСТ: раньше форма «Разместить товар» проходила все шаги (включая
 * санкционную проверку), но на последнем шаге просто переключала
 * `setStep(2)` — товар никуда не сохранялся и не появлялся в общем списке
 * товаров. Покупка также была чистой имитацией без реального изменения
 * остатка. Основатель явно запросил реальную работающую логику внутри
 * demo-версии (без backend, через localStorage браузера — это честная
 * граница, явно показанная пользователю, не выдаваемая за серверное
 * сохранение).
 *
 * Товары, добавленные пользователем, хранятся отдельно от статичных
 * демо-товаров (`marketplace.js`) и объединяются при чтении — это и
 * сохраняет демонстрационный каталог из 32 товаров, и позволяет новым
 * товарам появляться в общем списке.
 */

const USER_PRODUCTS_KEY = 'glorix_user_products';
const CART_KEY = 'glorix_cart';
const ORDERS_KEY = 'glorix_orders';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage недоступен/переполнен — не должно ломать приложение,
    // просто означает, что добавленный товар не переживёт перезагрузку.
  }
}

/**
 * Возвращает полный каталог: статичные демо-товары + добавленные
 * пользователем за текущую сессию браузера.
 */
export function getAllProducts() {
  const validPhotoIds = new Set(PRODUCT_ILLUSTRATION_IDS);
  const userProducts = readJson(USER_PRODUCTS_KEY, []).map(p => ({
    ...p,
    // Если товар был сохранён со старым photoId, которого больше нет в каталоге
    // иллюстраций (например после рефакторинга набора SVG), подставляем
    // нейтральный fallback вместо того чтобы показывать заглушку-«Товар» без предупреждения.
    photoId: validPhotoIds.has(p.photoId) ? p.photoId : 'cement',
  }));
  return [...staticProducts, ...userProducts];
}

/**
 * Добавляет новый товар, размещённый продавцом, в общий список —
 * реализует требование «продавец должен разместить свой товар... в
 * маркетплейсе», не просто заполнить форму без последствий.
 */
export function addUserProduct(product) {
  const userProducts = readJson(USER_PRODUCTS_KEY, []);
  const newProduct = {
    ...product,
    id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isUserAdded: true,
    createdAt: new Date().toISOString(),
  };
  writeJson(USER_PRODUCTS_KEY, [...userProducts, newProduct]);
  return newProduct;
}

/**
 * Уменьшает остаток товара после покупки — реализует требование
 * «покупатель должен иметь возможность купить продукт» так, чтобы
 * покупка реально что-то меняла, а не была визуальной заглушкой.
 * Работает и для статичных, и для пользовательских товаров: если товар
 * статичный, сохраняется override остатка отдельно (сам статичный
 * массив в marketplace.js не модифицируется — это код, не данные).
 */
const STOCK_OVERRIDES_KEY = 'glorix_stock_overrides';

export function getEffectiveStock(product) {
  if (product.isUserAdded) return product.stock;
  const overrides = readJson(STOCK_OVERRIDES_KEY, {});
  return product.id in overrides ? overrides[product.id] : product.stock;
}

export function decrementStock(productId, qty) {
  const userProducts = readJson(USER_PRODUCTS_KEY, []);
  const userIdx = userProducts.findIndex(p => p.id === productId);
  if (userIdx >= 0) {
    userProducts[userIdx] = { ...userProducts[userIdx], stock: Math.max(0, userProducts[userIdx].stock - qty) };
    writeJson(USER_PRODUCTS_KEY, userProducts);
    return;
  }
  const overrides = readJson(STOCK_OVERRIDES_KEY, {});
  const staticProduct = staticProducts.find(p => p.id === productId);
  const current = productId in overrides ? overrides[productId] : (staticProduct?.stock ?? 0);
  overrides[productId] = Math.max(0, current - qty);
  writeJson(STOCK_OVERRIDES_KEY, overrides);
}

// === Корзина ===

export function getCart() {
  return readJson(CART_KEY, []); // [{ productId, qty }]
}

export function setCartItem(productId, qty) {
  const cart = getCart();
  const idx = cart.findIndex(c => c.productId === productId);
  if (qty <= 0) {
    const next = cart.filter(c => c.productId !== productId);
    writeJson(CART_KEY, next);
    return next;
  }
  if (idx >= 0) {
    cart[idx] = { ...cart[idx], qty };
  } else {
    cart.push({ productId, qty });
  }
  writeJson(CART_KEY, cart);
  return cart;
}

export function clearCart() {
  writeJson(CART_KEY, []);
}

// === Заказы (история совершённых покупок) ===

export function getOrders() {
  return readJson(ORDERS_KEY, []);
}

export function addOrder(order) {
  const orders = getOrders();
  const newOrder = { ...order, id: `ord_${Date.now()}`, date: new Date().toISOString() };
  writeJson(ORDERS_KEY, [newOrder, ...orders]);
  return newOrder;
}
