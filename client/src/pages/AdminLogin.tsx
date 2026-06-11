import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FLAME = '#ff5a2d';
const INK = '#0a0a0a';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const DISP = "'Barlow Condensed', sans-serif";

export const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.user?.role !== 'admin' && data.user?.role !== 'staff') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/admin/dashboard');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${FLAME}15`, border: `1.5px solid ${FLAME}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={22} color={FLAME} />
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Admin Access</h1>
          <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>HERS365 Internal Portal</p>
        </div>
        <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#f87171' }}>{error}</div>}
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 7 }}>Email</div>
            <input className="k-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@hers365.com" required style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 7 }}>Password</div>
            <input className="k-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '10px 14px' }} />
          </div>
          <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={loading} style={{ padding: '13px', background: FLAME, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.88rem', fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Lock size={15} />{loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
        </form>
      </div>
    </div>
  );
};
