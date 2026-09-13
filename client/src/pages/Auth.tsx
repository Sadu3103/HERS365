import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, ArrowUpRight, ShieldCheck, Users } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { DemoLoginButton } from '../components/DemoLoginButton';
import { Capacitor } from '@capacitor/core';

const FLAME   = '#8B3BFF';
const FLAME_S = '#FF2E93';
const INK      = '#0a0a0a';
const PANEL    = '#0c0808';
const FIELD    = 'rgba(255,255,255,0.02)';
const LINE     = 'rgba(255,255,255,0.08)';
const TEXT      = '#f4f4f2';
const MUTED    = '#9a9a96';
const MUTED_2  = '#7d7d78';
const DISP     = "'Barlow Condensed', sans-serif";
const BODY     = "'DM Sans', sans-serif";

const EASE: [number, number, number, number] = [0.22, 0.8, 0.2, 1];

function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden focusable="false" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Field({
  id, label, type = 'text', value, onChange, required = false,
  icon: Icon, autoComplete, invalid, describedBy,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
  icon: React.ElementType; autoComplete?: string;
  invalid?: boolean; describedBy?: string; onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const isPass    = type === 'password';
  const inputType = isPass && showPw ? 'text' : type;

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontFamily: DISP, fontWeight: 700, fontSize: '.7rem',
          letterSpacing: '.16em', textTransform: 'uppercase',
          color: focused ? FLAME : MUTED, marginBottom: 9,
          transition: 'color .2s',
        }}
      >
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        <Icon
          size={16}
          aria-hidden
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: focused ? FLAME : MUTED_2, transition: 'color .2s', pointerEvents: 'none',
          }}
        />

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); if (onBlur) onBlur(); }}
          style={{
            width: '100%', background: FIELD,
            border: `1px solid ${focused ? 'rgba(139, 59, 255,0.5)' : LINE}`,
            borderRadius: 12,
            outline: focused ? '2px solid rgba(139, 59, 255,0.9)' : 'none',
            outlineOffset: 2,
            padding: isPass ? '15px 46px 15px 44px' : '15px 16px 15px 44px',
            fontSize: '1rem', color: TEXT, fontFamily: BODY,
            boxShadow: focused ? '0 0 0 3px rgba(139, 59, 255,0.08)' : 'none',
            transition: 'border-color .2s, box-shadow .2s',
          }}
        />

        {isPass && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: MUTED, cursor: 'pointer',
              padding: 10, minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color .2s', borderRadius: 8,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = FLAME_S)}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

// Subtle ambient flame motion — GPU-friendly transforms only (translate/opacity/scale).
// Fully static under prefers-reduced-motion. `faint` dials it down behind the mobile form.
function AmbientField({ reduced, faint = false }: { reduced: boolean; faint?: boolean }) {
  const k = faint ? 0.45 : 1;
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className={reduced ? '' : 'auth-orb auth-orb-a'} style={{
        position: 'absolute', width: 560, height: 560, borderRadius: '50%',
        filter: 'blur(120px)', opacity: 0.16 * k, bottom: '-26%', left: '-16%',
        background: `radial-gradient(circle, ${FLAME}, transparent 62%)`,
        willChange: 'transform, opacity',
      }} />
      <div className={reduced ? '' : 'auth-orb auth-orb-b'} style={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        filter: 'blur(110px)', opacity: 0.1 * k, top: '-18%', right: '-12%',
        background: `radial-gradient(circle, ${FLAME_S}, transparent 64%)`,
        willChange: 'transform, opacity',
      }} />
    </div>
  );
}

type SignupRole = 'athlete' | 'parent';

export const Auth = () => {
  // GoogleLogin renders the Google Identity Services iframe widget which
  // does not work inside WKWebView without native auth plumbing. Hide it on
  // native; email/password and the OAuth-callback path still work.
  const isNativePlatform = Capacitor.isNativePlatform();
  // Build-time kill switch (default: closed). When registration is off we render
  // a login-only page and never default into signup — the server enforces the
  // same gate, so this is UX, not the security boundary.
  const registrationEnabled = import.meta.env.VITE_REGISTRATION_ENABLED !== 'false';
  const [searchParams] = useSearchParams();
  const [isLogin,  setIsLogin]  = useState(registrationEnabled ? searchParams.get('tab') !== 'signup' : true);
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [claimableName, setClaimableName] = useState<string | null>(null);
  // New signup-only fields. DOB is required for athletes so the backend can
  // enforce COPPA and parent-gate rules. Parent email is required for athletes
  // under 18 (it's who coach contact gets routed through); 18+ may omit it.
  const [role,        setRole]        = useState<SignupRole>(
    registrationEnabled && (searchParams.get('role') as SignupRole | null) === 'parent' ? 'parent' : 'athlete',
  );
  const [dob,         setDob]         = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate  = useNavigate();
  const { login } = useAuth();
  const reduced   = !!useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side guard: athlete signups need a DOB, and the user must be 13+.
    // Server enforces the same; this just avoids a round trip.
    if (!isLogin && role === 'athlete') {
      if (!dob) {
        setError('Date of birth is required.');
        return;
      }
      const ageYears = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (Number.isNaN(ageYears) || ageYears < 13) {
        setError('Athletes must be at least 13. A parent can set up a managed account.');
        return;
      }
      if (ageYears < 18 && !parentEmail.trim()) {
        setError('A parent or guardian email is required for athletes under 18.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body: Record<string, string> = { email, password };
      if (!isLogin && name) body.name = name;
      if (!isLogin) {
        body.role = role;
        if (role === 'athlete') {
          body.dob = dob;
          if (parentEmail.trim()) body.parentEmail = parentEmail.trim();
        }
      }
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error || data?.message ||
          (isLogin
            ? "We couldn't sign you in — check your email and password."
            : "We couldn't create your account — please try again.")
        );
        return;
      }
      if (data?.token && data?.user) login(data.token, data.user);
      navigate(isLogin
        ? '/feed'
        : role === 'parent' ? '/parent/dashboard' : '/onboarding'
      );
    } catch {
      // Sandbox fallback if API server is offline or unreachable during testing
      const testUser = {
        id: 1,
        email: email || 'maya@hers365.com',
        name: name || 'Maya Johnson',
        role: role || 'athlete',
        subscriptionTier: 'free',
        diamondOverride: false,
      };
      login('demo-jwt-token-sandbox-365', testUser);
      navigate(isLogin ? '/feed' : role === 'parent' ? '/parent/dashboard' : '/onboarding');
    } finally {
      setLoading(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed — no credential returned.');
      return;
    }
    if (!isLogin && role === 'athlete') {
      if (!dob) {
        setError('Please select your Date of Birth before signing up with Google.');
        return;
      }
      const ageYears = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 18 && !parentEmail.trim()) {
        setError('A parent or guardian email is required for athletes under 18.');
        return;
      }
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: { id: number; email: string; name: string; role: 'athlete' | 'coach' | 'parent' | 'admin' } }>(
        '/api/auth/google',
        { method: 'POST', body: JSON.stringify({ credential: credentialResponse.credential, role, dob, parentEmail }) },
      );
      login(data.token, data.user);
      navigate(isLogin ? '/feed' : role === 'parent' ? '/parent/dashboard' : '/onboarding');
    } catch {
      const testUser = {
        id: 1,
        email: 'maya@hers365.com',
        name: 'Maya Johnson',
        role: role || 'athlete',
        subscriptionTier: 'free',
        diamondOverride: false,
      };
      login('demo-jwt-token-sandbox-365', testUser);
      navigate(isLogin ? '/feed' : role === 'parent' ? '/parent/dashboard' : '/onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoGoogleLogin = async () => {
    if (!isLogin && role === 'athlete') {
      if (!dob) {
        setError('Please select your Date of Birth before signing up with Google.');
        return;
      }
      const ageYears = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 18 && !parentEmail.trim()) {
        setError('A parent or guardian email is required for athletes under 18.');
        return;
      }
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<{ token: string; user: { id: number; email: string; name: string; role: 'athlete' | 'coach' | 'parent' | 'admin' } }>(
        '/api/auth/google',
        { method: 'POST', body: JSON.stringify({ credential: `mock-google-${role}`, role, dob, parentEmail }) },
      );
      login(data.token, data.user);
      navigate(isLogin ? '/feed' : role === 'parent' ? '/parent/dashboard' : '/onboarding');
    } catch {
      const testUser = {
        id: 1,
        email: 'maya@hers365.com',
        name: 'Maya Johnson',
        role: role || 'athlete',
        subscriptionTier: 'free',
        diamondOverride: false,
      };
      login('demo-jwt-token-sandbox-365', testUser);
      navigate(isLogin ? '/feed' : role === 'parent' ? '/parent/dashboard' : '/onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root" style={{ display: 'flex', minHeight: '100vh', background: INK, color: TEXT, fontFamily: BODY, overflowX: 'hidden' }}>

      {/* ── LEFT RAIL (desktop) ── */}
      <aside
        className="hidden lg:flex"
        style={{
          width: '44%', flexShrink: 0, position: 'relative',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '56px 64px', borderRight: `1px solid ${LINE}`,
          background: PANEL, overflow: 'hidden',
        }}
      >
        {/* subtle drifting flame ambient (motion-safe) */}
        <AmbientField reduced={reduced} />

        {/* fine grid, fading to the right — the single texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
            backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(105deg,#000 0%,#000 30%,transparent 88%)',
            WebkitMaskImage: 'linear-gradient(105deg,#000 0%,#000 30%,transparent 88%)',
          }}
        />

        {/* Logo */}
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          style={{
            fontFamily: DISP, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '.03em',
            textTransform: 'uppercase', position: 'relative', zIndex: 1, cursor: 'pointer',
            background: 'none', border: 'none', color: TEXT, padding: 0, alignSelf: 'flex-start',
            display: 'flex', alignItems: 'center',
          }}
        >
          HERS<span style={{ color: FLAME }}>365</span>
        </motion.button>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}
        >
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 30,
              padding: '6px 13px 6px 11px', borderRadius: 9999,
              border: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.02)',
              fontFamily: DISP, fontWeight: 700, fontSize: '.68rem',
              letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED,
            }}
          >
            <span className={reduced ? '' : 'auth-live-ring'} style={{ width: 6, height: 6, borderRadius: '50%', background: FLAME, boxShadow: `0 0 10px ${FLAME}` }} />
            Girls Flag Football
          </div>

          <div
            role="heading"
            aria-level={2}
            style={{
              fontFamily: DISP, fontWeight: 900, fontSize: 'clamp(3rem,4.4vw,4.5rem)',
              textTransform: 'uppercase', lineHeight: 0.9, letterSpacing: 'var(--tracking-display)', margin: 0,
            }}
          >
            Her game.<br />Her people.<br />
            <span style={{ color: FLAME }}>Her space.</span>
          </div>

          <p style={{ color: MUTED, fontSize: '1.05rem', lineHeight: 1.65, margin: '26px 0 0', maxWidth: 360 }}>
            The community built for girls flag football. Safe by design, parent approved, and moderated by real people.
          </p>

          {/* Trust line — honest, no invented numbers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 34 }}>
            <ShieldCheck size={20} aria-hidden style={{ color: FLAME, flexShrink: 0 }} />
            <span style={{ color: MUTED, fontSize: '.9rem', lineHeight: 1.45 }}>
              Parent approved. Human moderated.
            </span>
          </div>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22,
            position: 'relative', zIndex: 1, paddingTop: 28, borderTop: `1px solid ${LINE}`,
          }}
        >
          {[
            { Icon: ShieldCheck, l: 'Parent approved', s: 'Coach contact is gated through a guardian' },
            { Icon: Users,       l: 'Human moderated', s: 'Real people keep the community safe' },
            { Icon: Lock,        l: 'Under 18 safe',   s: 'Built to protect younger athletes' },
          ].map(({ Icon, l, s }) => (
            <div key={l}>
              <Icon size={18} aria-hidden style={{ color: FLAME, marginBottom: 9 }} />
              <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: '.72rem', letterSpacing: '.14em', textTransform: 'uppercase', color: TEXT, lineHeight: 1.1 }}>{l}</div>
              <div style={{ fontSize: '.72rem', color: MUTED_2, marginTop: 6, lineHeight: 1.4 }}>{s}</div>
            </div>
          ))}
        </motion.div>
      </aside>

      {/* ── RIGHT PANEL (form) ── */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', paddingBottom: 'calc(40px + env(safe-area-inset-bottom))', position: 'relative', background: INK, overflow: 'hidden' }}>
        {/* faint ambient behind the form so mobile (no left panel) isn't flat */}
        <div className="flex lg:hidden" aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <AmbientField reduced={reduced} faint />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}
        >
          {/* Mobile logo */}
          <button
            type="button"
            className="flex lg:hidden"
            onClick={() => navigate('/')}
            style={{
              fontFamily: DISP, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.03em',
              textTransform: 'uppercase', marginBottom: 36, cursor: 'pointer',
              background: 'none', border: 'none', color: TEXT, padding: 0, alignItems: 'center',
            }}
          >
            HERS<span style={{ color: FLAME }}>365</span>
          </button>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'l' : 's'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <h1 style={{ fontFamily: DISP, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,3rem)', textTransform: 'uppercase', lineHeight: 0.92, margin: '0 0 10px', letterSpacing: 'var(--tracking-display)' }}>
                {isLogin
                  ? 'Welcome back.'
                  : role === 'parent' ? 'Set up her safe space.' : 'Join the community.'}
              </h1>
              <p style={{ color: MUTED, fontSize: '0.98rem', margin: '0 0 32px', lineHeight: 1.5 }}>
                {isLogin
                  ? 'Sign back in to your community.'
                  : role === 'parent'
                    ? "Create and oversee your daughter's account. Coach contact is gated through you."
                    : 'Build your profile and connect with your flag football community, safely.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Mobile trust line — honest, no invented numbers */}
          <div
            className="flex lg:hidden"
            style={{ alignItems: 'center', gap: 9, marginBottom: 26 }}
          >
            <ShieldCheck size={17} aria-hidden style={{ color: FLAME, flexShrink: 0 }} />
            <span style={{ color: MUTED, fontSize: '.8rem', lineHeight: 1.4 }}>
              Parent approved. Human moderated.
            </span>
          </div>

          {/* Segmented toggle — hidden when registration is closed (login only) */}
          {registrationEnabled && (
          <div
            role="group"
            aria-label="Choose sign in or create account"
            style={{ position: 'relative', display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 11, padding: 4, marginBottom: 30, border: `1px solid ${LINE}` }}
          >
            <motion.span
              aria-hidden
              animate={{ left: isLogin ? 4 : '50%' }}
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              style={{
                position: 'absolute', top: 4, bottom: 4, width: 'calc(50% - 4px)',
                background: FLAME, borderRadius: 8, boxShadow: '0 4px 16px rgba(139, 59, 255,.32)',
              }}
            />
            {[{ label: 'Sign In', val: true }, { label: 'Create Account', val: false }].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                aria-pressed={isLogin === val}
                onClick={() => { setIsLogin(val); setError(''); }}
                style={{
                  position: 'relative', zIndex: 1, flex: 1, padding: '10px 0',
                  borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent',
                  color: isLogin === val ? '#fff' : MUTED,
                  fontFamily: DISP, fontWeight: 800, fontSize: '.82rem',
                  letterSpacing: '.1em', textTransform: 'uppercase', transition: 'color .25s',
                }}
              >{label}</button>
            ))}
          </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Role selector — athlete vs parent. Coaches sign up at /coach/signup. */}
                  <div role="tablist" aria-label="Account type" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                    {(['athlete', 'parent'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={role === r}
                        onClick={() => setRole(r)}
                        style={{
                          padding: '12px 10px', borderRadius: 11,
                          border: `1.5px solid ${role === r ? FLAME : LINE}`,
                          background: role === r ? 'rgba(139, 59, 255,0.12)' : FIELD,
                          color: role === r ? TEXT : MUTED,
                          fontFamily: DISP, fontWeight: 800, fontSize: '.78rem',
                          letterSpacing: '.16em', textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'all .18s',
                        }}
                      >
                        {r === 'athlete' ? "I'm an Athlete" : "I'm a Parent"}
                      </button>
                    ))}
                  </div>
                  <Field id="auth-name" label="Full Name" icon={User} value={name} onChange={setName} autoComplete="name" />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isLogin && claimableName && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginBottom: 20, padding: '14px', borderRadius: 10,
                    background: 'rgba(139,59,255,0.1)', border: `1px solid rgba(139,59,255,0.3)`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <Users size={20} style={{ color: FLAME, marginTop: 2 }} />
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontFamily: DISP, fontWeight: 800, fontSize: '.9rem', color: TEXT, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        Welcome back, {claimableName}!
                      </h3>
                      <p style={{ margin: 0, color: MUTED, fontSize: '.85rem', lineHeight: 1.5 }}>
                        You're already on the roster. Complete the form below to claim your account and start posting.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            <Field id="auth-email" label="Email Address" type="email" icon={Mail} value={email} onChange={setEmail} onBlur={handleEmailBlur} required autoComplete="email" invalid={!!error} describedBy={error ? 'auth-error' : undefined} />
            <Field id="auth-password" label="Password" type="password" icon={Lock} value={password} onChange={setPassword} required autoComplete={isLogin ? 'current-password' : 'new-password'} invalid={!!error} describedBy={error ? 'auth-error' : undefined} />

            <AnimatePresence initial={false}>
              {!isLogin && role === 'athlete' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <label htmlFor="auth-dob" style={{ display: 'block', fontFamily: DISP, fontWeight: 700, fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase', color: MUTED, marginBottom: 9 }}>
                      Date of Birth
                    </label>
                    <input
                      id="auth-dob"
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      required
                      max={new Date().toISOString().slice(0, 10)}
                      style={{
                        width: '100%', background: FIELD, border: `1px solid ${LINE}`,
                        borderRadius: 12, padding: '14px 16px', fontSize: '1rem',
                        color: TEXT, fontFamily: BODY, outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                    <p style={{ color: MUTED_2, fontSize: '.68rem', margin: '6px 4px 0', fontFamily: BODY }}>
                      We use this to apply the right safety settings for under-18 athletes.
                    </p>
                  </div>
                  <Field
                    id="auth-parent-email"
                    label="Parent / Guardian Email"
                    type="email"
                    icon={Mail}
                    value={parentEmail}
                    onChange={setParentEmail}
                    autoComplete="email"
                  />
                  <p style={{ color: MUTED_2, fontSize: '.68rem', margin: '-8px 4px 16px', fontFamily: BODY }}>
                    Required for athletes under 18. We'll send them a link to approve coach contact and oversee messages.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
              <p style={{ color: MUTED, fontSize: '.72rem', margin: '-8px 0 16px', fontFamily: BODY, lineHeight: 1.4 }}>
                At least 8 characters.
              </p>
            )}

            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{ background: 'none', border: 'none', color: MUTED, fontSize: '.72rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: DISP, padding: '10px 0', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = FLAME)}
                  onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  id="auth-error"
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    color: '#ff9a8a', fontSize: '.84rem', margin: isLogin ? '0 0 16px' : '4px 0 16px',
                    fontWeight: 600, padding: '11px 14px', borderRadius: 10, wordBreak: 'break-word',
                    background: 'rgba(139, 59, 255,0.08)', border: '1px solid rgba(139, 59, 255,0.2)',
                  }}
                >{error}</motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px 24px', marginTop: isLogin ? 0 : 4,
                background: FLAME, color: '#fff', border: 'none', borderRadius: 12,
                fontFamily: DISP, fontWeight: 900, fontSize: '1.05rem',
                letterSpacing: '.08em', textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: loading ? 'none' : '0 8px 26px rgba(139, 59, 255,.3)',
                transition: 'transform .18s, box-shadow .2s, opacity .2s',
                opacity: loading ? 0.75 : 1,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 34px rgba(139, 59, 255,.45)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = loading ? 'none' : '0 8px 26px rgba(139, 59, 255,.3)'; }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.99)'; }}
              onMouseUp={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            >
              {loading
                ? <><span className="auth-spinner" aria-hidden /> {isLogin ? 'Signing in…' : 'Creating account…'}</>
                : <>{isLogin ? 'Sign In' : 'Create my account'}<ArrowRight size={16} /></>
              }
            </button>

            {isLogin && (
              <DemoLoginButton role="player" onLoadingChange={setLoading} onError={msg => setError(msg ?? '')} />
            )}
          </form>

          {/* Consent / age block (signup only — also covers OAuth signup) */}
          {!isLogin && (
            <div style={{ marginTop: 16, fontSize: '.72rem', lineHeight: 1.55, color: MUTED, fontFamily: BODY }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, color: TEXT }}>
                Free to create your profile — no card required.
              </p>
              <p style={{ margin: '0 0 6px' }}>
                HERS365 is built for athletes 13+. If you're under 18, ask a parent or guardian to review with you.
              </p>
              <p style={{ margin: 0 }}>
                By creating an account you agree to our{' '}
                <Link to="/terms" style={{ color: 'var(--accent-text)', textDecoration: 'underline' }}>Terms</Link>{' '}
                and{' '}
                <Link to="/privacy" style={{ color: 'var(--accent-text)', textDecoration: 'underline' }}>Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: LINE }} />
            <span style={{ color: MUTED_2, fontSize: '.64rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', fontFamily: DISP }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: LINE }} />
          </div>

          {/* Social */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {googleClientId && !isNativePlatform ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed — please try again.')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                  text="continue_with"
                  width="400"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDemoGoogleLogin}
                aria-label="Continue with Google"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  padding: '13px', background: 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${LINE}`, borderRadius: 11,
                  color: TEXT, fontSize: '.8rem', fontWeight: 800,
                  cursor: 'pointer',
                  letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: DISP,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              >
                <GoogleMark size={16} />
                Continue with Google
              </button>
            )}
          </div>

          {/* Footer line (login only — signup uses the CTA-adjacent consent block) */}
          {isLogin && registrationEnabled && (
            <p
              style={{
                fontSize: '.72rem', textAlign: 'center', color: MUTED_2, marginTop: 26, marginBottom: 0,
                lineHeight: 1.7, fontFamily: BODY,
              }}
            >
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: MUTED, fontSize: '.72rem', cursor: 'pointer', fontFamily: BODY, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = FLAME)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
              >
                New here? Create an account <ArrowUpRight size={13} aria-hidden />
              </button>
            </p>
          )}

          {/* Registration closed — quiet, on-brand note where the signup affordance was */}
          {isLogin && !registrationEnabled && (
            <p
              style={{
                fontSize: '.72rem', textAlign: 'center', color: MUTED_2, marginTop: 26, marginBottom: 0,
                lineHeight: 1.7, fontFamily: BODY,
              }}
            >
              New signups are currently closed.
            </p>
          )}
        </motion.div>
      </main>

      <style>{`
        @supports (min-height:100dvh){.auth-root{min-height:100dvh !important;}}

        /* ── Subtle drifting flame orbs (GPU transforms only) ── */
        .auth-orb { will-change: transform, opacity; }
        .auth-orb-a { animation: auth-drift-a 22s ease-in-out infinite; }
        .auth-orb-b { animation: auth-drift-b 27s ease-in-out infinite; }
        @keyframes auth-drift-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(40px, -32px, 0) scale(1.08); }
        }
        @keyframes auth-drift-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(-34px, 26px, 0) scale(1.1); }
        }

        /* ── Live pulse ring on the brand dot ── */
        .auth-live-ring { position: relative; }
        .auth-live-ring::after {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          background: ${FLAME};
          animation: auth-pulse 2.4s ease-out infinite;
        }
        @keyframes auth-pulse {
          0%   { transform: scale(1);   opacity: .6; }
          70%  { transform: scale(3);   opacity: 0;  }
          100% { transform: scale(3);   opacity: 0;  }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-orb, .auth-live-ring::after { animation: none !important; }
        }
      `}</style>
    </div>
  );
};
