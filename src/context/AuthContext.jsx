import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../services/authApi';

/**
 * AuthContext — additive, opt-in real-auth state.
 *
 * Demo safety: this provider is INERT by default. It only talks to the backend
 * when VITE_USE_REAL_AUTH === 'true'. When the flag is off, it performs no
 * network calls and the existing AccountContext/localStorage demo flow is the
 * single source of truth. It is safe to mount this provider unconditionally.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const enabled = authApi.REAL_AUTH_ENABLED;
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(enabled && !!authApi.getToken());
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!enabled || !authApi.getToken()) return null;
    setLoading(true); setError(null);
    try {
      const data = await authApi.getMe();
      setUser(data.user); setCompany(data.company);
      return data;
    } catch (e) {
      setError(e.message); authApi.clearToken(); setUser(null); setCompany(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- opt-in session restore on mount
  useEffect(() => { if (enabled) refresh(); }, [enabled, refresh]);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setUser(data.user); setCompany(data.company);
    return data;
  }, []);

  const login = useCallback(async (payload) => {
    const data = await authApi.login(payload);
    setUser(data.user); setCompany(data.company);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null); setCompany(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      realAuthEnabled: enabled,
      user, company, loading, error,
      isAuthenticated: !!user,
      register, login, logout, refresh,
      updateMyCompany: authApi.updateMyCompany,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
