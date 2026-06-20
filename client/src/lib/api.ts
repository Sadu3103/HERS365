export interface ApiError extends Error {
  status: number;
}

// Catch blocks see `unknown` under strict TS. This narrows safely so screens
// can avoid `err: any` while still showing the server's user-facing message.
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// Wraps fetch: injects the Bearer token, sends/parses JSON, and throws on non-2xx.
export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}
