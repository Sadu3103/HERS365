import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ChevronRight, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const CoachLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/secure/coach/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Invalid credentials');
        return;
      }
      if (data.token) localStorage.setItem('coachToken', data.token);
      if (data.user) localStorage.setItem('coachUser', JSON.stringify(data.user));
      navigate('/coach');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-coral-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl max-w-md w-full p-10 md:p-14 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-coral-500 rounded-2xl flex items-center justify-center shadow-lg shadow-coral-500/30 mb-6">
            <Zap className="text-white fill-current" size={32} />
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Coach Portal</h2>
          <p className="text-ink-muted font-medium tracking-wide text-center">Sign in to discover and recruit athletes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-ink-muted ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-coral-500 transition-colors" size={20} />
              <input
                type="email" placeholder="coach@university.edu"
                value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-coral-500/50 transition-all text-white placeholder:text-ink-faint"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-ink-muted ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-coral-500 transition-colors" size={20} />
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-coral-500/50 transition-all text-white placeholder:text-ink-faint"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm font-semibold text-center">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-5 bg-coral-500 hover:bg-coral-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-coral-500/30 flex items-center justify-center gap-3 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-ink-muted">
          Need an account?{' '}
          <Link to="/coach/signup" className="text-coral-500 font-black uppercase tracking-widest hover:text-coral-400 transition-colors">
            Sign Up
          </Link>
        </p>

        <p className="text-center mt-4 text-sm text-ink-muted">
          Not a coach?{' '}
          <Link to="/auth" className="text-coral-500 font-black uppercase tracking-widest hover:text-coral-400 transition-colors">
            Athlete Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
