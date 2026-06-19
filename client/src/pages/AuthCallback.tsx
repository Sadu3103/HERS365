import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = searchParams.get('data');
    if (searchParams.get('error') || !raw) {
      setError('GitHub sign-in failed. Try again.');
      return;
    }
    try {
      const { token, user } = JSON.parse(decodeURIComponent(raw));
      login(token, user);
      navigate('/feed', { replace: true });
    } catch {
      setError('Could not complete sign-in.');
    }
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', gap: 16 }}>
        <p style={{ color: '#ff9a8a' }}>{error}</p>
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
