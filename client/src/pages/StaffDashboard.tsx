import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageSquare, CreditCard, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Stats = {
  totalAthletes: number;
  totalCoaches: number;
  pendingVerifications: number;
  messagesToday: number;
  newSignupsThisWeek: number;
  activeSubscriptions: number;
};

const QUICK_ACTIONS = [
  { label: 'Admin Panel', href: '/admin', desc: 'Full platform management' },
  { label: 'Rankings', href: '/rankings', desc: 'Athlete leaderboard' },
  { label: 'Explore Athletes', href: '/explore', desc: 'Browse all profiles' },
];

export const StaffDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem('user') || '{}').token ?? '';
    fetch('/api/admin/data/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data);
        else setError('Failed to load stats');
      })
      .catch(() => setError('Network error'));
  }, []);

  const cards = stats
    ? [
        {
          label: 'Athletes',
          val: stats.totalAthletes,
          icon: <Users size={18} />,
          color: FLAME,
        },
        {
          label: 'Signups This Week',
          val: stats.newSignupsThisWeek,
          icon: <TrendingUp size={18} />,
          color: '#60a5fa',
        },
        {
          label: 'Messages Today',
          val: stats.messagesToday,
          icon: <MessageSquare size={18} />,
          color: '#a78bfa',
        },
        {
          label: 'Active Subscriptions',
          val: stats.activeSubscriptions,
          icon: <CreditCard size={18} />,
          color: '#4ade80',
        },
      ]
    : [];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: FLAME,
          }}
        >
          <Users size={13} /> STAFF PORTAL
        </div>
        <h1
          style={{
            fontFamily: DISP,
            fontSize: '2.2rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: '0 0 6px',
            lineHeight: 1,
          }}
        >
          Staff Dashboard
        </h1>
        <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>
          Platform overview and quick navigation.
        </p>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: '0.75rem',
          color: MUTED_2,
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: FLAME, fontWeight: 700 }}>Read-only staff view.</span> You can view
        platform metrics but cannot modify data from this dashboard.
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#f87171',
            fontSize: '0.82rem',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {!stats && !error && (
        <div style={{ color: MUTED_2, fontSize: '0.85rem', padding: '24px' }}>Loading stats...</div>
      )}

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 36,
          }}
        >
          {cards.map((c) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#111111',
                border: `1px solid ${LINE}`,
                borderRadius: 14,
                padding: '18px 16px',
              }}
            >
              <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
              <div
                style={{
                  fontFamily: DISP,
                  fontSize: '2rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  color: '#f4f4f2',
                }}
              >
                {c.val.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: MUTED,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 4,
                }}
              >
                {c.label}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div>
        <div
          style={{
            fontSize: '0.65rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: MUTED,
            marginBottom: 12,
          }}
        >
          Quick Actions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              to={a.href}
              style={{ textDecoration: 'none' }}
            >
              <motion.div
                whileHover={{ x: 2 }}
                style={{
                  background: '#111111',
                  border: `1px solid ${LINE}`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f4f4f2', marginBottom: 2 }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: MUTED_2 }}>{a.desc}</div>
                </div>
                <ExternalLink size={14} color={MUTED_2} />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
