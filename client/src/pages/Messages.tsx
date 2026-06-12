import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Inbox, Clock, Plus, X, Shield, Check, CheckCheck, MessagesSquare, ShieldCheck, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';

const FLAME = '#ff5a2d';
const FLAME_SOFT = '#ff8c66';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const INK_3 = '#161616';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
interface ThreadMessage {
  id: number;
  content: string;
  isFromMe: boolean;
  read: boolean;
  createdAt: string;
}
interface RequestItem {
  id: number;
  athleteId: number;
  senderName: string;
  content: string;
  createdAt: string;
}
interface AthleteRow {
  id: number;
  name: string;
  position: string;
  school: string;
}

// ── Deterministic avatar from a name (gradient + initials) ──
function initials(name: string): string {
  return (name || '?').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}
function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const hue = hueOf(name);
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: DISP, fontWeight: 800, fontSize: size * 0.36, color: '#fff', letterSpacing: '.02em',
      background: `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${(hue + 40) % 360} 60% 22%))`,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>{initials(name)}</span>
  );
}

// ── Time helpers ──
function timeAgo(iso?: string): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function clockTime(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function dayLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (sameDay) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// ── Role badge — makes coach vs athlete unmistakable (safety) ──
function RoleBadge({ role }: { role?: string }) {
  const r = (role || '').toLowerCase();
  const isCoach = r.includes('coach');
  const isParent = r.includes('parent');
  if (!isCoach && !isParent && !r.includes('athlete')) return null;
  const label = isCoach ? 'COACH' : isParent ? 'PARENT' : 'ATHLETE';
  const color = isCoach ? FLAME : isParent ? '#a78bfa' : '#4ade80';
  return (
    <span style={{
      fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      color, background: `${color}1a`, border: `1px solid ${color}33`,
      borderRadius: 5, padding: '1px 6px', flexShrink: 0, lineHeight: 1.5,
    }}>{label}</span>
  );
}

export const Messages = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');
  const [activePartner, setActivePartner] = useState<number | null>(null);
  const [activePartnerName, setActivePartnerName] = useState('');
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeAthletes, setComposeAthletes] = useState<AthleteRow[]>([]);
  const [composeFilter, setComposeFilter] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 760);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const state = location.state as { partnerId?: number; partnerName?: string } | null;
    if (state?.partnerId) {
      setActivePartner(state.partnerId);
      if (state.partnerName) setActivePartnerName(state.partnerName);
    }
  }, []);

  const openCompose = async () => {
    const _u = localStorage.getItem('user');
    const _tier = _u ? (JSON.parse(_u).subscriptionTier || JSON.parse(_u).tier || 'free') : 'free';
    if (_tier === 'free' || _tier === 'rookie') { navigate('/subscribe?reason=messaging'); return; }
    setComposing(true);
    if (composeAthletes.length > 0) return;
    try {
      const res = await apiFetch<{ data: AthleteRow[] }>('/api/athletes?limit=30');
      setComposeAthletes((res.data ?? []).map((a: any) => ({
        id: a.id, name: a.name ?? '', position: a.position ?? '', school: a.school ?? '',
      })));
    } catch { /* sidebar still opens, just empty */ }
  };

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<{ data: Conversation[] }>('/api/messages/conversations'),
  });
  const conversations = convData?.data ?? [];

  const { data: reqData } = useQuery({
    queryKey: ['message-requests'],
    queryFn: () => apiFetch<{ data: RequestItem[] }>('/api/messages/requests'),
  });
  const requests = reqData?.data ?? [];

  const { data: threadData } = useQuery({
    queryKey: ['thread', activePartner],
    queryFn: () => apiFetch<{ data: ThreadMessage[] }>(`/api/messages/conversations/${activePartner}/messages`),
    enabled: activePartner != null,
  });
  const thread = threadData?.data ?? [];

  const markRead = useMutation({
    mutationFn: (partnerId: number) =>
      apiFetch('/api/messages/read', { method: 'PUT', body: JSON.stringify({ partnerId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const send = useMutation({
    mutationFn: (vars: { partnerId: number; content: string }) =>
      apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(vars) }),
    // Optimistic: show the message instantly, reconcile on settle.
    onMutate: async (vars) => {
      setDraft('');
      await qc.cancelQueries({ queryKey: ['thread', vars.partnerId] });
      const prev = qc.getQueryData<{ data: ThreadMessage[] }>(['thread', vars.partnerId]);
      const optimistic: ThreadMessage = { id: -Date.now(), content: vars.content, isFromMe: true, read: false, createdAt: new Date().toISOString() };
      qc.setQueryData(['thread', vars.partnerId], (old: any) => ({ data: [...(old?.data ?? []), optimistic] }));
      return { prev };
    },
    onError: (_e, vars, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['thread', vars.partnerId], ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['thread', vars.partnerId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const submitDraft = () => {
    if (draft.trim() && activePartner != null) send.mutate({ partnerId: activePartner, content: draft.trim() });
  };

  const respond = useMutation({
    mutationFn: (vars: { id: number; action: 'approve' | 'reject' }) =>
      apiFetch(`/api/messages/requests/${vars.id}/respond`, { method: 'POST', body: JSON.stringify({ action: vars.action }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message-requests'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    if (activePartner != null) markRead.mutate(activePartner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartner]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length, activePartner]);

  const activeConv = conversations.find((c) => c.partnerId === activePartner);

  return (
    <div style={{ display: 'flex', height: '100%', color: '#fff', background: INK }}>
      {/* ── Left: list ── */}
      <div style={{ width: isMobile ? '100%' : 332, borderRight: isMobile ? 'none' : `1px solid ${LINE}`, display: (isMobile && activePartner != null) ? 'none' : 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 12px' }}>
          <div style={{ fontFamily: DISP, fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1 }}>
            MESSAGES
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: MUTED }}>
            <ShieldCheck size={12} color="#4ade80" />
            <span style={{ fontSize: '0.66rem', fontWeight: 600 }}>Parent-supervised · coach contact is parent-approved</span>
          </div>
        </div>

        {/* Tabs + compose */}
        <div style={{ display: 'flex', padding: '0 12px 12px', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setTab('inbox')} style={tabStyle(tab === 'inbox')}>
            <Inbox size={13} /> INBOX
          </button>
          <button onClick={() => setTab('requests')} style={tabStyle(tab === 'requests')}>
            <Clock size={13} /> REQUESTS{requests.length > 0 ? ` (${requests.length})` : ''}
          </button>
          <button onClick={openCompose} title="New message" style={{
            flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
            background: FLAME, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(255,90,45,0.35)',
          }}>
            <Plus size={17} color="#fff" />
          </button>
        </div>

        {composing && (
          <div style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, paddingBottom: 8, background: INK_2 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px 8px', gap: 8 }}>
              <input
                autoFocus
                value={composeFilter}
                onChange={(e) => setComposeFilter(e.target.value)}
                placeholder="Search athletes..."
                style={{ flex: 1, background: INK_3, border: `1px solid ${LINE}`, borderRadius: 9999, padding: '7px 14px', color: '#fff', fontSize: '0.78rem', outline: 'none' }}
              />
              <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 0, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {composeAthletes
                .filter((a) => a.name.toLowerCase().includes(composeFilter.toLowerCase()))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setActivePartner(a.id); setActivePartnerName(a.name); setComposing(false); setComposeFilter(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '9px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                  >
                    <Avatar name={a.name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: '0.68rem', color: MUTED_2 }}>{a.position}{a.school ? ` · ${a.school}` : ''}</div>
                    </div>
                  </button>
                ))}
              {composeAthletes.length === 0 && (
                <div style={{ padding: '12px 16px', fontSize: '0.75rem', color: MUTED_2 }}>Loading athletes…</div>
              )}
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'inbox' && conversations.length === 0 && (
            <EmptyState icon={<MessagesSquare size={26} color={MUTED_2} />} title="No conversations yet" sub="Start one with the + button, or accept a request." />
          )}

          {tab === 'inbox' && conversations.map((c) => {
            const active = activePartner === c.partnerId;
            return (
              <button
                key={c.partnerId}
                onClick={() => setActivePartner(c.partnerId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                  padding: '12px 16px', background: active ? 'rgba(255,90,45,0.08)' : 'transparent',
                  borderLeft: active ? `2px solid ${FLAME}` : '2px solid transparent',
                  border: 'none', borderBottom: `1px solid ${LINE}`, cursor: 'pointer', color: '#fff',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Avatar name={c.partnerName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.partnerName}</span>
                    <RoleBadge role={c.partnerRole} />
                    <span style={{ marginLeft: 'auto', fontSize: '0.66rem', color: MUTED_2, flexShrink: 0 }}>{timeAgo(c.lastMessageAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ flex: 1, fontSize: '0.74rem', color: c.unreadCount > 0 ? '#cfcfcc' : '#777', fontWeight: c.unreadCount > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</span>
                    {c.unreadCount > 0 && (
                      <span style={{ minWidth: 18, height: 18, borderRadius: 9999, background: FLAME, color: '#fff', fontSize: '0.62rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{c.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {tab === 'requests' && (
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(167,139,250,0.06)', borderBottom: `1px solid ${LINE}` }}>
              <Shield size={14} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: '0.7rem', color: '#cbb9f5', lineHeight: 1.4 }}>
                Contact requests are parent-supervised. A parent reviews and approves before any conversation begins.
              </span>
            </div>
          )}

          {tab === 'requests' && requests.length === 0 && (
            <EmptyState icon={<ShieldCheck size={26} color={MUTED_2} />} title="No pending requests" sub="Approved contact requests will appear here." />
          )}

          {tab === 'requests' && requests.map((r) => (
            <div key={r.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${LINE}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Avatar name={r.senderName} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{r.senderName}</div>
                  <div style={{ fontSize: '0.64rem', color: MUTED_2 }}>{timeAgo(r.createdAt)} ago</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#bdbdba', margin: '0 0 12px', lineHeight: 1.45, background: INK_2, border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 12px' }}>{r.content}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => respond.mutate({ id: r.id, action: 'approve' })} style={pillBtn(FLAME)}>
                  <Check size={13} /> Approve
                </button>
                <button onClick={() => respond.mutate({ id: r.id, action: 'reject' })} style={pillBtn('#262626')}>
                  <X size={13} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: thread ── */}
      <div style={{ flex: 1, display: (isMobile && activePartner == null) ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activePartner == null ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: MUTED_2, textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: INK_2, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessagesSquare size={28} color={MUTED_2} />
            </div>
            <div>
              <div style={{ fontFamily: DISP, fontSize: '1.3rem', fontWeight: 800, textTransform: 'uppercase', color: '#e8e8e6', letterSpacing: '.02em' }}>Your conversations</div>
              <div style={{ fontSize: '0.82rem', color: MUTED, marginTop: 4, maxWidth: 300 }}>Pick a conversation on the left, or start a new one. Everything here is parent-supervised.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${LINE}`, background: INK }}>
              {isMobile && (
                <button onClick={() => setActivePartner(null)} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, display: 'flex', flexShrink: 0 }}>
                  <ArrowLeft size={20} />
                </button>
              )}
              <Avatar name={(activeConv?.partnerName ?? activePartnerName) || 'Conversation'} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(activeConv?.partnerName ?? activePartnerName) || 'Conversation'}</span>
                  <RoleBadge role={activeConv?.partnerRole} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.66rem', color: '#4ade80', marginTop: 1 }}>
                  <ShieldCheck size={11} /> <span style={{ color: MUTED }}>Parent-supervised conversation</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {thread.length === 0 && (
                <div style={{ margin: 'auto', textAlign: 'center', color: MUTED_2, fontSize: '0.82rem' }}>
                  No messages yet — say hello 👋
                </div>
              )}
              {thread.map((m, i) => {
                const prev = thread[i - 1];
                const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 10px', color: MUTED_2 }}>
                        <span style={{ flex: 1, height: 1, background: LINE }} />
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{dayLabel(m.createdAt)}</span>
                        <span style={{ flex: 1, height: 1, background: LINE }} />
                      </div>
                    )}
                    <div style={{ alignSelf: m.isFromMe ? 'flex-end' : 'flex-start', maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: m.isFromMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        background: m.isFromMe ? `linear-gradient(135deg, ${FLAME}, ${FLAME_SOFT})` : INK_3,
                        color: '#fff', padding: '9px 14px',
                        borderRadius: m.isFromMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        fontSize: '0.86rem', lineHeight: 1.4, border: m.isFromMe ? 'none' : `1px solid ${LINE}`,
                        wordBreak: 'break-word',
                      }}>
                        {m.content}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, padding: '0 4px' }}>
                        <span style={{ fontSize: '0.6rem', color: MUTED_2 }}>{clockTime(m.createdAt)}</span>
                        {m.isFromMe && (m.read
                          ? <CheckCheck size={12} color={FLAME_SOFT} />
                          : <Check size={12} color={MUTED_2} />)}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={threadEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => { e.preventDefault(); submitDraft(); }}
              style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: `1px solid ${LINE}`, background: INK, alignItems: 'flex-end' }}
            >
              <textarea
                value={draft}
                rows={1}
                onChange={(e) => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDraft(); e.currentTarget.style.height = 'auto'; } }}
                placeholder="Type a message…  (Enter to send, Shift+Enter for a new line)"
                style={{ flex: 1, background: INK_3, border: `1px solid ${LINE}`, borderRadius: 20, padding: '11px 18px', color: '#fff', outline: 'none', fontSize: '0.88rem', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 120, transition: 'border-color 0.15s' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.4)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = LINE)}
              />
              <button type="submit" disabled={!draft.trim() || send.isPending} style={{
                background: draft.trim() ? FLAME : '#262626', border: 'none', borderRadius: '50%', width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'default',
                flexShrink: 0, transition: 'background 0.15s', opacity: send.isPending ? 0.6 : 1,
              }}>
                <Send size={17} color={draft.trim() ? '#fff' : MUTED_2} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: INK_2, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e0de' }}>{title}</div>
        <div style={{ fontSize: '0.74rem', color: MUTED_2, marginTop: 4, maxWidth: 220 }}>{sub}</div>
      </div>
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '8px 0', borderRadius: 9999, border: 'none', cursor: 'pointer',
    background: active ? FLAME : INK_3, color: active ? '#fff' : MUTED,
    fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', transition: 'background 0.12s',
  };
}
function pillBtn(bg: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 5, background: bg, color: '#fff', border: bg === '#262626' ? `1px solid ${LINE}` : 'none', borderRadius: 9999, padding: '7px 16px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' };
}
