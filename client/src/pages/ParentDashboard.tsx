import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, MessageSquare, Activity, Bell, CheckCircle2, XCircle, ChevronRight, Lock } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";
const AMBER = '#f59e0b';
const GREEN = '#4ade80';
const RED = '#f87171';

type Tab = 'overview' | 'messages' | 'activity' | 'settings';

type Child = { name: string; age: number; school: string; position: string; gradYear: number };
type PendingMsg = { id: number; from: string; role: string; org: string; preview: string; child: string; ts: string };
type ActivityItem = { text: string; ts: string; type: 'login' | 'message' | 'profile' | 'ranking' };

const CHILDREN: Child[] = [
  { name: 'Aaliyah Carter', age: 16, school: 'Valley Oak High', position: 'WR', gradYear: 2026 },
];

const PENDING_MSGS: PendingMsg[] = [
  { id: 1, from: 'Coach Dana Reyes', role: 'Head Coach', org: 'Sierra Vista 7v7', preview: "Hi Aaliyah, I saw your highlight film and would love to discuss our summer 7v7 program...", child: 'Aaliyah Carter', ts: '2h ago' },
  { id: 2, from: 'Coach Kim Waters', role: 'Recruiting Coord.', org: 'Fresno State', preview: "We've been following your progress on the HERS365 rankings and are interested in...", child: 'Aaliyah Carter', ts: '1d ago' },
];

const ACTIVITY: ActivityItem[] = [
  { text: 'Aaliyah logged in from iPhone', ts: 'Today 4:12 PM', type: 'login' },
  { text: 'Aaliyah updated her bio', ts: 'Today 2:30 PM', type: 'profile' },
  { text: 'Aaliyah moved to #14 in California WR rankings', ts: 'Yesterday', type: 'ranking' },
  { text: 'Coach message request received from Sierra Vista 7v7', ts: '2 hours ago', type: 'message' },
];


const SETTING_DEFS = [
  { label: 'Email Notifications', desc: 'Get emailed when a coach sends a message request', defaultOn: true },
  { label: 'SMS Alerts', desc: 'Text message alerts for urgent approvals', defaultOn: false },
  { label: 'Profile Visibility', desc: "Allow athlete's profile to appear in coach searches", defaultOn: true },
  { label: 'Ranking Visibility', desc: 'Include athlete in public HERS365 rankings', defaultOn: true },
] as const;

const SettingRow = ({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f4f4f2', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: MUTED }}>{desc}</div>
      </div>
      <motion.div whileTap={{ scale: 0.9 }} onClick={() => setOn(!on)} style={{ width: 40, height: 22, borderRadius: 99, background: on ? FLAME : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
        <motion.div animate={{ x: on ? 20 : 2 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }} style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2 }} />
      </motion.div>
    </div>
  );
};

const SettingsPanel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {SETTING_DEFS.map((s) => <SettingRow key={s.label} {...s} />)}
  </div>
);

export const ParentDashboard = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [approved, setApproved] = useState<number[]>([]);
  const [denied, setDenied] = useState<number[]>([]);

  const pending = PENDING_MSGS.filter((m) => !approved.includes(m.id) && !denied.includes(m.id));

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <Shield size={13} /> PARENT PORTAL
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 6px', lineHeight: 1 }}>Parent Dashboard</h1>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>You control your athlete's communication and privacy settings.</p>
      </div>

      {/* Safety banner */}
      <div style={{ background: 'rgba(74,222,128,0.07)', border: `1px solid rgba(74,222,128,0.2)`, borderRadius: 12, padding: '12px 16px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Lock size={14} color={GREEN} />
        <span style={{ fontSize: '0.78rem', color: '#a3f0bd' }}>All coach-to-athlete communication is gated through this dashboard. No messages reach your athlete without your approval.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { id: 'overview', label: 'Overview', icon: <Activity size={13} /> },
          { id: 'messages', label: `Messages${pending.length ? ` (${pending.length})` : ''}`, icon: <MessageSquare size={13} /> },
          { id: 'activity', label: 'Activity', icon: <Bell size={13} /> },
          { id: 'settings', label: 'Settings', icon: <Users size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
            background: tab === t.id ? FLAME : 'rgba(255,255,255,0.05)',
            color: tab === t.id ? '#fff' : MUTED,
            fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          }}>{t.icon}{t.label}</motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              {CHILDREN.map((c) => (
                <div key={c.name} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: DISP, fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 3 }}>{c.position} · {c.school} · Class of {c.gradYear}</div>
                    </div>
                    <div style={{ background: `${FLAME}15`, border: `1px solid ${FLAME}40`, borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 900, color: FLAME }}>Age {c.age}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Profile Visible', val: 'Public', ok: true },
                      { label: 'Coach Contact', val: 'Parent Gated', ok: true },
                      { label: 'Location Data', val: 'Off', ok: true },
                    ].map((s) => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 99 }}>
                        <CheckCircle2 size={11} color={GREEN} />
                        <span style={{ fontSize: '0.65rem', color: '#a3f0bd', fontWeight: 700 }}>{s.label}: {s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pending.length > 0 && (
              <div style={{ background: `${AMBER}10`, border: `1px solid ${AMBER}30`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setTab('messages')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bell size={16} color={AMBER} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fcd34d' }}>{pending.length} message{pending.length > 1 ? 's' : ''} awaiting your approval</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>Review before {pending[0].child} can receive them</div>
                  </div>
                </div>
                <ChevronRight size={16} color={AMBER} />
              </div>
            )}
          </motion.div>
        )}

        {/* MESSAGES */}
        {tab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <p style={{ color: MUTED, fontSize: '0.82rem', marginBottom: 18, lineHeight: 1.6 }}>Coaches can contact your athlete only after you approve each request. Denied requests are blocked permanently from that coach.</p>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>
                <CheckCircle2 size={32} color={GREEN} style={{ marginBottom: 12, opacity: 0.7 }} />
                <div>No pending message requests.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pending.map((m) => (
                  <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{m.from}</div>
                        <div style={{ fontSize: '0.72rem', color: MUTED }}>{m.role} · {m.org}</div>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: MUTED_2, flexShrink: 0 }}>{m.ts}</div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#c0c0bc', lineHeight: 1.5, marginBottom: 4, fontStyle: 'italic' }}>"{m.preview.slice(0, 100)}…"</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED_2, marginBottom: 14 }}>To: {m.child}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setApproved([...approved, m.id])} style={{ flex: 1, padding: '9px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, color: GREEN, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <CheckCircle2 size={13} /> Approve
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setDenied([...denied, m.id])} style={{ flex: 1, padding: '9px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: RED, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <XCircle size={13} /> Deny
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(approved.length > 0 || denied.length > 0) && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '0.65rem', color: MUTED_2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent Actions</div>
                {approved.map((id) => {
                  const m = PENDING_MSGS.find((x) => x.id === id);
                  return m ? <div key={id} style={{ fontSize: '0.8rem', color: '#a3f0bd', marginBottom: 4 }}>✓ Approved: {m.from}</div> : null;
                })}
                {denied.map((id) => {
                  const m = PENDING_MSGS.find((x) => x.id === id);
                  return m ? <div key={id} style={{ fontSize: '0.8rem', color: RED, marginBottom: 4 }}>✗ Denied: {m.from}</div> : null;
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACTIVITY.map((a, i) => {
                const colors: Record<ActivityItem['type'], string> = { login: MUTED, message: AMBER, profile: FLAME, ranking: GREEN };
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[a.type], marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: '#e4e4e2', lineHeight: 1.4 }}>{a.text}</div>
                      <div style={{ fontSize: '0.7rem', color: MUTED_2, marginTop: 3 }}>{a.ts}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SettingsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
