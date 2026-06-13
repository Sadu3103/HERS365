import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Chrome, Github } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { athleteAvatar } from '../lib/avatar';

const FLAME     = '#ff5a2d';
const FLAME_S   = '#ff8c66';
const INK       = '#0a0a0a';
const INK_2     = '#111111';
const LINE      = 'rgba(255,255,255,0.07)';
const LINE_2    = 'rgba(255,255,255,0.12)';
const MUTED     = '#8a8a86';
const MUTED_2   = '#5a5a56';
const DISP      = "'Barlow Condensed', sans-serif";
const BODY      = "'DM Sans', sans-serif";
const GRAIN     = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const GRID_BG = {
  backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
  backgroundSize: '56px 56px',
};

function FloatInput({
  label, type = 'text', value, onChange, required = false,
  icon: Icon, autoComplete,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon: React.ElementType; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const isPass   = type === 'password';
  const inputType = isPass && showPw ? 'text' : type;
  const lifted   = focused || value.length > 0;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${focused ? 'rgba(255,90,45,0.55)' : LINE}`,
        borderRadius: 14,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: focused ? '0 0 0 3px rgba(255,90,45,0.09)' : 'none',
      }}>
        <label style={{
          position: 'absolute', left: 46,
          top: lifted ? 9 : '50%',
          transform: lifted ? 'none' : 'translateY(-50%)',
          fontSize: lifted ? '.61rem' : '.9rem',
          fontWeight: lifted ? 800 : 500,
          letterSpacing: lifted ? '.18em' : 0,
          textTransform: lifted ? 'uppercase' : 'none',
          color: focused ? FLAME : MUTED,
          transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: 'none', lineHeight: 1, fontFamily: lifted ? DISP : BODY,
        }}>{label}</label>

        <Icon
          size={16}
          style={{
            position: 'absolute', left: 18, top: '50%',
            transform: 'translateY(-50%)',
            color: focused ? FLAME : MUTED_2,
            transition: 'color 0.2s', pointerEvents: 'none',
          }}
        />

        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            padding: lifted ? '24px 18px 9px 46px' : '18px 18px 18px 46px',
            fontSize: '0.95rem', color: '#f4f4f2', fontFamily: BODY,
            transition: 'padding 0.18s',
          }}
        />

        {isPass && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: MUTED, cursor: 'pointer',
              padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = FLAME_S)}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

export const Auth = () => {
  const [isLogin,  setIsLogin]  = useState(true);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate  = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { email, password };
      if (!isLogin && name) body.name = name;
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || data.message || 'Something went wrong'); return; }
      if (data.token && data.user) login(data.token, data.user);
      navigate(isLogin ? '/feed' : '/onboarding');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => { window.location.href = '/api/auth/google'; };
  const handleGithubSignIn = () => { window.location.href = '/api/auth/github'; };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: INK, color: '#f4f4f2', fontFamily: BODY, overflowX: 'hidden' }}>
      {/* Grain overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', opacity: 0.04, backgroundImage: GRAIN }} />

      {/* ── LEFT PANEL (desktop) ── */}
      <div
        className="hidden lg:flex"
        style={{
          width: '46%', flexShrink: 0, position: 'relative',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '44px 56px', borderRight: `1px solid ${LINE}`,
          background: `linear-gradient(160deg, ${INK}, #0c0808)`,
          overflow: 'hidden',
        }}
      >
        {/* Glow blobs */}
        <div style={{ position: 'absolute', width: 580, height: 580, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.38, top: -230, left: -200, background: `radial-gradient(circle,rgba(255,90,45,.5),transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.18, bottom: -100, right: -60, background: `radial-gradient(circle,rgba(255,90,45,.35),transparent 65%)`, pointerEvents: 'none' }} />
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none',
          ...GRID_BG,
          maskImage: 'radial-gradient(ellipse at 30% 50%,#000 0%,transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 50%,#000 0%,transparent 72%)',
        }} />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.6rem', letterSpacing: '.04em', textTransform: 'uppercase', position: 'relative', zIndex: 1, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          HERS<span style={{ color: FLAME }}>365</span>
        </motion.div>

        {/* Center headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <p style={{ fontFamily: DISP, fontWeight: 900, fontSize: 'clamp(2.8rem,4.2vw,4.2rem)', textTransform: 'uppercase', lineHeight: 0.88, letterSpacing: '.01em', margin: '0 0 24px' }}>
            YOUR GAME.<br />THEIR OFFER.<br /><span style={{ color: FLAME }}>YOUR FUTURE.</span>
          </p>
          <p style={{ color: MUTED, fontSize: '1.05rem', maxWidth: 340, lineHeight: 1.65, margin: 0 }}>
            The recruiting platform built from the ground up for girls flag football.
          </p>

          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 32 }}>
            <div style={{ display: 'flex' }}>
              {['Ava King', 'Maya Cruz', 'Zoe Bell', 'Tia Ford'].map((name, i) => (
                <span key={name} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: `2px solid ${INK}`, marginLeft: i ? -10 : 0,
                  backgroundImage: `url("${athleteAvatar(name)}")`,
                  backgroundSize: 'cover', backgroundPosition: 'center', display: 'block', flexShrink: 0,
                }} />
              ))}
            </div>
            <span style={{ color: MUTED, fontSize: '.88rem', lineHeight: 1.4 }}>
              Join <b style={{ color: '#f4f4f2' }}>4,200+</b> athletes<br />already on the grid
            </span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: 'flex', gap: 36, position: 'relative', zIndex: 1 }}
        >
          {[{ n: '4.2K', l: 'Athletes Ranked' }, { n: '380+', l: 'Coaches Scouting' }, { n: '1.1K', l: 'Offers Made' }].map(s => (
            <div key={s.l}>
              <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.9rem', color: FLAME, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: '.66rem', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED_2, marginTop: 5 }}>{s.l}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 28px', position: 'relative', background: INK_2 }}>
        {/* Subtle glow */}
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', filter: 'blur(80px)', opacity: 0.07, top: '35%', left: '50%', transform: 'translate(-50%,-50%)', background: FLAME, pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
        >
          {/* Mobile logo */}
          <div
            className="flex lg:hidden"
            style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 32, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            HERS<span style={{ color: FLAME }}>365</span>
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'l' : 's'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <h2 style={{ fontFamily: DISP, fontWeight: 900, fontSize: 'clamp(2.6rem,5vw,3.6rem)', textTransform: 'uppercase', lineHeight: 0.88, margin: '0 0 10px', letterSpacing: '.01em' }}>
                {isLogin ? 'Welcome\nBack.' : 'Join the\nElite.'}
              </h2>
              <p style={{ color: MUTED, fontSize: '1rem', margin: '0 0 32px' }}>
                {isLogin ? 'Sign in to your recruiting dashboard.' : 'Build your legacy in the HERS365 network.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Toggle pill */}
          <div style={{ display: 'flex', background: '#161616', borderRadius: 9999, padding: 3, marginBottom: 28, border: `1px solid ${LINE}` }}>
            {[{ label: 'Sign In', val: true }, { label: 'Create Account', val: false }].map(({ label, val }) => (
              <button
                key={label}
                onClick={() => { setIsLogin(val); setError(''); }}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 9999, border: 'none', cursor: 'pointer',
                  background: isLogin === val ? FLAME : 'transparent',
                  color: isLogin === val ? '#fff' : MUTED,
                  fontFamily: DISP, fontWeight: 800, fontSize: '.82rem',
                  letterSpacing: '.1em', textTransform: 'uppercase', transition: 'all 0.2s',
                  boxShadow: isLogin === val ? '0 4px 14px rgba(255,90,45,.3)' : 'none',
                }}
              >{label}</button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <FloatInput label="Full Name" icon={User} value={name} onChange={setName} autoComplete="name" />
                </motion.div>
              )}
            </AnimatePresence>

            <FloatInput label="Email Address" type="email" icon={Mail} value={email} onChange={setEmail} required autoComplete="email" />
            <FloatInput label="Password" type="password" icon={Lock} value={password} onChange={setPassword} required autoComplete={isLogin ? 'current-password' : 'new-password'} />

            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{ background: 'none', border: 'none', color: FLAME, fontSize: '.76rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: DISP }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ color: '#f87171', fontSize: '.875rem', marginBottom: 14, textAlign: 'center', fontWeight: 600 }}
                >{error}</motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px 24px',
                background: FLAME, color: '#fff', border: 'none', borderRadius: 14,
                fontFamily: DISP, fontWeight: 900, fontSize: '1.1rem',
                letterSpacing: '.1em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: loading ? 'none' : '0 8px 28px rgba(255,90,45,.32)',
                transition: 'transform .18s, box-shadow .2s, opacity .2s',
                opacity: loading ? 0.7 : 1, marginTop: 4,
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(255,90,45,.48)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,90,45,.32)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translateY(0px) scale(0.99)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            >
              {/* shimmer sweep */}
              <span style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
                transform: 'translateX(-100%)', animation: loading ? 'none' : 'auth-shimmer 2.4s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              {loading
                ? <><span className="auth-spinner" />{' Loading...'}</>
                : <>{isLogin ? 'Sign In' : 'Claim Your Profile'}<ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0' }}>
            <div style={{ flex: 1, height: 1, background: LINE }} />
            <span style={{ color: MUTED_2, fontSize: '.66rem', fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase', fontFamily: DISP }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: LINE }} />
          </div>

          {/* Social */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 26 }}>
            {[
              { label: 'Google', Icon: Chrome, action: handleGoogleSignIn },
              { label: 'GitHub', Icon: Github, action: handleGithubSignIn },
            ].map(({ label, Icon, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  padding: '13px', background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${LINE}`, borderRadius: 13,
                  color: MUTED, fontSize: '.8rem', fontWeight: 800, cursor: 'pointer',
                  transition: 'all .2s', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: DISP,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = LINE_2; e.currentTarget.style.color = '#f4f4f2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = MUTED; }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {!isLogin && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: '.68rem', textAlign: 'center', color: MUTED_2, letterSpacing: '.06em', lineHeight: 1.9, textTransform: 'uppercase', fontWeight: 700, fontFamily: DISP }}
            >
              By joining you agree to our{' '}
              <Link to="/terms" style={{ color: MUTED, textDecoration: 'underline', textDecorationColor: 'rgba(138,138,134,0.4)' }}>Terms</Link>{' '}
              and{' '}
              <Link to="/privacy" style={{ color: MUTED, textDecoration: 'underline', textDecorationColor: 'rgba(138,138,134,0.4)' }}>Privacy Policy</Link>
            </motion.p>
          )}
        </motion.div>
      </div>

      <style>{`
        @keyframes auth-shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        .auth-spinner {
          width: 17px; height: 17px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          animation: auth-spin 0.65s linear infinite;
          display: inline-block; flex-shrink: 0;
        }
        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
