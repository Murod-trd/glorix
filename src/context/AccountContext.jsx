import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Централизованный источник правды для текущего типа аккаунта (buyer/seller/both).
 *
 * Закрывает аудит-пункт 🟠#6: ранее `accountType` читался из localStorage на
 * module scope в нескольких файлах (mock.js, Marketplace.jsx, Dashboard.jsx) —
 * значение вычислялось один раз при первой загрузке модуля и не обновлялось
 * при смене аккаунта без полной перезагрузки страницы (см. AccountSelect.jsx,
 * который использовал window.location.reload() как обходное решение).
 *
 * Теперь любой компонент, которому нужен текущий тип аккаунта, использует
 * useAccountType() — значение реактивно обновляется во всех подписанных
 * компонентах сразу после setAccountType(), без reload.
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

  const canBuy = accountType === 'buyer' || accountType === 'both';
  const canSell = accountType === 'seller' || accountType === 'both';

  return (
    <AccountContext.Provider value={{ accountType, setAccountType, canBuy, canSell }}>
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
