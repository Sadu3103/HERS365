import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Zap } from 'lucide-react';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { useAuth } from '../context/AuthContext';

const FLAME = '#ff5a2d';

export function ProfileCompletionBanner() {
  const { user } = useAuth();
  const { pct, isComplete, nextStep, doneCount, total } = useProfileCompletion();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!user || isComplete || dismissed) return null;
  // Don't show if <10% (just signed up and haven't done onboarding at all — ThankYou handles that)
  if (pct === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.28 }}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          background: `linear-gradient(90deg, rgba(255,90,45,0.12) 0%, rgba(255,90,45,0.06) 100%)`,
          borderBottom: '1px solid rgba(255,90,45,0.2)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Zap size={14} color={FLAME} style={{ flexShrink: 0 }} />

          {/* Progress bar */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%', background: FLAME, borderRadius: 99 }}
              />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: FLAME, whiteSpace: 'nowrap' }}>{pct}%</span>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', display: 'none' }} className="desktop-only">
              {doneCount}/{total} steps
            </span>
          </div>

          {nextStep && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(nextStep.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 99,
                background: FLAME, border: 'none',
                color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {nextStep.label} <ChevronRight size={12} />
            </motion.button>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss profile completion banner"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
