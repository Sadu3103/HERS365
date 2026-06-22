import React, { useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useDemoLogin, type DemoRole } from '../hooks/useDemoLogin';

type Variant = 'player' | 'coach';

interface Props {
  role: DemoRole;
  variant?: Variant;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (msg: string | null) => void;
}

// Single bypass surface for demo login. Renders nothing unless the env gate
// allows it; the server also rejects these creds when DEMO_ENABLED is off or
// NODE_ENV is production, so a leaked build can't reach a prod demo path.
export const DemoLoginButton: React.FC<Props> = ({ role, variant, onLoadingChange, onError }) => {
  const { enabled, submit, loading, error } = useDemoLogin(role);
  const v: Variant = variant ?? role;

  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);
  useEffect(() => { if (error) onError?.(error); }, [error, onError]);

  if (!enabled) return null;

  if (v === 'coach') {
    return (
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-coral-500/40 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
      >
        <Zap size={18} className="text-coral-500 fill-current" />
        {loading ? 'Entering…' : 'Enter Demo Coach Portal'}
      </button>
    );
  }

  // Player variant — matches the existing Auth.tsx visual language.
  return (
    <button
      type="button"
      onClick={submit}
      disabled={loading}
      style={{
        width: '100%', padding: '14px 24px', marginTop: 12,
        background: 'transparent', color: '#f4f4f2',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '.88rem',
        letterSpacing: '.14em', textTransform: 'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        opacity: loading ? 0.6 : 1,
        transition: 'background .2s, border-color .2s',
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'rgba(255,90,45,0.55)'; e.currentTarget.style.background = 'rgba(255,90,45,0.06)'; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'transparent'; }}
    >
      <Zap size={15} style={{ color: '#ff5a2d' }} />
      {loading ? 'Entering Demo…' : 'Try Demo Athlete Account'}
    </button>
  );
};
