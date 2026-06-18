import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, MessageSquare, Activity, Bell, CheckCircle2, XCircle, ChevronRight, Lock, Trophy, Film, TrendingUp, Sparkles } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";
const AMBER = '#f59e0b';
const GREEN = '#4ade80';
const RED = '#f87171';

type Tab = 'overview' | 'messages' | 'activity' | 'settings';

type Child = { id: number; name: string; age: number | null; school: string | null; position: string | null; gradYear: number | null };
type PendingMsg = { id: number; from: string; role: string; org: string; preview: string; child: string; createdAt: string };
type ActivityItem = { text: string; ts: string; type: 'message' };
type ChildSnapshot = {
  childId: number;
  childName: string;
  rank: number | null;
  score: number | null;
  lastHighlight: { videoUrl: string | null; thumbnailUrl: string | null; createdAt: string } | null;
  lastGame: { passingYards: number | null; rushingYards: number | null; receivingYards: number | null; flagPulls: number | null } | null;
  applicationCount: number;
};

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

function formatTs(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return '1d ago';
  return `${diffD}d ago`;
}

export const ParentDashboard = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [children, setChildren] = useState<Child[]>([]);
  const [requests, setRequests] = useState<PendingMsg[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, ChildSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [recentActions, setRecentActions] = useState<{ id: number; from: string; action: 'approved' | 'rejected' }[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [cRes, rRes, aRes] = await Promise.all([
        fetch('/api/parent/children'),
        fetch('/api/parent/requests'),
        fetch('/api/parent/activity'),
      ]);
      const [cData, rData, aData] = await Promise.all([cRes.json(), rRes.json(), aRes.json()]);
      if (cData.success) setChildren(cData.data);
      if (rData.success) setRequests(rData.data);
      if (aData.success) setActivity(aData.data);

      // For each child, pull a "what's new" snapshot so Maya doesn't have to
      // hunt across tabs to see how her daughter is doing this week.
      if (cData.success && Array.isArray(cData.data)) {
        const snaps = await Promise.all(cData.data.map(async (c: Child): Promise<ChildSnapshot | null> => {
          try {
            const [rankRes, hlRes, statRes] = await Promise.all([
              fetch(`/api/rankings?playerId=${c.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(`/api/players/${c.id}/highlights`).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(`/api/players/${c.id}/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
            ]);
            const ranked = Array.isArray(rankRes?.data) ? rankRes.data.find((p: any) => p.id === c.id) : null;
            const highlights = Array.isArray(hlRes) ? hlRes : [];
            const stats = Array.isArray(statRes) ? statRes : [];
            return {
              childId: c.id,
              childName: c.name,
              rank: ranked?.rank ?? null,
              score: ranked?.rating ?? null,
              lastHighlight: highlights[0] ? { videoUrl: highlights[0].videoUrl, thumbnailUrl: highlights[0].thumbnailUrl, createdAt: highlights[0].createdAt } : null,
              lastGame: stats[stats.length - 1] || null,
              applicationCount: 0,
            };
          } catch { return null; }
        }));
        const map: Record<number, ChildSnapshot> = {};
        for (const s of snaps) { if (s) map[s.childId] = s; }
        setSnapshots(map);
      }
    } catch (err) {
      console.error('[ParentDashboard] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const respond = async (id: number, action: 'approve' | 'reject') => {
    setActing(id);
    try {
      const res = await fetch(`/api/parent/requests/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        const req = requests.find((r) => r.id === id);
        if (req) {
          setRecentActions((prev) => [...prev, { id, from: req.from, action: action === 'approve' ? 'approved' : 'rejected' }]);
        }
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('[ParentDashboard] respond error', err);
    } finally {
      setActing(null);
    }
  };

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
          { id: 'messages', label: `Messages${requests.length ? ` (${requests.length})` : ''}`, icon: <MessageSquare size={13} /> },
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
            {loading ? (
              <div style={{ color: MUTED_2, fontSize: '0.85rem', padding: '24px 0' }}>Loading...</div>
            ) : (
              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                {children.length === 0 ? (
                  <div style={{ color: MUTED_2, fontSize: '0.85rem', padding: '24px 0' }}>No athletes linked to your account.</div>
                ) : children.map((c) => {
                  const snap = snapshots[c.id];
                  return (
                  <div key={c.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontFamily: DISP, fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: MUTED, marginTop: 3 }}>
                          {[c.position, c.school, c.gradYear ? `Class of ${c.gradYear}` : null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      {snap?.score != null ? (
                        <div style={{ background: `${FLAME}15`, border: `1px solid ${FLAME}40`, borderRadius: 8, padding: '6px 12px', textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontFamily: DISP, fontSize: '1.3rem', fontWeight: 900, color: FLAME, lineHeight: 1 }}>{snap.score}</div>
                          <div style={{ fontSize: '0.55rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Score</div>
                        </div>
                      ) : c.age != null && (
                        <div style={{ background: `${FLAME}15`, border: `1px solid ${FLAME}40`, borderRadius: 8, padding: '6px 10px', textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 900, color: FLAME }}>Age {c.age}</div>
                        </div>
                      )}
                    </div>

                    {/* What's new — the missing-update fix for Maya */}
                    {snap && (snap.rank || snap.lastHighlight || snap.lastGame) && (
                      <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(255,90,45,0.04)', border: `1px solid ${FLAME}20`, borderRadius: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: FLAME }}>
                          <Sparkles size={10} /> What's New with {c.name.split(' ')[0]}
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {snap.rank != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e4e4e2' }}>
                              <Trophy size={12} color={AMBER} />
                              <span>Currently ranked <strong style={{ color: '#fff' }}>#{snap.rank}</strong> nationally</span>
                            </div>
                          )}
                          {snap.lastGame && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e4e4e2' }}>
                              <TrendingUp size={12} color={GREEN} />
                              <span>
                                Last game: {[
                                  snap.lastGame.passingYards ? `${snap.lastGame.passingYards} pass yds` : null,
                                  snap.lastGame.rushingYards ? `${snap.lastGame.rushingYards} rush yds` : null,
                                  snap.lastGame.receivingYards ? `${snap.lastGame.receivingYards} rec yds` : null,
                                  snap.lastGame.flagPulls ? `${snap.lastGame.flagPulls} flag pulls` : null,
                                ].filter(Boolean).join(' · ') || 'recorded'}
                              </span>
                            </div>
                          )}
                          {snap.lastHighlight && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#e4e4e2' }}>
                              <Film size={12} color="#a78bfa" />
                              <span>New highlight uploaded {formatTs(snap.lastHighlight.createdAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                  );
                })}
              </div>
            )}

            {requests.length > 0 && (
              <div style={{ background: `${AMBER}10`, border: `1px solid ${AMBER}30`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setTab('messages')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bell size={16} color={AMBER} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fcd34d' }}>{requests.length} message{requests.length > 1 ? 's' : ''} awaiting your approval</div>
                    <div style={{ fontSize: '0.72rem', color: MUTED }}>Review before {requests[0].child} can receive them</div>
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
            {loading ? (
              <div style={{ color: MUTED_2, fontSize: '0.85rem', padding: '24px 0' }}>Loading...</div>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>
                <CheckCircle2 size={32} color={GREEN} style={{ marginBottom: 12, opacity: 0.7 }} />
                <div>No pending message requests.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {requests.map((m) => (
                  <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{m.from}</div>
                        <div style={{ fontSize: '0.72rem', color: MUTED }}>{[m.role, m.org].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: MUTED_2, flexShrink: 0 }}>{formatTs(m.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#c0c0bc', lineHeight: 1.5, marginBottom: 4, fontStyle: 'italic' }}>"{m.preview.slice(0, 100)}{m.preview.length > 100 ? '…' : ''}"</div>
                    <div style={{ fontSize: '0.7rem', color: MUTED_2, marginBottom: 14 }}>To: {m.child}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={acting === m.id}
                        onClick={() => respond(m.id, 'approve')}
                        style={{ flex: 1, padding: '9px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, color: GREEN, fontSize: '0.78rem', fontWeight: 700, cursor: acting === m.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: acting === m.id ? 0.6 : 1 }}
                      >
                        <CheckCircle2 size={13} /> Approve
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        disabled={acting === m.id}
                        onClick={() => respond(m.id, 'reject')}
                        style={{ flex: 1, padding: '9px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, color: RED, fontSize: '0.78rem', fontWeight: 700, cursor: acting === m.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: acting === m.id ? 0.6 : 1 }}
                      >
                        <XCircle size={13} /> Deny
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentActions.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '0.65rem', color: MUTED_2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recent Actions</div>
                {recentActions.map(({ id, from, action }) => (
                  <div key={id} style={{ fontSize: '0.8rem', color: action === 'approved' ? '#a3f0bd' : RED, marginBottom: 4 }}>
                    {action === 'approved' ? '✓ Approved' : '✗ Denied'}: {from}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ACTIVITY */}
        {tab === 'activity' && (
          <motion.div key="activity" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {loading ? (
              <div style={{ color: MUTED_2, fontSize: '0.85rem', padding: '24px 0' }}>Loading...</div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>No recent activity.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activity.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: '#e4e4e2', lineHeight: 1.4 }}>{a.text}</div>
                      <div style={{ fontSize: '0.7rem', color: MUTED_2, marginTop: 3 }}>{formatTs(a.ts)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
