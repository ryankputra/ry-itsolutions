export const API_URL = '/api';

export function getTelegramInitData(): string {
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.initData === 'string') {
      return tg.initData;
    }
  }
  return '';
}

export async function safeJson(res: Response | Promise<Response>): Promise<any> {
  try {
    const resolvedRes = await res;
    if (!resolvedRes) return null;
    const contentType = resolvedRes.headers?.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }
    return await resolvedRes.json();
  } catch (e) {
    return null;
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const tgInitData = getTelegramInitData();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (tgInitData) {
    headers['x-telegram-init-data'] = tgInitData;
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await safeJson(response);

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err: any = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function fetchUserBalance() {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error("Gagal mengambil session");
  const data = await safeJson(res);
  return data?.user?.balance ?? 0;
}

export async function fetchSession() {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error("Gagal mengambil session");
  return await safeJson(res);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Gagal login");
  return data;
}

export async function logout() {
  const res = await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error("Gagal logout");
  return await safeJson(res);
}

export async function fetchPackages() {
  const res = await fetch(`${API_URL}/user/packages?t=${Date.now()}`, { cache: 'no-store', credentials: 'include' });
  if (!res.ok) throw new Error("Gagal mengambil daftar paket");
  const data = await safeJson(res);
  return data?.data || [];
}
