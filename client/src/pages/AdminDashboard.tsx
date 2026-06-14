import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Activity, AlertTriangle, BarChart2 } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Stats = { totalPlayers: number; totalCoaches: number; totalParents: number; activeToday: number };

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setStats({ totalPlayers: 0, totalCoaches: 0, totalParents: 0, activeToday: 0 }));
  }, []);

  const cards = stats ? [
    { label: 'Athletes', val: stats.totalPlayers, icon: <Users size={18} />, color: FLAME },
    { label: 'Coaches', val: stats.totalCoaches, icon: <Shield size={18} />, color: '#60a5fa' },
    { label: 'Parents', val: stats.totalParents, icon: <Users size={18} />, color: '#a78bfa' },
    { label: 'Active Today', val: stats.activeToday, icon: <Activity size={18} />, color: '#4ade80' },
  ] : [];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <BarChart2 size={13} /> ADMIN DASHBOARD
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, lineHeight: 1 }}>Platform Overview</h1>
      </div>

      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
          {cards.map((c) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 16px' }}>
              <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontFamily: DISP, fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#f4f4f2' }}>{c.val.toLocaleString()}</div>
              <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{c.label}</div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ color: MUTED_2, fontSize: '0.85rem', padding: '24px' }}>Loading stats…</div>
      )}

      <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={15} color="#f59e0b" />
        <span style={{ fontSize: '0.8rem', color: '#fcd34d' }}>Admin actions are logged. All moderation decisions are auditable.</span>
      </div>
    </div>
  );
};
