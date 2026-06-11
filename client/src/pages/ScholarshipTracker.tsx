import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, DollarSign, Clock, CheckCircle2,
  XCircle, AlertCircle, TrendingUp, Plus,
  ChevronRight, Award,
} from 'lucide-react';

const FLAME_C = '#ff5a2d';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type ScholarshipStatus = 'tracking' | 'applied' | 'interview' | 'offer' | 'declined';

type Scholarship = {
  id: number;
  school: string;
  program: string;
  division: 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO';
  amount: string | null;
  deadline: string | null;
  status: ScholarshipStatus;
  notes: string;
  contactName: string | null;
};

const STATUS_CONFIG: Record<ScholarshipStatus, { label: string; color: string; bg: string }> = {
  tracking:  { label: 'Tracking',  color: MUTED,      bg: 'rgba(255,255,255,0.05)' },
  applied:   { label: 'Applied',   color: '#60a5fa',   bg: 'rgba(96,165,250,0.1)' },
  interview: { label: 'Interview', color: '#fbbf24',   bg: 'rgba(251,191,36,0.1)' },
  offer:     { label: 'Offer',     color: '#4ade80',   bg: 'rgba(74,222,128,0.1)' },
  declined:  { label: 'Declined',  color: '#f87171',   bg: 'rgba(248,113,113,0.1)' },
};

const DIV_COLOR: Record<string, string> = {
  D1: FLAME_C, D2: '#c084fc', D3: '#60a5fa', NAIA: '#fbbf24', JUCO: '#34d399',
};

const SEED: Scholarship[] = [
  { id: 1, school: 'University of Texas', program: 'Athletics', division: 'D1', amount: 'Full Ride', deadline: 'Feb 1, 2027', status: 'tracking', notes: 'Reached out to coaches at showcase. Waiting for response.', contactName: 'Coach Davis' },
  { id: 2, school: 'Florida State', program: 'Athletics', division: 'D1', amount: 'Full Ride', deadline: 'Jan 15, 2027', status: 'applied', notes: 'Sent official inquiry with highlight film. Acknowledged receipt.', contactName: 'Coach Rivera' },
  { id: 3, school: 'Texas A&M', program: 'Athletics', division: 'D1', amount: 'Partial — $18,000/yr', deadline: 'Mar 1, 2027', status: 'interview', notes: 'Virtual meeting scheduled for June 20th. Reviewing academic requirements.', contactName: 'Coach Williams' },
  { id: 4, school: 'Cal State Fullerton', program: 'Athletics', division: 'D2', amount: '$12,000/yr', deadline: 'Apr 15, 2027', status: 'offer', notes: 'Official offer received! Deadline to accept is Aug 1. Comparing with other offers.', contactName: 'Coach Kim' },
  { id: 5, school: 'Arizona State', program: 'Athletics', division: 'D1', amount: 'Full Ride', deadline: 'Dec 1, 2026', status: 'declined', notes: 'Position filled. Encouraged to apply next cycle. Keep in contact with staff.', contactName: null },
];

const STATUS_ORDER: ScholarshipStatus[] = ['offer', 'interview', 'applied', 'tracking', 'declined'];

export const ScholarshipTracker = () => {
  const [items, setItems] = useState<Scholarship[]>(SEED);
  const [statusFilter, setStatusFilter] = useState<ScholarshipStatus | 'All'>('All');
  const [_selected, setSelected] = useState<Scholarship | null>(null);

  const filtered = statusFilter === 'All'
    ? [...items].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    : items.filter((s) => s.status === statusFilter);

  const stats = {
    total: items.length,
    offers: items.filter((s) => s.status === 'offer').length,
    active: items.filter((s) => ['applied', 'interview', 'tracking'].includes(s.status)).length,
  };

  const advance = (id: number) => {
    const order: ScholarshipStatus[] = ['tracking', 'applied', 'interview', 'offer'];
    setItems((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const idx = order.indexOf(s.status);
      if (idx < 0 || idx >= order.length - 1) return s;
      return { ...s, status: order[idx + 1] };
    }));
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 120px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}>
          <GraduationCap size={13} /> SCHOLARSHIP TRACKER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Your Future. Tracked.
        </h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>
          Manage every school, offer, and deadline in one place. Never miss a window.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { icon: <TrendingUp size={14} />, val: stats.total, label: 'Schools', color: FLAME_C },
          { icon: <Clock size={14} />, val: stats.active, label: 'In Progress', color: '#60a5fa' },
          { icon: <Award size={14} />, val: stats.offers, label: 'Offers', color: '#4ade80' },
        ].map((s, i) => (
          <div key={i} style={{ background: INK_2, border: `1px solid ${s.val > 0 ? s.color + '33' : LINE}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: s.val > 0 ? s.color : MUTED_2 }}>{s.icon}</div>
            <div style={{ fontFamily: DISP, fontSize: '1.5rem', fontWeight: 900, color: s.val > 0 ? s.color : '#f4f4f2', letterSpacing: '-0.02em' }}>{s.val}</div>
            <div style={{ fontSize: '0.6rem', color: MUTED_2, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {(['All', ...STATUS_ORDER] as const).map((s) => {
          const cfg = s === 'All' ? { color: FLAME_C, bg: `${FLAME_C}18` } : STATUS_CONFIG[s];
          const active = statusFilter === s;
          return (
            <motion.button key={s} whileTap={{ scale: 0.94 }} onClick={() => setStatusFilter(s as typeof statusFilter)}
              style={{ padding: '5px 13px', borderRadius: 99, border: 'none', background: active ? cfg.bg : 'rgba(255,255,255,0.04)', color: active ? cfg.color : MUTED_2, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s' }}>
              {s === 'All' ? 'All' : STATUS_CONFIG[s].label}
            </motion.button>
          );
        })}
      </div>

      {/* School cards */}
      {filtered.map((item) => {
        const cfg = STATUS_CONFIG[item.status];
        const divColor = DIV_COLOR[item.division] || FLAME_C;
        return (
          <motion.div key={item.id} className="k-card-hover" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '16px 18px', marginBottom: 10, cursor: 'pointer' }}
            onClick={() => setSelected(item)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Status icon */}
              <div style={{ width: 42, height: 42, borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.status === 'offer' && <CheckCircle2 size={18} color={cfg.color} />}
                {item.status === 'declined' && <XCircle size={18} color={cfg.color} />}
                {item.status === 'interview' && <AlertCircle size={18} color={cfg.color} />}
                {(item.status === 'applied' || item.status === 'tracking') && <GraduationCap size={18} color={cfg.color} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: DISP, fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2' }}>{item.school}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5, background: `${divColor}18`, color: divColor, border: `1px solid ${divColor}30` }}>{item.division}</span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  {item.amount && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#4ade80' }}>
                      <DollarSign size={11} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{item.amount}</span>
                    </div>
                  )}
                  {item.deadline && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: MUTED_2 }}>
                      <Clock size={11} />
                      <span style={{ fontSize: '0.72rem' }}>Due {item.deadline}</span>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '0.77rem', color: MUTED, margin: '0 0 10px', lineHeight: 1.45 }}>{item.notes}</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 5, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
                    {cfg.label}
                  </span>
                  {item.status !== 'offer' && item.status !== 'declined' && (
                    <motion.button whileTap={{ scale: 0.93 }} onClick={(e) => { e.stopPropagation(); advance(item.id); }}
                      style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: FLAME_C, color: '#fff', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ChevronRight size={12} /> Advance
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED_2 }}>
          <GraduationCap size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
          <p style={{ fontSize: '0.88rem', margin: 0 }}>No scholarships in this stage.</p>
        </div>
      )}

      {/* Add button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="k-btn k-btn-primary"
        style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 10, justifyContent: 'center', fontSize: '0.85rem', fontFamily: DISP, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        <Plus size={16} /> Add School
      </motion.button>
    </div>
  );
};
