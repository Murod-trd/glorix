import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getCart, setCartItem as storeSetCartItem, clearCart as storeClearCart, getAllProducts, getEffectiveStock } from '../data/marketplaceStore';

/**
 * Корзина покупателя — реализует требование «добавь и корзину для
 * покупателя который есть в настоящих маркетплейсах».
 *
 * Следует тому же паттерну, что AccountContext.jsx: реактивный React
 * Context поверх localStorage, чтобы изменения корзины в одном
 * компоненте (например, кнопка «В корзину» на карточке товара) сразу
 * отражались в другом (иконка корзины в шапке, страница оформления
 * заказа) без перезагрузки страницы.
 */

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(getCart);

  const addToCart = useCallback((productId, qty) => {
    const next = storeSetCartItem(productId, qty);
    setCart(next);
  }, []);

  const removeFromCart = useCallback((productId) => {
    const next = storeSetCartItem(productId, 0);
    setCart(next);
  }, []);

  const clearCart = useCallback(() => {
    storeClearCart();
    setCart([]);
  }, []);

  // Собираем полные данные товаров для каждой позиции корзины — UI не
  // должен сам заниматься поиском товара по id в каждом месте, где
  // показывается корзина.
  const cartItems = cart.map(({ productId, qty }) => {
    const product = getAllProducts().find(p => p.id === productId);
    if (!product) return null;
    return { product, qty, effectiveStock: getEffectiveStock(product) };
  }).filter(Boolean);

  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.qty * item.product.price, 0);

  return (
    <CartContext.Provider value={{ cart, cartItems, cartCount, cartTotal, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
