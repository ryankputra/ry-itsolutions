export const API_URL = '/api';

export async function fetchUserBalance() {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error("Gagal mengambil session");
  const data = await res.json();
  return data.user?.balance ?? 0;
}

export async function fetchSession() {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error("Gagal mengambil session");
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Gagal login");
  return data;
}

export async function logout() {
  const res = await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error("Gagal logout");
  return res.json();
}

export async function fetchPackages() {
  const res = await fetch(`${API_URL}/user/packages?t=${Date.now()}`, { cache: 'no-store', credentials: 'include' });
  if (!res.ok) throw new Error("Gagal mengambil daftar paket");
  const data = await res.json();
  return data.data || [];
}
