/* Set-up between the front and back end */

// Base URL for all API requests--connecting to the backend
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

let onUnauthorized = null;
export function setOnUnauthorized(handler) { onUnauthorized = handler; }

function broadcastLogout(reason = 'unauthorized') {
  try { window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } })); } catch {}
}

// ---- Auto logout timer from JWT exp ----
function scheduleAutoLogoutFromToken(token) {
  try {
    const payload = JSON.parse(atob((token || '').split('.')[1] || ''));
    const expSec = payload && payload.exp; // unix seconds
    if (!expSec) return;
    const ms = expSec * 1000 - Date.now();
    if (ms <= 0) {
      // token 已过期，立刻登出
      clearToken();
      // 若外部未注册回调，直接跳转登录页
      if (typeof onUnauthorized === 'function') onUnauthorized();
      else try { window.location.replace('/auth/Login'); } catch {}
      return;
    }
    // 定时器：到期自动退出
    if (window.__logoutTimer) clearTimeout(window.__logoutTimer);
    window.__logoutTimer = setTimeout(() => {
      clearToken();
      if (typeof onUnauthorized === 'function') onUnauthorized();
      else try { window.location.replace('/auth/Login'); } catch {}
    }, ms);
  } catch (e) {
    // 无法解析则忽略
  }
}

// Save the token when log-in successfully
export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);  // Store the token locally
    scheduleAutoLogoutFromToken(token);
  } else {
    clearToken();
  }
}
// Retrieve the token later when making API calls
export function getToken() {
  return localStorage.getItem('token');
}

// Remove the token
export function clearToken() {
  localStorage.removeItem('token');
  if (window.__logoutTimer) try { clearTimeout(window.__logoutTimer); } catch {}
}

// Frontend request wrapper--so that backend apis could be triggered
export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  if (!path || typeof path !== 'string') {
    const err = new Error(`api(): path is required, got ${String(path)}`);
    try { console.error('[api] Missing path', { path, stack: err.stack }); } catch {}
    throw err;
  }
  if (path[0] !== '/') path = `/${path}`;

  const token = getToken();
  const finalHeaders = { ...(headers || {}) };
  const isFormData = (typeof FormData !== 'undefined') && (body instanceof FormData);
  if (!isFormData) finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';

  // 💡 关键：登录/注册类接口不附加 Authorization
  const lower = path.toLowerCase();
  const skipAuth =
    lower.startsWith('/auth/login') ||
    lower.startsWith('/auth/register') ||
    lower.startsWith('/auth/forgot') ||
    lower.startsWith('/auth/reset');

  if (token && !skipAuth) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
  });

  if (res.status === 401) {
    clearToken();
    if (typeof onUnauthorized === 'function') onUnauthorized();
    else try { window.location.replace('/auth/Login'); } catch {}
    try { window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: '401' } })); } catch {}
    throw new Error('Unauthorized, please log in again.');
  }
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  return safeJson(res);
}

// Parse the JSON response passed/given from the backend
async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

// ---- App bootstrap: schedule auto logout if token exists ----
(() => {
  const t = getToken();
  if (t) scheduleAutoLogoutFromToken(t);
})();