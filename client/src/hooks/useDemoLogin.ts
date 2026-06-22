import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export type DemoRole = 'player' | 'coach';

// Hardcoded seeded demo accounts. The SERVER also gates these emails behind
// DEMO_ENABLED + non-production NODE_ENV, so a leaked client build cannot
// reach a prod demo path even if these creds are visible in the bundle.
const DEMO_CREDS: Record<DemoRole, { email: string; password: string }> = {
  player: { email: 'maya@hers365.com', password: 'hers365' },
  coach:  { email: 'coach@hers365.com', password: 'hers365coach' },
};

// Pure gate, fail-closed, POSITIVE non-prod assertion (mirrors server).
// Returning the button on the absence of 'production' is unsafe — a build
// with MODE unset would render it. Require an explicit 'development' MODE
// AND the opt-in flag.
//   1. MODE === 'development' (Vite sets this for `vite dev`)
//   2. VITE_ENABLE_DEMO_LOGIN === 'true' (explicit opt-in, not just truthy)
export function shouldShowDemoLogin(env: ImportMetaEnv | Record<string, unknown>): boolean {
  const mode = (env as Record<string, unknown>).MODE;
  const flag = (env as Record<string, unknown>).VITE_ENABLE_DEMO_LOGIN;
  if (mode !== 'development') return false;
  if (flag !== 'true') return false;
  return true;
}

export function useDemoLogin(role: DemoRole) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = shouldShowDemoLogin(import.meta.env as unknown as Record<string, unknown>);

  const submit = useCallback(async () => {
    if (!enabled) return; // belt-and-suspenders; component won't render either
    setError(null);
    setLoading(true);
    try {
      const creds = DEMO_CREDS[role];
      const endpoint = role === 'coach' ? '/api/auth/secure/coach/login' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Demo login failed');
        return;
      }
      if (role === 'coach') {
        if (data.token) localStorage.setItem('coachToken', data.token);
        if (data.user) localStorage.setItem('coachUser', JSON.stringify(data.user));
        navigate('/coach');
      } else {
        if (data.token && data.user) login(data.token, data.user);
        navigate('/feed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }, [enabled, role, login, navigate]);

  return { enabled, submit, loading, error };
}
