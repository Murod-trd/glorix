import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Централизованный источник правды для текущего типа аккаунта (buyer/seller/both).
 *
 * Модель прав уточнена основателем (полное разделение ролей по правам,
 * «оба» = объединение): покупка в маркетплейсе и создание тендера — это
 * РАЗНЫЕ права, не одно и то же. Продавец может покупать в маркетплейсе
 * (закупает сырьё/комплектующие для своего производства), но не может
 * создавать тендер.
 */

const VALID_TYPES = ['buyer', 'seller', 'both'];
const STORAGE_KEY = 'glorix_account_type';

function readInitial() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return VALID_TYPES.includes(stored) ? stored : 'buyer';
}

const AccountContext = createContext(null);

export function AccountProvider({ children }) {
  const [accountType, setAccountTypeState] = useState(readInitial);

  const setAccountType = useCallback((next) => {
    if (!VALID_TYPES.includes(next)) return;
    localStorage.setItem(STORAGE_KEY, next);
    setAccountTypeState(next);
  }, []);

  const canCreateTender = accountType === 'buyer' || accountType === 'both';
  const canBuyMarketplace = true;
  const canSell = accountType === 'seller' || accountType === 'both';

  return (
    <AccountContext.Provider value={{
      accountType, setAccountType,
      canCreateTender, canBuyMarketplace, canSell,
      canBuy: canCreateTender,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountType() {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccountType must be used within an AccountProvider');
  }
  return ctx;
}
