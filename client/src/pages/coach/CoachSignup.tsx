import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Building2, Trophy, Shield, ChevronRight, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const DIVISIONS = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'NJCAA', 'High School'];

export const CoachSignup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool] = useState('');
  const [sport, setSport] = useState('Flag Football');
  const [division, setDivision] = useState(DIVISIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/secure/coach/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, school, sport, division }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Unable to create account');
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
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6 cyber-grid">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card max-w-md w-full p-10 md:p-14 relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6">
            <Zap className="text-white fill-current" size={32} />
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Coach Signup</h2>
          <p className="text-dark-300 font-medium tracking-wide text-center">Create your account to discover and recruit athletes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                type="text" placeholder="Coach Jane Doe"
                value={name} onChange={e => setName(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                type="email" placeholder="coach@university.edu"
                value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                type="password" placeholder="••••••••"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">School / Organization</label>
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                type="text" placeholder="University of Example"
                value={school} onChange={e => setSchool(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">Sport</label>
            <div className="relative group">
              <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors" size={20} />
              <input
                type="text" placeholder="Flag Football"
                value={sport} onChange={e => setSport(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white placeholder:text-dark-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-dark-400 ml-1">Division</label>
            <div className="relative group">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 group-focus-within:text-brand-500 transition-colors z-10" size={20} />
              <select
                value={division} onChange={e => setDivision(e.target.value)} required
                className="w-full bg-dark-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-500/50 transition-all text-white appearance-none cursor-pointer"
              >
                {DIVISIONS.map(d => (
                  <option key={d} value={d} className="bg-dark-900 text-white">{d}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 rotate-90 pointer-events-none" size={18} />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm font-semibold text-center">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-brand-500/30 flex items-center justify-center gap-3 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-dark-400">
          Already have an account?{' '}
          <Link to="/coach/login" className="text-brand-500 font-black uppercase tracking-widest hover:text-brand-400 transition-colors">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
