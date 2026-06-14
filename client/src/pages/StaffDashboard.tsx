import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Flag, MessageSquare, CheckCircle2 } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Tab = 'reports' | 'accounts' | 'moderation';

const REPORTS = [
  { id: 1, type: 'Inappropriate Content', user: 'athlete_782', detail: 'Post flagged for potential policy violation', ts: '2h ago', resolved: false },
  { id: 2, type: 'Account Dispute', user: 'parent_331', detail: 'Parent reports unverified coach contact', ts: '4h ago', resolved: false },
  { id: 3, type: 'Spam', user: 'coach_449', detail: 'Bulk messaging athletes without parent approval', ts: '1d ago', resolved: true },
];

export const StaffDashboard = () => {
  const [tab, setTab] = useState<Tab>('reports');
  const [resolved, setResolved] = useState<number[]>([3]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <Users size={13} /> STAFF PORTAL
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1 }}>Staff Dashboard</h1>
        <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>Moderation, reports, and account management.</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {([
          { id: 'reports', label: 'Reports', icon: <Flag size={13} /> },
          { id: 'accounts', label: 'Accounts', icon: <Users size={13} /> },
          { id: 'moderation', label: 'Moderation', icon: <MessageSquare size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setTab(t.id)} style={{ padding: '8px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', background: tab === t.id ? FLAME : 'rgba(255,255,255,0.05)', color: tab === t.id ? '#fff' : MUTED, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>{t.icon}{t.label}</motion.button>
        ))}
      </div>

      {tab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REPORTS.map((r) => {
            const isResolved = resolved.includes(r.id);
            return (
              <div key={r.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isResolved ? LINE : 'rgba(245,158,11,0.3)'}`, borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f4f4f2' }}>{r.type}</div>
                    <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 99, background: isResolved ? 'rgba(74,222,128,0.1)' : 'rgba(245,158,11,0.1)', color: isResolved ? '#4ade80' : '#f59e0b', fontWeight: 700 }}>{isResolved ? 'RESOLVED' : 'OPEN'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: MUTED, marginBottom: 2 }}>User: {r.user}</div>
                  <div style={{ fontSize: '0.78rem', color: '#c0c0bc' }}>{r.detail}</div>
                  <div style={{ fontSize: '0.68rem', color: MUTED_2, marginTop: 4 }}>{r.ts}</div>
                </div>
                {!isResolved && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setResolved([...resolved, r.id])} style={{ padding: '6px 12px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <CheckCircle2 size={12} /> Resolve
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab === 'accounts' && (
        <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>
          Account management tools are in the Admin Dashboard.
        </div>
      )}
      {tab === 'moderation' && (
        <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>
          Content moderation queue is empty.
        </div>
      )}
    </div>
  );
};
