/**
 * authApi.js — client for the Glorix auth foundation (/api/auth/*, /api/companies/*).
 *
 * IMPORTANT (demo safety): These helpers are only meant to be used when
 * VITE_USE_REAL_AUTH === 'true'. When the flag is off, the app keeps using the
 * existing localStorage demo account flow (see AccountContext). Calling these
 * helpers does not change demo behavior on its own.
 *
 * Token storage is intentionally simple (localStorage) for this dev-stage
 * foundation. This is NOT a hardened production auth scheme — see
 * docs/BACKEND_AUTH_FOUNDATION.md for limitations.
 */

const TOKEN_KEY = 'glorix_auth_token';

export const REAL_AUTH_ENABLED =
  (import.meta?.env?.VITE_USE_REAL_AUTH ?? 'false') === 'true';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}
export function setToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore storage errors */ }
}
export function clearToken() { setToken(null); }

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function register({ email, password, fullName, companyName, country, companyType }) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: { email, password, fullName, companyName, country, companyType },
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function login({ email, password }) {
  const data = await request('/auth/login', { method: 'POST', body: { email, password } });
  if (data.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return request('/auth/me', { auth: true });
}

export async function logout() {
  try { await request('/auth/logout', { method: 'POST', auth: true }); } catch { /* stateless */ }
  clearToken();
  return { success: true };
}

export async function getMyCompany() {
  return request('/companies/me', { auth: true });
}

export async function updateMyCompany(patch) {
  return request('/companies/me', { method: 'PATCH', auth: true, body: patch });
}

export default {
  REAL_AUTH_ENABLED, getToken, setToken, clearToken,
  register, login, getMe, logout, getMyCompany, updateMyCompany,
};
