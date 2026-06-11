import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FLAME = '#ff5a2d';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Tier = 'pro' | 'elite';

interface UpgradeGateProps {
  requiredTier?: Tier;
  feature?: string;
  children?: React.ReactNode;
  inline?: boolean;
}

const TIER_META: Record<Tier, { icon: React.ReactNode; accent: string; planName: string; price: string }> = {
  pro: { icon: <Zap size={18} />, accent: FLAME, planName: 'Pro', price: '$9.99/mo' },
  elite: { icon: <Star size={18} />, accent: '#a78bfa', planName: 'Elite', price: '$29.99/mo' },
};

export const UpgradeGate = ({ requiredTier = 'pro', feature, children, inline = false }: UpgradeGateProps) => {
  const navigate = useNavigate();
  const meta = TIER_META[requiredTier];

  const raw = localStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const currentTier = user?.subscriptionTier || user?.tier || 'free';

  const tierRank: Record<string, number> = { free: 0, rookie: 0, pro: 1, elite: 2 };
  const hasAccess = (tierRank[currentTier] ?? 0) >= (tierRank[requiredTier] ?? 0);

  if (hasAccess) return <>{children}</>;

  if (inline) {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/subscribe')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
          background: `${meta.accent}12`, border: `1px solid ${meta.accent}30`,
          fontSize: '0.72rem', fontWeight: 700, color: meta.accent,
        }}
      >
        <Lock size={11} />
        {meta.planName} feature — Upgrade
        <ArrowRight size={11} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${meta.accent}35`,
        borderRadius: 16,
        padding: '32px 28px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${meta.accent}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${meta.accent}15`, border: `1.5px solid ${meta.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: meta.accent }}>
          <Lock size={20} />
        </div>

        <div style={{ fontFamily: DISP, fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>
          {feature ? `${feature} is ${meta.planName}+` : `${meta.planName} Feature`}
        </div>

        <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          Upgrade to {meta.planName} ({meta.price}) to unlock this feature and get full access to recruiting tools on HERS365.
        </p>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/subscribe')}
          style={{
            padding: '12px 24px',
            background: meta.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontFamily: DISP,
            fontWeight: 800,
            fontSize: '0.88rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: `0 8px 24px ${meta.accent}35`,
          }}
        >
          {meta.icon}
          Upgrade to {meta.planName}
          <ArrowRight size={14} />
        </motion.button>

        <div style={{ marginTop: 14, fontSize: '0.72rem', color: MUTED_2 }}>Cancel anytime · No commitment</div>
      </div>
    </motion.div>
  );
};

export const LockedFeature = ({ tier = 'pro', label }: { tier?: Tier; label: string }) => (
  <UpgradeGate requiredTier={tier} feature={label} inline />
);
