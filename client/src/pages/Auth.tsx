import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ChevronRight, Github, Chrome, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
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
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { email, password };
      if (!isLogin && name) body.name = name;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Something went wrong');
        return;
      }
      if (data.token) localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => { window.location.href = '/api/auth/google'; };
  const handleGithubSignIn = () => { window.location.href = '/api/auth/github'; };
  const handleForgotPassword = () => { navigate('/forgot-password'); };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-coral-500/10 rounded-full blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl max-w-xl w-full p-10 md:p-14 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-coral-500 rounded-2xl flex items-center justify-center shadow-lg shadow-coral-500/30 mb-6">
            <Zap className="text-white fill-current" size={32} />
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
            {isLogin ? 'Welcome Back' : 'Join the Elite'}
          </h2>
          <p className="text-ink-muted font-medium tracking-wide">
            {isLogin ? 'Enter your credentials to access the grid.' : 'Build your legacy in the HERS365 network.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-ink-muted ml-1">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-coral-500 transition-colors" size={20} />
                <input type="text" placeholder="Athletic Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-coral-500/50 transition-all text-white placeholder:text-ink-faint" />
              </div>
            </motion.div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-ink-muted ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-coral-500 transition-colors" size={20} />
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-coral-500/50 transition-all text-white placeholder:text-ink-faint" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-ink-muted">Password</label>
              {isLogin && <button type="button" onClick={handleForgotPassword} className="text-[10px] uppercase font-black tracking-widest text-coral-500 hover:text-coral-400 transition-colors">Forgot?</button>}
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-coral-500 transition-colors" size={20} />
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-surface/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-coral-500/50 transition-all text-white placeholder:text-ink-faint" />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm font-semibold text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-5 bg-coral-500 hover:bg-coral-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-coral-500/30 flex items-center justify-center gap-3 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
        <div className="mt-8">
          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-[0.3em] text-ink-faint">Or continue with</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button onClick={handleGoogleSignIn} className="flex items-center justify-center gap-3 py-4 bg-surface-card/60 border border-surface-border rounded-2xl backdrop-blur-xl hover:bg-white/10 rounded-2xl text-ink-muted transition-all border border-white/5">
              <Chrome size={20} /><span className="text-xs font-bold uppercase tracking-widest">Google</span>
            </button>
            <button onClick={handleGithubSignIn} className="flex items-center justify-center gap-3 py-4 bg-surface-card/60 border border-surface-border rounded-2xl backdrop-blur-xl hover:bg-white/10 rounded-2xl text-ink-muted transition-all border border-white/5">
              <Github size={20} /><span className="text-xs font-bold uppercase tracking-widest">GitHub</span>
            </button>
          </div>
        </div>
        <p className="text-center mt-12 text-sm text-ink-muted font-medium">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="ml-2 text-coral-500 font-black uppercase tracking-widest hover:text-coral-400 transition-colors underline-offset-4 hover:underline">
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
        {!isLogin && (
          <p className="mt-8 text-[10px] text-center text-ink-faint font-bold uppercase tracking-widest leading-loose">
            By joining, you agree to our <Link to="/terms" className="text-ink-muted hover:text-white underline">Terms</Link> and <Link to="/privacy" className="text-ink-muted hover:text-white underline">Privacy Policy</Link>.
          </p>
        )}
      </motion.div>
    </div>
  );
};
