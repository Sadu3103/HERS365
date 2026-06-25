import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function parseCallback(searchParams: URLSearchParams): { error: string } | { token: string; user: { id: number; email: string; name: string; role: 'athlete' | 'coach' | 'parent' | 'admin' } } {
  if (searchParams.get('error')) {
    return { error: 'GitHub sign-in failed. Try again.' };
  }
  const raw = searchParams.get('data');
  if (!raw) return { error: 'GitHub sign-in failed. Try again.' };
  try {
    const { token, user } = JSON.parse(decodeURIComponent(raw));
    if (!token || !user) return { error: 'Could not complete sign-in.' };
    return { token, user };
  } catch {
    return { error: 'Could not complete sign-in.' };
  }
}

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const result = useMemo(() => parseCallback(searchParams), [searchParams]);

  useEffect(() => {
    if ('error' in result) return;
    login(result.token, result.user);
    navigate('/feed', { replace: true });
  }, [result, login, navigate]);

  if ('error' in result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', gap: 16 }}>
        <p style={{ color: '#ff9a8a' }}>{result.error}</p>
        <button type="button" onClick={() => navigate('/auth')} style={{ background: '#ff5a2d', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer' }}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <Loader2 size={28} color="#ff5a2d" className="animate-spin" />
    </div>
  );
}
