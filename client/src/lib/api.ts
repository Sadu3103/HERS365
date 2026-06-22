export interface ApiError extends Error {
  status: number;
}

// Catch blocks see `unknown` under strict TS. This narrows safely so screens
// can avoid `err: any` while still showing the server's user-facing message.
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// [D-05] Single-flight refresh: when an access token expires, the first 401
// triggers one call to /api/auth/refresh (which reads the httpOnly refresh
// cookie). Concurrent callers await the same in-flight refresh instead of
// each firing their own.
let refreshing: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (data?.token) {
          localStorage.setItem('token', data.token);
          // The coach portal stores its access token under a separate key —
          // keep it in sync so coach pages pick up the refreshed token too.
          if (localStorage.getItem('coachToken')) localStorage.setItem('coachToken', data.token);
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

function buildHeaders(opts: RequestInit): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// [D-05] Drop-in replacement for fetch() that injects the current Bearer token
// and transparently refreshes the access token once on a 401 before retrying.
// Returns the raw Response so components keep their own res.ok / res.json()
// handling — unlike apiFetch which parses + throws. Use this when migrating an
// existing `fetch(...)` call so it gets silent refresh with minimal churn.
export async function fetchWithRefresh(
  path: string,
  init: RequestInit = {},
  opts: { tokenKey?: string } = {},
): Promise<Response> {
  // Coach pages keep their access token under 'coachToken'; everything else
  // uses 'token'. Default by path (/api/coach/* → coachToken) so callers don't
  // have to pass it; refresh syncs both keys regardless.
  const tokenKey = opts.tokenKey ?? (path.startsWith('/api/coach') ? 'coachToken' : 'token');
  const isAuthCall =
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register');

  // Re-reads the *current* token each call, so the post-refresh retry uses the
  // new token rather than the stale one captured by the caller.
  const withAuth = (): RequestInit => {
    const token = localStorage.getItem(tokenKey);
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return { ...init, headers, credentials: init.credentials ?? 'include' };
  };

  let res = await fetch(path, withAuth());
  if (res.status === 401 && !isAuthCall) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(path, withAuth());
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  return res;
}

// Wraps fetch: injects the Bearer token, sends/parses JSON, throws on non-2xx.
// On a 401 it attempts a one-time silent token refresh and retries the request.
export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  // Don't try to refresh the auth calls themselves — avoids infinite loops.
  const isAuthCall =
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/register');

  let res = await fetch(path, { ...opts, headers: buildHeaders(opts), credentials: 'include' });

  if (res.status === 401 && !isAuthCall) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(path, { ...opts, headers: buildHeaders(opts), credentials: 'include' });
    } else {
      // Refresh failed — session is over. Clear stale creds so route guards redirect.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`) as ApiError;
    err.status = res.status;
    throw err;
  }
  return data as T;
}
