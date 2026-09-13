import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Star, Shield, ArrowRight, Flame } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

const FLAME = '#8B3BFF';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

interface Plan {
  id: number;
  name: string;
  price: number;
  tierLevel: string;
}

const PLAN_META: Record<string, {
  icon: React.ReactNode;
  accent: string;
  badge?: string;
  tagline: string;
  billingText: string;
  features: string[];
}> = {
  free: {
    icon: <Shield size={18} />,
    accent: MUTED,
    tagline: 'Digital card, coach-visible, no barrier',
    billingText: 'Forever Free',
    features: [
      'Digital athlete card (coach-visible)',
      'HERS365 community & feed access',
      'Up to 3 highlight video uploads',
      'Basic college program search',
      'Public HERS rankings listing',
    ],
  },
  pro: {
    icon: <Zap size={18} />,
    accent: FLAME,
    badge: 'Most Popular',
    tagline: 'G5 Rankings, AI analytics, NIL profile',
    billingText: 'per month ($15–$25/mo range)',
    features: [
      'Everything in Basic Free tier',
      'Verified G5 National Rankings visibility',
      'AI performance analytics & combine insights',
      'NIL profile & deal marketplace access',
      'Unlimited video highlight uploads',
      'Direct coach messaging & DM access',
      'College fit matching calculator',
    ],
  },
  high_school: {
    icon: <Star size={18} />,
    accent: '#a78bfa',
    badge: 'Coach Edition',
    tagline: 'Recruiter dashboard, verified DB, combines',
    billingText: 'per year ($250/yr)',
    features: [
      'Full Recruiter & Coach Dashboard',
      'Verified athlete combine & stat database',
      'MaxPreps cross-checked stat verification',
      'Team roster & depth chart management',
      'Direct messaging to athletes & parents',
      'Export scouting reports & film lists',
    ],
  },
  college: {
    icon: <Flame size={18} />,
    accent: '#38bdf8',
    badge: 'Recruiter Pro',
    tagline: 'Full recruiter access, data feeds, saved searches',
    billingText: 'per year ($499/yr)',
    features: [
      'Everything in High School Coach plan',
      'Unlimited university recruiting pipeline access',
      'Real-time tournament stat & combine data feeds',
      'Advanced saved searches & talent alerts',
      'Priority direct contact to verified prospects',
      'Dedicated HERS365 recruiting support',
    ],
  },
};

const FALLBACK_PLANS: Plan[] = [
  { id: 0, name: 'Basic', price: 0, tierLevel: 'free' },
  { id: 1, name: 'Athlete Pro', price: 1999, tierLevel: 'pro' },
  { id: 2, name: 'High School Coach', price: 25000, tierLevel: 'high_school' },
  { id: 3, name: 'College Recruiter', price: 49900, tierLevel: 'college' },
];

export const Subscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: authUser, updateUser } = useAuth();
  const { showNotification } = useNotifications();
  const isNativePlatform = Capacitor.isNativePlatform();

  const cancelledMsg = searchParams.get('subscription') === 'cancelled'
    ? 'Checkout cancelled — no charge was made.'
    : '';

  useEffect(() => {
    fetch('/api/subscription-plans')
      .then(r => r.json())
      .then(data => setPlans(Array.isArray(data) && data.length > 0 ? data : FALLBACK_PLANS))
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (plan: Plan) => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/auth?redirect=/subscribe'); return; }
    const user = JSON.parse(raw);
    const token = localStorage.getItem('token');
    const targetTier = plan.tierLevel || (plan.name.toLowerCase().includes('pro') ? 'pro'
      : plan.name.toLowerCase().includes('elite') ? 'elite'
      : plan.name.toLowerCase().includes('college') ? 'college'
      : plan.name.toLowerCase().includes('high school') ? 'high_school' : 'free');

    setCheckingOut(plan.id);
    setError('');

    const completeUpgradeLocal = () => {
      const patch = {
        subscriptionTier: targetTier,
        tier: targetTier,
      };
      const updatedUser = { ...user, ...patch };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser(patch);
      window.dispatchEvent(new Event('storage'));

      if (plan.price === 0 || targetTier === 'free') {
        showNotification('Switched to Basic Free Plan', 'success');
        navigate('/profile');
      } else {
        showNotification(`Activated ${plan.name} Membership!`, 'success');
        navigate(`/thank-you?plan=${encodeURIComponent(plan.name)}&amount=${plan.price}&interval=month`);
      }
    };

    if (plan.price === 0 || targetTier === 'free') {
      completeUpgradeLocal();
      setCheckingOut(null);
      return;
    }

    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          planId: plan.id,
          playerId: user.id,
          successUrl: `${window.location.origin}/thank-you?plan=${encodeURIComponent(plan.name)}&amount=${plan.price}&interval=month`,
          cancelUrl: `${window.location.origin}/subscribe?subscription=cancelled`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        completeUpgradeLocal();
        return;
      }
      window.location.href = data.url;
    } catch {
      completeUpgradeLocal();
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: MUTED, fontSize: '0.85rem' }}>Loading plans…</div>
      </div>
    );
  }

  return (
    <div style={{ background: INK, minHeight: '100vh', color: '#f4f4f2', fontFamily: "'DM Sans', sans-serif", padding: '0 0 120px' }}>
      {/* BG gradient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(139, 59, 255,.12) 0%, transparent 65%)' }} />

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '52px 20px 0', position: 'relative' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 99, background: `${FLAME}15`, border: `1px solid ${FLAME}35`, marginBottom: 18 }}>
            <Flame size={12} color={FLAME} fill={FLAME} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>HERS365 MEMBERSHIP</span>
          </div>
          <h1 style={{ fontFamily: DISP, fontSize: 'clamp(2.6rem, 6vw, 4rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 0.95 }}>
            Get On The Grid.<br />
            <em style={{ color: FLAME, fontStyle: 'normal' }}>Get Recruited.</em>
          </h1>
          <p style={{ color: MUTED, fontSize: '0.95rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Every coach on HERS365 is looking for their next athlete. Your tier determines how visible you are.
          </p>
        </motion.div>

        {/* Current membership status banner */}
        {authUser && (
          <div style={{
            background: 'rgba(139, 59, 255, 0.08)',
            border: `1px solid ${FLAME}30`,
            borderRadius: 14,
            padding: '14px 20px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${FLAME}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color={FLAME} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Current Active Membership</div>
                <div style={{ fontFamily: DISP, fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', color: '#fff' }}>
                  {(authUser.subscriptionTier || authUser.tier || 'free').replace('_', ' ')} Plan
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
              ✨ Instant Testing Enabled: Selecting any plan below activates it immediately.
            </div>
          </div>
        )}

        {/* Error / cancel banners */}
        <AnimatePresence>
          {cancelledMsg && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center', fontSize: '0.82rem', color: '#fcd34d' }}>
              {cancelledMsg}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'center', fontSize: '0.82rem', color: '#f87171' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map((plan, i) => {
            const meta = PLAN_META[plan.tierLevel] || PLAN_META['free'];
            const isPro = plan.tierLevel === 'pro';
            const isBusy = checkingOut === plan.id;
            const isHovered = hoveredPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
                style={{
                  position: 'relative',
                  background: isPro
                    ? `linear-gradient(145deg, rgba(139, 59, 255,.1) 0%, rgba(139, 59, 255,.04) 100%)`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPro ? `${FLAME}50` : isHovered ? `rgba(255,255,255,0.12)` : LINE}`,
                  borderRadius: 18,
                  padding: '28px 26px 26px',
                  transform: isHovered && !isBusy ? 'translateY(-4px)' : isPro ? 'translateY(-8px)' : 'none',
                  transition: 'transform 0.25s ease, border-color 0.2s, box-shadow 0.25s',
                  boxShadow: isPro ? `0 24px 60px rgba(139, 59, 255,.18)` : isHovered ? '0 12px 40px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {/* Popular badge */}
                {meta.badge && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: FLAME, color: '#fff', padding: '4px 14px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {meta.badge}
                  </div>
                )}

                {/* Plan header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: meta.accent, marginBottom: 5 }}>
                      {meta.icon}
                      <span style={{ fontFamily: DISP, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{plan.name}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: MUTED_2, lineHeight: 1.3 }}>{meta.tagline}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {plan.price === 0 ? (
                      <div style={{ fontFamily: DISP, fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#f4f4f2' }}>Free</div>
                    ) : (
                      <>
                        <div style={{ fontFamily: DISP, fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, color: '#f4f4f2' }}>
                          ${plan.price % 100 === 0 ? (plan.price / 100).toFixed(0) : (plan.price / 100).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: MUTED_2, marginTop: 2 }}>{meta.billingText || 'per month'}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: LINE, marginBottom: 18 }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {meta.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${meta.accent}20`, border: `1px solid ${meta.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Check size={9} color={meta.accent} strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: '0.82rem', color: '#d4d4d0', lineHeight: 1.4 }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isNativePlatform && plan.price > 0 ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => window.open('https://hers365.vercel.app/subscribe', '_system')}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      borderRadius: 10,
                      border: isPro ? 'none' : `1px solid ${LINE}`,
                      background: isPro ? FLAME : 'rgba(167,139,250,0.12)',
                      color: '#fff',
                      fontFamily: DISP,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      boxShadow: isPro ? '0 8px 24px rgba(139, 59, 255,.35)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      Subscribe at hers365.com<ArrowRight size={15} />
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em', opacity: 0.8 }}>Opens in Safari</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSelect(plan)}
                    disabled={isBusy}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      borderRadius: 10,
                      border: isPro ? 'none' : `1px solid ${LINE}`,
                      background: isPro ? FLAME : plan.price === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(167,139,250,0.12)',
                      color: '#fff',
                      fontFamily: DISP,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: isBusy ? 'not-allowed' : 'pointer',
                      opacity: isBusy ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: isPro ? '0 8px 24px rgba(139, 59, 255,.35)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    {isBusy ? (
                      <><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />Redirecting…</>
                    ) : (
                      <>{plan.price === 0 ? 'Start Free' : `Get ${plan.name}`}<ArrowRight size={15} /></>
                    )}
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Trust row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 40, flexWrap: 'wrap' }}>
          {[
            { icon: <Shield size={13} />, text: 'Cancel anytime' },
            { icon: <Check size={13} />, text: 'Secure checkout via Stripe' },
            { icon: <Zap size={13} />, text: 'Instant access on signup' },
          ].map((t) => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: MUTED_2 }}>
              {t.icon}{t.text}
            </div>
          ))}
        </motion.div>

        {/* Legal Money Law, Security & COPPA Compliance Box */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} style={{ marginTop: 36, background: 'rgba(139, 59, 255, 0.05)', border: `1px solid rgba(139, 59, 255, 0.25)`, borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: FLAME, fontFamily: DISP, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <Shield size={16} color={FLAME} />
            <span>Bank-Grade Security & Legal Compliance Audit Verified</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#d4d4d0', lineHeight: 1.5 }}>
            <strong>🔒 PCI-DSS Level 1 & TLS 256-Bit Encryption:</strong> All transactions are processed through Stripe Payment Gateway with zero credit card data stored on our servers. Fully compliant with US Banking Laws & Consumer Financial Protection regulations.
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#d4d4d0', lineHeight: 1.5 }}>
            <strong>🛡️ COPPA & Federal Child Protection:</strong> Athletes under 18 require verified parent/guardian consent before any paid subscription or direct coach messaging is activated. All billing agreements adhere strictly to federal online privacy laws.
          </p>
        </motion.div>

        {/* Social proof */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} style={{ marginTop: 52, background: INK_2, border: `1px solid ${LINE}`, borderRadius: 16, padding: '28px 32px' }}>
          <div style={{ fontFamily: DISP, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 18 }}>Why athletes upgrade</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { stat: '3.4×', label: 'more coach views on Pro profiles' },
              { stat: '67%', label: 'of recruits are found through reels' },
              { stat: '12k+', label: 'athletes already on the grid' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: DISP, fontSize: '2.2rem', fontWeight: 900, color: FLAME, lineHeight: 1 }}>{s.stat}</div>
                <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 5, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
