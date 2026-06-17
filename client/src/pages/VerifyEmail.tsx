import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const INK = '#0a0a0a';
const PANEL = '#111111';
const LINE = 'rgba(255,255,255,0.08)';
const TEXT = '#f4f4f2';
const MUTED = '#9a9a96';
const FLAME = '#ff5a2d';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!token) {
        setError('Missing verification token');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Verification failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: INK, color: TEXT }}>
      <div style={{ width: '100%', maxWidth: 420, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 18, padding: 28 }}>
        {!loading && !error && (
          <>
            <CheckCircle2 size={42} color="#4ade80" style={{ marginBottom: 16 }} />
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', margin: '0 0 8px' }}>Email Verified</h1>
            <p style={{ color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>Your account is active. Sign in to continue.</p>
            <Link to="/auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: FLAME, color: '#fff', borderRadius: 12, padding: '14px 18px', fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase' }}>
              Sign In <ArrowRight size={16} />
            </Link>
          </>
        )}

        {error && (
          <>
            <XCircle size={42} color="#fb7185" style={{ marginBottom: 16 }} />
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', margin: '0 0 8px' }}>Verification Failed</h1>
            <p style={{ color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>{error}</p>
            <Link to="/auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: FLAME, color: '#fff', borderRadius: 12, padding: '14px 18px', fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase' }}>
              Back To Sign In
            </Link>
          </>
        )}

        {loading && <p style={{ color: MUTED }}>Verifying your email...</p>}
      </div>
    </div>
  );
};
