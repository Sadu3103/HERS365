import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Star, TrendingUp, Package, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { UpgradeGate } from '../components/UpgradeGate';

const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const PURPLE = '#a78bfa';
const DISP = "'Barlow Condensed', sans-serif";

type Deal = {
  id: number;
  brandName: string | null;
  requirements: string | null;
  deliverables: string | null;
  estimatedEarnings: number | null;
};


export const NIL = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<number[]>([]);
  const [applying, setApplying] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Deal | null>(null);

  const raw = localStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const tier = user?.subscriptionTier || user?.tier || 'free';
  const isElite = tier === 'elite';

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/nil/opportunities', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDeals(data);
        } else if (data.success) {
          setDeals(data.data);
        } else {
          setError(data.error || 'Failed to load opportunities');
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Failed to load opportunities');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleApply = async (opportunityId: number) => {
    setApplying(prev => ({ ...prev, [opportunityId]: true }));
    try {
      const res = await fetch('/api/nil/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId }),
      });
      const data = await res.json();
      if (data.applied) {
        setApplied(prev => [...prev, opportunityId]);
        setSelected(null);
      }
    } finally {
      setApplying(prev => ({ ...prev, [opportunityId]: false }));
    }
  };

  const totalEarnings = deals
    .filter(d => applied.includes(d.id))
    .reduce((acc, d) => acc + (d.estimatedEarnings ?? 0), 0);

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px', textAlign: 'center', color: MUTED }}>
        <DollarSign size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
        <p style={{ fontSize: '0.88rem', margin: 0 }}>Loading opportunities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px', textAlign: 'center', color: '#f87171' }}>
        <XCircle size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
        <p style={{ fontSize: '0.88rem', margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: PURPLE }}>
          <DollarSign size={13} /> NIL MARKETPLACE
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Name. Image. Likeness.
        </h1>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Brand partnerships built for flag football athletes. Get paid to be you.</p>
      </div>

      {/* Elite gate — wraps the entire deal marketplace */}
      <UpgradeGate requiredTier="elite" feature="NIL Marketplace">
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <DollarSign size={16} />, val: `$${totalEarnings.toLocaleString()}`, label: 'Applied earnings' },
            { icon: <Package size={16} />, val: applied.length, label: 'Applied deals' },
            { icon: <TrendingUp size={16} />, val: deals.length, label: 'Open opportunities' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 14px', textAlign: 'center' }}>
              <div style={{ color: PURPLE, marginBottom: 5, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontFamily: DISP, fontSize: '1.6rem', fontWeight: 900, color: '#f4f4f2', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.62rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Deal list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {deals.map((deal) => {
            const isApplied = applied.includes(deal.id);
            return (
              <motion.div
                key={deal.id}
                whileHover={{ x: 3 }}
                onClick={() => setSelected(deal)}
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{deal.brandName}</div>
                    {isApplied && (
                      <span style={{ padding: '2px 7px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b' }}>APPLIED</span>
                    )}
                  </div>
                  {deal.deliverables && (
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>{deal.deliverables}</div>
                  )}
                  {deal.requirements && (
                    <div style={{ fontSize: '0.68rem', color: MUTED_2, marginTop: 3 }}>{deal.requirements}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {deal.estimatedEarnings != null && (
                    <div style={{ fontFamily: DISP, fontSize: '1.2rem', fontWeight: 900, color: '#4ade80' }}>${deal.estimatedEarnings.toLocaleString()}</div>
                  )}
                  <ChevronRight size={14} color={MUTED_2} style={{ marginTop: 4 }} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {deals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED_2 }}>
            <DollarSign size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
            <p style={{ fontSize: '0.88rem', margin: 0 }}>No opportunities available right now.</p>
          </div>
        )}
      </UpgradeGate>

      {/* Deal detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, margin: '0 auto', background: '#161616', borderRadius: '18px 18px 0 0', padding: '24px 24px 40px', border: `1px solid ${LINE}` }}>
              <div style={{ width: 36, height: 4, background: LINE, borderRadius: 99, margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{selected.brandName}</div>
                </div>
                {selected.estimatedEarnings != null && (
                  <div style={{ fontFamily: DISP, fontSize: '1.6rem', fontWeight: 900, color: '#4ade80' }}>${selected.estimatedEarnings.toLocaleString()}</div>
                )}
              </div>
              {selected.deliverables && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 5 }}>Deliverables</div>
                  <div style={{ fontSize: '0.88rem', color: '#d4d4d0' }}>{selected.deliverables}</div>
                </div>
              )}
              {selected.requirements && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 5 }}>Requirements</div>
                  <div style={{ fontSize: '0.88rem', color: '#d4d4d0' }}>{selected.requirements}</div>
                </div>
              )}
              {isElite && !applied.includes(selected.id) && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleApply(selected.id)}
                  disabled={applying[selected.id]}
                  style={{ width: '100%', padding: '14px', background: PURPLE, color: '#fff', border: 'none', borderRadius: 12, fontFamily: DISP, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: applying[selected.id] ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: applying[selected.id] ? 0.6 : 1 }}>
                  <Star size={16} /> {applying[selected.id] ? 'Submitting...' : 'Express Interest'}
                </motion.button>
              )}
              {applied.includes(selected.id) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>
                  <CheckCircle2 size={16} /> Application Submitted
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
