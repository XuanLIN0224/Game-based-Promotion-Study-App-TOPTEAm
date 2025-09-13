/* Set-up between the front and back end */

// Base URL for all API requests--connecting to the backend
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

let onUnauthorized = null;
export function setOnUnauthorized(handler) { onUnauthorized = handler; }

function broadcastLogout(reason = 'unauthorized') {
  try { window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } })); } catch {}
}

// Save the token when log-in successfully
export function setToken(token) {
  if (token) localStorage.setItem('token', token);  // Store the token locally
  else localStorage.removeItem('token');
}
// Retrieve the token later when making API calls
export function getToken() {
  return localStorage.getItem('token');
}

// Remove the token
export function clearToken() {
  localStorage.removeItem('token');
}


// Frontend request wrapper--so that backend apis could be triggered
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

  // Auto-logout
  if (res.status === 401) {
    clearToken();
    if (typeof onUnauthorized === 'function') onUnauthorized();
    broadcastLogout('401');
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