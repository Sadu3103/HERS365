import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, errorMessage } from '../lib/api';

const FLAME   = '#ff5a2d';
const FLAME_S = '#ff8c66';
const INK     = '#0a0a0a';
const PANEL   = '#0c0808';
const FIELD   = 'rgba(255,255,255,0.02)';
const LINE    = 'rgba(255,255,255,0.08)';
const TEXT    = '#f4f4f2';
const MUTED   = '#9a9a96';
const MUTED_2 = '#7d7d78';
const DISP    = "'Barlow Condensed', sans-serif";
const BODY    = "'DM Sans', sans-serif";

const EASE: [number, number, number, number] = [0.22, 0.8, 0.2, 1];

export function ForgotPassword() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');
  const [focused,   setFocused]   = useState(false);
  const navigate = useNavigate();
  const reduced  = !!useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/email/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong — please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: INK,
      color: TEXT, fontFamily: BODY, overflowX: 'hidden',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Ambient orbs */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className={reduced ? '' : 'auth-orb auth-orb-a'} style={{
          position: 'absolute', width: 560, height: 560, borderRadius: '50%',
          filter: 'blur(120px)', opacity: 0.13, bottom: '-26%', left: '-16%',
          background: `radial-gradient(circle, ${FLAME}, transparent 62%)`,
          willChange: 'transform, opacity',
        }} />
        <div className={reduced ? '' : 'auth-orb auth-orb-b'} style={{
          position: 'absolute', width: 380, height: 380, borderRadius: '50%',
          filter: 'blur(110px)', opacity: 0.08, top: '-18%', right: '-12%',
          background: `radial-gradient(circle, ${FLAME_S}, transparent 64%)`,
          willChange: 'transform, opacity',
        }} />
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 440,
          margin: '0 auto', padding: '0 24px',
        }}
      >
        {/* Logo */}
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          initial={reduced ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{
            fontFamily: DISP, fontWeight: 900, fontSize: '1.4rem', letterSpacing: '.03em',
            textTransform: 'uppercase', cursor: 'pointer', background: 'none', border: 'none',
            color: TEXT, padding: 0, marginBottom: 40, display: 'block',
          }}
        >
          HERS<span style={{ color: FLAME }}>365</span>
        </motion.button>

        <div style={{
          background: PANEL, border: `1px solid ${LINE}`,
          borderRadius: 20, padding: '40px 36px',
        }}>
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <h1 style={{
                  fontFamily: DISP, fontWeight: 900, fontSize: '1.8rem',
                  letterSpacing: '.02em', textTransform: 'uppercase',
                  margin: '0 0 8px', color: TEXT,
                }}>
                  Forgot Password
                </h1>
                <p style={{ color: MUTED, fontSize: '.9rem', margin: '0 0 32px', lineHeight: 1.5 }}>
                  Enter your account email and we'll send you a reset link.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ marginBottom: 20 }}>
                    <label
                      htmlFor="fp-email"
                      style={{
                        display: 'block', fontFamily: DISP, fontWeight: 700,
                        fontSize: '.7rem', letterSpacing: '.16em', textTransform: 'uppercase',
                        color: focused ? FLAME : MUTED, marginBottom: 9, transition: 'color .2s',
                      }}
                    >
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={16}
                        aria-hidden
                        style={{
                          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                          color: focused ? FLAME : MUTED_2, transition: 'color .2s', pointerEvents: 'none',
                        }}
                      />
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="you@example.com"
                        style={{
                          width: '100%', background: FIELD,
                          border: `1px solid ${focused ? 'rgba(255,90,45,0.5)' : LINE}`,
                          borderRadius: 12,
                          outline: focused ? '2px solid rgba(255,90,45,0.9)' : 'none',
                          outlineOffset: 2,
                          padding: '15px 16px 15px 44px',
                          fontSize: '1rem', color: TEXT, fontFamily: BODY,
                          boxShadow: focused ? '0 0 0 3px rgba(255,90,45,0.08)' : 'none',
                          transition: 'border-color .2s, box-shadow .2s',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        role="alert"
                        aria-live="assertive"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                          color: '#ff9a8a', fontSize: '.84rem', margin: '0 0 16px',
                          fontWeight: 600, padding: '11px 14px', borderRadius: 10,
                          background: 'rgba(255,90,45,0.08)', border: '1px solid rgba(255,90,45,0.2)',
                        }}
                      >{error}</motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', padding: '16px 24px',
                      background: FLAME, color: '#fff', border: 'none', borderRadius: 12,
                      fontFamily: DISP, fontWeight: 900, fontSize: '1.05rem',
                      letterSpacing: '.08em', textTransform: 'uppercase',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: loading ? 'none' : '0 8px 26px rgba(255,90,45,.3)',
                      transition: 'transform .18s, box-shadow .2s, opacity .2s',
                      opacity: loading ? 0.75 : 1,
                    }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 34px rgba(255,90,45,.45)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = loading ? 'none' : '0 8px 26px rgba(255,90,45,.3)'; }}
                    onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.99)'; }}
                    onMouseUp={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  >
                    {loading
                      ? <><span className="auth-spinner" aria-hidden /> Sending…</>
                      : 'Send Reset Link'
                    }
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(255,90,45,0.12)', border: `1px solid rgba(255,90,45,0.25)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <CheckCircle size={26} color={FLAME} />
                </div>
                <h2 style={{
                  fontFamily: DISP, fontWeight: 900, fontSize: '1.6rem',
                  letterSpacing: '.02em', textTransform: 'uppercase',
                  margin: '0 0 12px', color: TEXT,
                }}>
                  Check Your Inbox
                </h2>
                <p style={{ color: MUTED, fontSize: '.9rem', lineHeight: 1.6, margin: '0 0 8px' }}>
                  If an account exists for <strong style={{ color: TEXT }}>{email}</strong>, we sent a reset link to that address.
                </p>
                <p style={{ color: MUTED_2, fontSize: '.8rem', lineHeight: 1.5, margin: 0 }}>
                  Didn't get it? Check your spam folder. The link expires in 1 hour.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Sign In */}
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${LINE}` }}>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', color: MUTED,
                fontFamily: DISP, fontWeight: 700, fontSize: '.78rem',
                letterSpacing: '.12em', textTransform: 'uppercase',
                cursor: 'pointer', padding: 0, transition: 'color .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = FLAME)}
              onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
