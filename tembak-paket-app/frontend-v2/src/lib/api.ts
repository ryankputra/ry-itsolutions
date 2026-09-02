/**
 * Centralized API Client & Network Helper (Next.js 16)
 * Handles transparent payload normalization, proxy routing, TMA headers, and global error logging.
 */

export const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const raw = process.env.NEXT_PUBLIC_API_URL || '';
    // If the browser hostname is not localhost/127.0.0.1, but NEXT_PUBLIC_API_URL points to localhost, safely use relative origin
    const isBrowserOnRemoteHost = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    if (isBrowserOnRemoteHost && (raw.includes('localhost') || raw.includes('127.0.0.1'))) {
      return '';
    }
    return raw;
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001';
})();

export const API_URL = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : '/api';

export function getTelegramInitData(): string {
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.initData === 'string') {
      return tg.initData;
    }
  }
  return '';
}

/**
 * Normalizes backend response payloads to ensure seamless compatibility across components
 * (syncs status/success flags, arrays, and error structures).
 */
export function normalizeResponsePayload(data: any): any {
  if (!data || typeof data !== 'object') return data;

  // Unify boolean status and success indicators
  const isSuccess = data.status === true || data.success === true;
  const isFailure = data.status === false || data.success === false;

  if (isSuccess) {
    data.status = true;
    data.success = true;
  } else if (isFailure) {
    data.status = false;
    data.success = false;
  }

  return data;
}

/**
 * Safe JSON parser with content-type verification, payload normalization, and network diagnostics.
 */
export async function safeJson(res: Response | Promise<Response>): Promise<any> {
  try {
    const resolvedRes = await res;
    if (!resolvedRes) return null;

    const contentType = resolvedRes.headers?.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (!resolvedRes.ok) {
        console.warn(`[API Warning] Received non-JSON response with HTTP ${resolvedRes.status} from ${resolvedRes.url}`);
      }
      return null;
    }

    const json = await resolvedRes.json();
    const normalized = normalizeResponsePayload(json);

    if (!resolvedRes.ok) {
      console.error(`[API Error ${resolvedRes.status}] ${resolvedRes.url}:`, normalized?.message || normalized);
    }

    return normalized;
  } catch (e) {
    console.error("[API JSON Parse Error]:", e);
    return null;
  }
}

/**
 * Core API fetch wrapper:
 * - Automatically injects Telegram Mini App authentication
 * - Handles credentials inclusion for sessions
 * - Transparently normalizes response data
 * - Emits detailed console error diagnostics on failures
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/api')
      ? `${API_BASE ? API_BASE.replace(/\/$/, '') : ''}${endpoint}`
      : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const tgInitData = getTelegramInitData();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (tgInitData) {
    headers['x-telegram-init-data'] = tgInitData;
  }

  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });

    const data = await safeJson(response);

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with HTTP status ${response.status}`;
      console.error(`[API Network Error] ${response.status} ${url}:`, errorMsg);
      const err: any = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err: any) {
    if (!err.status) {
      console.error(`[API Connection Failed] ${url}:`, err.message || err);
    }
    throw err;
  }
}

// ----------------------------------------------------------------------
// Dedicated High-Level Domain Services
// ----------------------------------------------------------------------

export async function fetchSession() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
    const data = await safeJson(res);
    return data;
  } catch (e) {
    console.error("[API] fetchSession failed:", e);
    return null;
  }
}

export async function fetchUserBalance(): Promise<number> {
  try {
    const data = await fetchSession();
    return data?.user?.balance ?? 0;
  } catch {
    return 0;
  }
}

export async function login(email: string, password: string) {
  return await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

export async function logout() {
  return await apiFetch('/auth/logout', { method: 'POST' });
}

export async function fetchPackages() {
  try {
    const data = await apiFetch(`/user/packages?t=${Date.now()}`, { cache: 'no-store' });
    return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  } catch (e) {
    console.error("[API] fetchPackages failed:", e);
    return [];
  }
}
