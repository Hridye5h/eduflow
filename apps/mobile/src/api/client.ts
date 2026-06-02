import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://10.0.2.2:4001';

export type Session = { token: string; user: any; subdomain: string };

export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem('ef.session');
  return raw ? JSON.parse(raw) : null;
}

export async function setSession(s: Session) {
  await AsyncStorage.setItem('ef.session', JSON.stringify(s));
}

export async function clearSession() {
  await AsyncStorage.removeItem('ef.session');
}

export async function api<T = any>(
  path: string,
  opts: RequestInit & { subdomain?: string; token?: string } = {},
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (!headers.has('Content-Type') && opts.body && typeof opts.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  if (opts.subdomain) headers.set('x-school-subdomain', opts.subdomain);

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? safe(text) : null;
  if (!res.ok) throw new Error(data?.message || res.statusText);
  return data as T;
}

const safe = (t: string) => { try { return JSON.parse(t); } catch { return t; } };
