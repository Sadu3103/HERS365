import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Star } from 'lucide-react';

const FLAME = '#ff5a2d';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

const PLAN_PERKS: Record<string, string[]> = {
  Pro: ['Priority ranking visibility', 'Unlimited film uploads', 'Coach DM access', 'Performance analytics'],
  Elite: ['All Pro features', 'Verified HERS badge', 'Scout spotlight placement', 'Dedicated recruiting advisor'],
  Rookie: ['Basic athlete profile', 'Public ranking listing', 'Community access'],
};

export const ThankYou = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [onboardingComplete] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const user = JSON.parse(raw);
      // Onboarding is complete once position and grad year are set
      return Boolean(user.position && (user.graduationYear || user.gradYear));
    } catch {
      return false;
    }
  });

  const planName = params.get('plan') || 'Pro';
  const amountRaw = params.get('amount');
  const interval = params.get('interval') || 'month';
  const amountDollars = amountRaw ? (parseInt(amountRaw, 10) / 100).toFixed(2) : null;

  const perks = PLAN_PERKS[planName] || PLAN_PERKS['Pro'];
  const isFree = !amountRaw || parseInt(amountRaw, 10) === 0;

  return (
    <div style={{
      minHeight: '100vh', background: INK, color: '#f4f4f2',
      fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      {/* BG glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,90,45,.18) 0%, transparent 70%)',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ position: 'relative', width: '100%', maxWidth: 520 }}
      >
        {/* Success icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(255,90,45,.12)', border: `2px solid ${FLAME}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(255,90,45,.3)',
              color: FLAME,
            }}
          >
            <Check size={32} strokeWidth={2.5} />
          </motion.div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              fontFamily: DISP, fontWeight: 700, letterSpacing: '.2em',
              fontSize: '.8rem', color: FLAME, marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            {isFree ? 'Welcome To The Grid' : 'Subscription Confirmed'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.55 }}
            style={{
              fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase',
              fontSize: 'clamp(2.6rem,6vw,3.8rem)', lineHeight: 0.92,
              margin: 0, letterSpacing: '.01em',
            }}
          >
            You're On The Grid,<br /><em style={{ color: FLAME, fontStyle: 'normal' }}>Coach-Visible.</em>
          </motion.h1>

          {!isFree && amountDollars && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ color: MUTED, fontSize: '.92rem', marginTop: 14 }}
            >
              <b style={{ color: '#f4f4f2', fontFamily: DISP, fontWeight: 800, fontSize: '1.1rem' }}>
                {planName}
              </b>
              {' '}— ${amountDollars}/{interval}. Your profile is now ranked and visible to every coach on the grid.
            </motion.p>
          )}
        </div>

        {/* Plan perks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.55 }}
          style={{
            background: INK_2, border: `1px solid ${LINE}`,
            borderRadius: 18, padding: '22px 24px', marginBottom: 22,
          }}
        >
          <div style={{
            fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '.1em', fontSize: '.85rem', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Star size={14} color={FLAME} fill={FLAME} />
            {planName} Unlocked
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {perks.map((perk, i) => (
              <motion.div
                key={perk}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.54 + i * 0.07, duration: 0.4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,90,45,.12)', border: '1px solid rgba(255,90,45,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME,
                }}>
                  <Check size={10} strokeWidth={3} />
                </div>
                <span style={{ fontSize: '.92rem', color: '#e8e8e6' }}>{perk}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {onboardingComplete === false ? (
            <>
              <button
                onClick={() => navigate('/onboarding')}
                style={{
                  background: FLAME, color: '#fff',
                  fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '.06em', fontSize: '.92rem',
                  padding: '14px 24px', borderRadius: 9999, border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  boxShadow: '0 8px 26px rgba(255,90,45,.38)',
                  transition: 'transform .18s, box-shadow .2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 14px 32px rgba(255,90,45,.52)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 26px rgba(255,90,45,.38)'; }}
              >
                Complete Your Profile <ArrowRight size={15} />
              </button>
              <p style={{ textAlign: 'center', color: MUTED_2, fontSize: '.82rem', margin: 0 }}>
                Coaches can't find you until your profile is complete.
              </p>
            </>
          ) : (
            <Link
              to="/profile"
              style={{
                background: FLAME, color: '#fff',
                fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '.06em', fontSize: '.92rem',
                padding: '14px 24px', borderRadius: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                boxShadow: '0 8px 26px rgba(255,90,45,.38)',
                textDecoration: 'none',
              }}
            >
              Go To My Profile <ArrowRight size={15} />
            </Link>
          )}
          <Link
            to="/"
            style={{
              textAlign: 'center', color: MUTED, fontSize: '.84rem',
              textDecoration: 'none', paddingTop: 4,
              transition: 'color .2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#f4f4f2'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = MUTED; }}
          >
            Back to home
          </Link>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          style={{ textAlign: 'center', color: MUTED_2, fontSize: '.78rem', marginTop: 24 }}
        >
          Manage your subscription anytime from your profile settings.
        </motion.p>
      </motion.div>
    </div>
  );
};
