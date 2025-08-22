// 统一封装 fetch，自动带上 token
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}
export function getToken() {
  return localStorage.getItem('token');
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  return safeJson(res);
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}