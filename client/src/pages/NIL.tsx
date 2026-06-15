import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Star, TrendingUp, Package, CheckCircle2, ChevronRight } from 'lucide-react';
import { UpgradeGate } from '../components/UpgradeGate';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const PURPLE = '#a78bfa';
const DISP = "'Barlow Condensed', sans-serif";

type Deal = {
  id: number; brand: string; category: string; value: string;
  deliverables: string; deadline: string; status: 'available' | 'applied' | 'active';
};

const DEALS: Deal[] = [
  { id: 1, brand: 'SportsGear Pro', category: 'Apparel', value: '$500', deliverables: '2 Instagram posts wearing gear', deadline: 'Jun 30', status: 'available' },
  { id: 2, brand: 'Hydro Nation', category: 'Sports Nutrition', value: '$300', deliverables: '1 TikTok + 3 story posts', deadline: 'Jul 15', status: 'available' },
  { id: 3, brand: 'Speed Labs', category: 'Training Equipment', value: '$750', deliverables: '1 YouTube training video', deadline: 'Jul 1', status: 'applied' },
  { id: 4, brand: 'Elite Cleats Co.', category: 'Footwear', value: '$1,200', deliverables: 'Season-long ambassador, 6 posts', deadline: 'Aug 1', status: 'available' },
  { id: 5, brand: 'Playmaker Academy', category: 'Training App', value: '$400', deliverables: '30-day app promotion campaign', deadline: 'Jun 25', status: 'active' },
];

const CAT_COLORS: Record<string, string> = {
  Apparel: FLAME,
  'Sports Nutrition': '#4ade80',
  'Training Equipment': '#60a5fa',
  Footwear: '#fbbf24',
  'Training App': PURPLE,
};

export const NIL = () => {
  const [applied, setApplied] = useState<number[]>([3]);
  const [active] = useState<number[]>([5]);
  const [selected, setSelected] = useState<Deal | null>(null);

  const raw = localStorage.getItem('user');
  const user = raw ? JSON.parse(raw) : null;
  const tier = user?.subscriptionTier || user?.tier || 'free';
  const isElite = tier === 'elite';

  const totalValue = DEALS.filter((d) => active.includes(d.id)).reduce((acc, d) => acc + parseInt(d.value.replace(/[$,]/g, '')), 0);

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
            { icon: <DollarSign size={16} />, val: `$${totalValue}`, label: 'Active earnings' },
            { icon: <Package size={16} />, val: applied.length, label: 'Applied deals' },
            { icon: <TrendingUp size={16} />, val: DEALS.filter((d) => d.status === 'available').length, label: 'Open opportunities' },
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
          {DEALS.map((deal) => {
            const isApplied = applied.includes(deal.id);
            const isActive = active.includes(deal.id);
            const catColor = CAT_COLORS[deal.category] || MUTED;
            return (
              <motion.div
                key={deal.id}
                whileHover={{ x: 3 }}
                onClick={() => setSelected(deal)}
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? `${PURPLE}40` : LINE}`, borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{deal.brand}</div>
                    <span style={{ padding: '2px 7px', background: `${catColor}15`, border: `1px solid ${catColor}30`, borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: catColor }}>{deal.category}</span>
                    {isActive && <span style={{ padding: '2px 7px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: PURPLE }}>ACTIVE</span>}
                    {isApplied && !isActive && <span style={{ padding: '2px 7px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b' }}>APPLIED</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>{deal.deliverables}</div>
                  <div style={{ fontSize: '0.68rem', color: MUTED_2, marginTop: 3 }}>Deadline: {deal.deadline}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: DISP, fontSize: '1.2rem', fontWeight: 900, color: '#4ade80' }}>{deal.value}</div>
                  <ChevronRight size={14} color={MUTED_2} style={{ marginTop: 4 }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </UpgradeGate>

      {/* Deal detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, margin: '0 auto', background: '#161616', borderRadius: '18px 18px 0 0', padding: '24px 24px 40px', border: `1px solid ${LINE}` }}>
              <div style={{ width: 36, height: 4, background: LINE, borderRadius: 99, margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{selected.brand}</div>
                  <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: 2 }}>{selected.category}</div>
                </div>
                <div style={{ fontFamily: DISP, fontSize: '1.6rem', fontWeight: 900, color: '#4ade80' }}>{selected.value}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 5 }}>Deliverables</div>
                <div style={{ fontSize: '0.88rem', color: '#d4d4d0' }}>{selected.deliverables}</div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 5 }}>Deadline</div>
                <div style={{ fontSize: '0.88rem', color: '#d4d4d0' }}>{selected.deadline}</div>
              </div>
              {isElite && !applied.includes(selected.id) && !active.includes(selected.id) && (
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setApplied([...applied, selected.id]); setSelected(null); }} style={{ width: '100%', padding: '14px', background: PURPLE, color: '#fff', border: 'none', borderRadius: 12, fontFamily: DISP, fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Star size={16} /> Apply for This Deal
                </motion.button>
              )}
              {(applied.includes(selected.id) || active.includes(selected.id)) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>
                  <CheckCircle2 size={16} />{active.includes(selected.id) ? 'Deal Active' : 'Application Submitted'}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
