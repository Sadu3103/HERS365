import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Clock, CreditCard, BarChart2, AlertTriangle } from 'lucide-react';

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

type Signup = {
  id: number;
  name: string;
  position: string | null;
  state: string | null;
  createdAt: string | null;
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token') ?? '';
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/data/stats', { headers }).then((r) => r.json()),
      fetch('/api/admin/data/recent-signups', { headers }).then((r) => r.json()),
    ])
      .then(([statsRes, signupsRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        else setError('Failed to load stats');
        if (signupsRes.success) setSignups(signupsRes.data);
      })
      .catch(() => setError('Network error'));
  }, []);

  const cards = stats
    ? [
        {
          label: 'Total Athletes',
          val: stats.totalAthletes,
          icon: <Users size={18} />,
          color: FLAME,
          border: LINE,
        },
        {
          label: 'Total Coaches',
          val: stats.totalCoaches,
          icon: <Shield size={18} />,
          color: '#60a5fa',
          border: LINE,
        },
        {
          label: 'Pending Verifications',
          val: stats.pendingVerifications,
          icon: <Clock size={18} />,
          color: stats.pendingVerifications > 0 ? '#f59e0b' : MUTED,
          border: stats.pendingVerifications > 0 ? `1px solid ${FLAME}` : `1px solid ${LINE}`,
        },
        {
          label: 'Active Subscriptions',
          val: stats.activeSubscriptions,
          icon: <CreditCard size={18} />,
          color: '#4ade80',
          border: LINE,
        },
      ]
    : [];

  const formatDate = (raw: string | null) => {
    if (!raw) return 'Unknown';
    try {
      return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return raw;
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 120px' }}>
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
          <BarChart2 size={13} /> ADMIN DASHBOARD
        </div>
        <h1
          style={{
            fontFamily: DISP,
            fontSize: '2.2rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1,
          }}
        >
          Platform Overview
        </h1>
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
            marginBottom: 32,
          }}
        >
          {cards.map((c) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#111111',
                border: typeof c.border === 'string' && c.border.startsWith('1px') ? c.border : `1px solid ${c.border}`,
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

      {signups.length > 0 && (
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
            Recent Signups
          </div>
          <div
            style={{
              background: '#111111',
              border: `1px solid ${LINE}`,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                  {['Name', 'Position', 'State', 'Joined'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '10px 16px',
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: MUTED_2,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signups.map((s, i) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: i < signups.length - 1 ? `1px solid ${LINE}` : 'none',
                    }}
                  >
                    <td style={{ padding: '10px 16px', fontSize: '0.82rem', color: '#f4f4f2', fontWeight: 600 }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: MUTED }}>
                      {s.position ?? 'Unknown'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.78rem', color: MUTED }}>
                      {s.state ?? 'Unknown'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.75rem', color: MUTED_2 }}>
                      {formatDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div
        style={{
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 32,
        }}
      >
        <AlertTriangle size={15} color="#f59e0b" />
        <span style={{ fontSize: '0.8rem', color: '#fcd34d' }}>
          Admin actions are logged. All moderation decisions are auditable.
        </span>
      </div>
    </div>
  );
};
