import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, DollarSign, Clock, CheckCircle2,
  XCircle, TrendingUp, Plus,
  ChevronRight, Award, Bookmark,
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
  name: string;
  amount: number;
  deadline: string;
  requirements: string | null;
  category: string | null;
  eligibleStates: string | null;
  createdAt: string | null;
};

const STATUS_CONFIG: Record<ScholarshipStatus, { label: string; color: string; bg: string }> = {
  tracking:  { label: 'Tracking',  color: MUTED,      bg: 'rgba(255,255,255,0.05)' },
  applied:   { label: 'Applied',   color: '#60a5fa',   bg: 'rgba(96,165,250,0.1)' },
  interview: { label: 'Interview', color: '#fbbf24',   bg: 'rgba(251,191,36,0.1)' },
  offer:     { label: 'Offer',     color: '#4ade80',   bg: 'rgba(74,222,128,0.1)' },
  declined:  { label: 'Declined',  color: '#f87171',   bg: 'rgba(248,113,113,0.1)' },
};

const STATUS_ORDER: ScholarshipStatus[] = ['offer', 'interview', 'applied', 'tracking', 'declined'];

export const ScholarshipTracker = () => {
  const [items, setItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScholarshipStatus | 'All'>('All');
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/scholarships', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setItems(data.data);
        } else {
          setError(data.error || 'Failed to load scholarships');
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError('Failed to load scholarships');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const handleSave = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/scholarships/${id}/save`, { method: 'POST' });
      const data = await res.json();
      if (data.success) setSaved(prev => ({ ...prev, [id]: true }));
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const filtered = statusFilter === 'All'
    ? items
    : items.filter((s) => s.status === statusFilter);

  const stats = {
    total: items.length,
    saved: Object.values(saved).filter(Boolean).length,
    deadlineSoon: items.filter(s => {
      const d = new Date(s.deadline);
      const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length,
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px', textAlign: 'center', color: MUTED }}>
        <GraduationCap size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
        <p style={{ fontSize: '0.88rem', margin: 0 }}>Loading scholarships...</p>
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
          { icon: <TrendingUp size={14} />, val: stats.total, label: 'Available', color: FLAME_C },
          { icon: <Clock size={14} />, val: stats.deadlineSoon, label: 'Due Soon', color: '#60a5fa' },
          { icon: <Award size={14} />, val: stats.saved, label: 'Saved', color: '#4ade80' },
        ].map((s, i) => (
          <div key={i} style={{ background: INK_2, border: `1px solid ${s.val > 0 ? s.color + '33' : LINE}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: s.val > 0 ? s.color : MUTED_2 }}>{s.icon}</div>
            <div style={{ fontFamily: DISP, fontSize: '1.5rem', fontWeight: 900, color: s.val > 0 ? s.color : '#f4f4f2', letterSpacing: '-0.02em' }}>{s.val}</div>
            <div style={{ fontSize: '0.6rem', color: MUTED_2, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status filter — kept for visual continuity, filters by category if available */}
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

      {/* Scholarship cards */}
      {filtered.map((item) => (
        <motion.div key={item.id} className="k-card-hover" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '16px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Icon */}
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,90,45,0.1)', border: `1px solid ${FLAME_C}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={18} color={FLAME_C} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: DISP, fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2' }}>{item.name}</span>
                {item.category && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5, background: `${FLAME_C}18`, color: FLAME_C, border: `1px solid ${FLAME_C}30` }}>{item.category}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#4ade80' }}>
                  <DollarSign size={11} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>${item.amount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: MUTED_2 }}>
                  <Clock size={11} />
                  <span style={{ fontSize: '0.72rem' }}>Due {item.deadline}</span>
                </div>
              </div>

              {item.requirements && (
                <p style={{ fontSize: '0.77rem', color: MUTED, margin: '0 0 10px', lineHeight: 1.45 }}>{item.requirements}</p>
              )}

              {item.eligibleStates && (
                <p style={{ fontSize: '0.7rem', color: MUTED_2, margin: '0 0 10px' }}>States: {item.eligibleStates}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saved[item.id] && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 5, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} /> Saved
                    </span>
                  )}
                </div>
                {!saved[item.id] && (
                  <motion.button whileTap={{ scale: 0.93 }} onClick={(e) => handleSave(item.id, e)}
                    disabled={saving[item.id]}
                    style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: FLAME_C, color: '#fff', fontSize: '0.68rem', fontWeight: 800, cursor: saving[item.id] ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: saving[item.id] ? 0.6 : 1 }}>
                    <Bookmark size={12} /> {saving[item.id] ? 'Saving...' : 'Save'}
                  </motion.button>
                )}
                {saved[item.id] && (
                  <motion.button whileTap={{ scale: 0.93 }} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', color: MUTED, fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronRight size={12} /> View
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED_2 }}>
          <GraduationCap size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
          <p style={{ fontSize: '0.88rem', margin: 0 }}>No scholarships found.</p>
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
