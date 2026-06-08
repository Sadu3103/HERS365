import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send, Search, Check, CheckCheck, Paperclip, Smile, Plus, X,
  Star, BellOff, MoreHorizontal, ShieldCheck, ChevronLeft, Inbox, Trophy,
} from 'lucide-react';

/* ───────────────────────── Types ───────────────────────── */

type Role = 'coach' | 'athlete' | 'recruiter';

interface Participant {
  name: string;
  avatar: string;
  role: Role;
  isOnline: boolean;
}

interface Convo {
  id: number;
  participant: Participant;
  lastMessage: { text: string; timestamp: string; isFromMe: boolean; isRead: boolean };
  unreadCount: number;
}

interface Msg {
  id: number;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  isRead: boolean;
}

/* ───────────────────────── Design tokens ───────────────────────── */

const C = {
  bg: '#0a0a0a',
  panel: '#0d0d0d',
  card: '#121212',
  hover: '#161616',
  border: 'rgba(255,255,255,0.07)',
  borderSoft: 'rgba(255,255,255,0.05)',
  coral: '#ff5a2d',
  coralSoft: 'rgba(255,90,45,0.12)',
  ink: '#f4f4f4',
  inkMuted: '#8a8a8a',
  inkFaint: '#5a5a5a',
  bubbleIn: '#1f2022',
  bubbleInText: '#ededed',
};

const roleMeta: Record<Role, { color: string; label: string; tint: string }> = {
  coach:     { color: '#5b9dff', label: 'Coach',     tint: 'rgba(91,157,255,0.14)' },
  athlete:   { color: '#43d17f', label: 'Athlete',   tint: 'rgba(67,209,127,0.14)' },
  recruiter: { color: '#c084fc', label: 'Recruiter', tint: 'rgba(192,132,252,0.14)' },
};

const EMOJI = ['🔥', '💪', '🏈', '⚡️', '🎯', '🙌', '👏', '✅', '😤', '🐐', '💯', '❤️'];

/* ───────────────────────── Time helpers ───────────────────────── */

function relTime(ts: string) {
  const d = new Date(ts).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 172_800_000) return '1d';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function clockTime(ts: string) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function dayKey(ts: string) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (dayKey(ts) === dayKey(today.toISOString())) return 'Today';
  if (dayKey(ts) === dayKey(yest.toISOString())) return 'Yesterday';
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

/* ───────────────────────── Avatar ───────────────────────── */

function Avatar({ participant, size = 40 }: { participant: Participant; size?: number }) {
  const meta = roleMeta[participant.role];
  const initials = participant.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', padding: 2,
        background: `linear-gradient(135deg, ${meta.color}, ${meta.color}55)`,
      }}>
        {participant.avatar ? (
          <img src={participant.avatar} alt={participant.name}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#1c1c1c', display: 'block' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%', background: '#1c1c1c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.34, fontWeight: 800, color: meta.color, fontFamily: 'Barlow Condensed, sans-serif',
          }}>{initials}</div>
        )}
      </div>
      {participant.isOnline && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0, width: size * 0.26, height: size * 0.26,
          minWidth: 9, minHeight: 9, borderRadius: '50%', background: '#43d17f',
          border: `2.5px solid ${C.bg}`, boxShadow: '0 0 8px rgba(67,209,127,0.6)',
        }} />
      )}
    </div>
  );
}

/* ───────────────────────── Component ───────────────────────── */

type FilterKey = 'all' | 'coach' | 'recruiter' | 'unread';

export const Messages = () => {
  const navigate = useNavigate();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [muted, setMuted] = useState<Set<number>>(new Set());
  const [sendPulse, setSendPulse] = useState(0);
  const [isNarrow, setIsNarrow] = useState(false);
  const [paneThread, setPaneThread] = useState(false); // mobile: show thread vs list

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  /* ── responsive ── */
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 860);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── data ── */
  const fetchConvos = useCallback(async (q = '') => {
    try {
      const url = q ? `/api/messages/conversations?search=${encodeURIComponent(q)}` : '/api/messages/conversations';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: Convo[] = data.data || [];
        setConvos(list);
        setActiveId(prev => (prev == null && list.length && !isNarrow ? list[0].id : prev));
      }
    } finally {
      setLoadingConvos(false);
    }
  }, [headers, isNarrow]);

  const fetchMsgs = useCallback(async (id: number) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages/conversations/${id}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMsgs((data.data || []).slice().reverse());
      }
    } finally {
      setLoadingMsgs(false);
    }
  }, [headers]);

  const markRead = useCallback(async (id: number) => {
    await fetch('/api/messages/read', { method: 'PUT', headers, body: JSON.stringify({ conversationId: id }) });
    setConvos(prev => prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  }, [headers]);

  useEffect(() => {
    if (!search) { fetchConvos(''); return; }
    const t = setTimeout(() => fetchConvos(search), 250);
    return () => clearTimeout(t);
  }, [search, fetchConvos]);

  useEffect(() => {
    if (activeId != null) { fetchMsgs(activeId); markRead(activeId); }
  }, [activeId, fetchMsgs, markRead]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  /* ── close popovers on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── textarea auto-grow ── */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  /* ── actions ── */
  const send = async () => {
    if (!draft.trim() || activeId == null) return;
    const text = draft.trim();
    setDraft('');
    setEmojiOpen(false);
    setSendPulse(p => p + 1);
    const optimistic: Msg = { id: Date.now(), text, timestamp: new Date().toISOString(), isFromMe: true, isRead: false };
    setMsgs(prev => [...prev, optimistic]);
    setConvos(prev => prev.map(c => c.id === activeId
      ? { ...c, lastMessage: { text, timestamp: optimistic.timestamp, isFromMe: true, isRead: false } }
      : c));
    const res = await fetch('/api/messages', { method: 'POST', headers, body: JSON.stringify({ conversationId: activeId, text }) });
    if (res.ok) {
      const data = await res.json();
      setMsgs(prev => prev.map(m => (m.id === optimistic.id ? data.data : m)));
    }
    inputRef.current?.focus();
  };

  const openConvo = (id: number) => {
    setActiveId(id);
    setPaneThread(true);
    setMenuOpen(false);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
    setter(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const insertEmoji = (e: string) => {
    setDraft(d => d + e);
    inputRef.current?.focus();
  };

  /* ── derived ── */
  const active = convos.find(c => c.id === activeId) || null;

  const visibleConvos = useMemo(() => {
    let list = convos;
    if (filter === 'unread') list = list.filter(c => c.unreadCount > 0);
    else if (filter === 'coach') list = list.filter(c => c.participant.role === 'coach');
    else if (filter === 'recruiter') list = list.filter(c => c.participant.role === 'recruiter');
    return [...list].sort((a, b) => {
      const sa = starred.has(a.id) ? 1 : 0;
      const sb = starred.has(b.id) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
    });
  }, [convos, filter, starred]);

  const totalUnread = convos.reduce((s, c) => s + c.unreadCount, 0);

  // index of first unread incoming message (for the "NEW" divider)
  const firstUnreadIdx = useMemo(() => {
    if (!active || active.unreadCount === 0) return -1;
    return msgs.findIndex(m => !m.isFromMe && !m.isRead);
  }, [msgs, active]);

  /* ───────── render helpers ───────── */

  const FilterChip = ({ k, label }: { k: FilterKey; label: string }) => {
    const on = filter === k;
    return (
      <button onClick={() => setFilter(k)} style={{
        padding: '5px 11px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
        letterSpacing: '0.02em', cursor: 'pointer', whiteSpace: 'nowrap',
        background: on ? C.coral : 'transparent',
        color: on ? '#fff' : C.inkMuted,
        border: `1px solid ${on ? C.coral : C.border}`,
        transition: 'all 0.15s',
      }}>{label}</button>
    );
  };

  const showList = !isNarrow || !paneThread;
  const showThread = !isNarrow || paneThread;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: C.bg, overflow: 'hidden' }}>

      {/* ════════════ LEFT: Conversation list ════════════ */}
      {showList && (
        <aside style={{
          width: isNarrow ? '100%' : 332, flexShrink: 0,
          borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.panel,
        }}>
          {/* Header */}
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', textTransform: 'uppercase', color: C.ink, letterSpacing: '0.01em', margin: 0, lineHeight: 1 }}>
                  Inbox
                </h1>
                {totalUnread > 0 && (
                  <span style={{
                    background: C.coral, color: '#fff', fontSize: '0.66rem', fontWeight: 800,
                    minWidth: 20, height: 20, borderRadius: 999, padding: '0 6px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 14px rgba(255,90,45,0.45)',
                  }}>{totalUnread}</span>
                )}
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setComposeOpen(true)}
                aria-label="New message" title="New message"
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: C.coral, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(255,90,45,0.35)',
                }}>
                <Plus size={19} strokeWidth={2.6} />
              </motion.button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint, pointerEvents: 'none' }} />
              <input ref={searchRef} type="text" placeholder="Search messages" value={search} onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '10px 12px 10px 36px', color: C.ink, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.45)')}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
              <FilterChip k="all" label="All" />
              <FilterChip k="unread" label={totalUnread > 0 ? `Unread · ${totalUnread}` : 'Unread'} />
              <FilterChip k="coach" label="Coaches" />
              <FilterChip k="recruiter" label="Recruiters" />
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
            {loadingConvos ? (
              <ListSkeleton />
            ) : visibleConvos.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.inkFaint, fontSize: '0.84rem' }}>
                {filter === 'all' ? 'No conversations yet.' : 'Nothing here.'}
              </div>
            ) : visibleConvos.map(c => {
              const on = activeId === c.id;
              const meta = roleMeta[c.participant.role];
              const isStar = starred.has(c.id);
              return (
                <button key={c.id} onClick={() => openConvo(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center',
                    padding: '11px 12px', marginBottom: 2, borderRadius: 12, cursor: 'pointer',
                    background: on ? C.coralSoft : 'transparent',
                    border: `1px solid ${on ? 'rgba(255,90,45,0.28)' : 'transparent'}`,
                    transition: 'background 0.13s, border-color 0.13s',
                  }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = C.hover; }}
                  onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                  <Avatar participant={c.participant} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.participant.name}
                      </span>
                      {isStar && <Star size={11} fill={C.coral} color={C.coral} style={{ flexShrink: 0 }} />}
                      <span style={{ marginLeft: 'auto', fontSize: '0.66rem', color: c.unreadCount > 0 ? C.coral : C.inkFaint, fontWeight: c.unreadCount > 0 ? 700 : 500, flexShrink: 0 }}>
                        {relTime(c.lastMessage.timestamp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: '0.78rem',
                        color: c.unreadCount > 0 ? C.ink : C.inkMuted,
                        fontWeight: c.unreadCount > 0 ? 600 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.lastMessage.isFromMe && <span style={{ color: C.inkFaint }}>You: </span>}
                        {c.lastMessage.text}
                      </span>
                      {c.unreadCount > 0 && (
                        <span style={{
                          background: C.coral, color: '#fff', fontSize: '0.62rem', fontWeight: 800,
                          minWidth: 18, height: 18, borderRadius: 999, padding: '0 5px',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{c.unreadCount}</span>
                      )}
                    </div>
                    <span style={{
                      display: 'inline-block', marginTop: 5, fontSize: '0.6rem', fontWeight: 800,
                      letterSpacing: '0.07em', textTransform: 'uppercase', color: meta.color,
                      background: meta.tint, padding: '2px 7px', borderRadius: 5,
                    }}>{meta.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* ════════════ CENTER: Thread ════════════ */}
      {showThread && (
        active ? (
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: C.bg }}>
            {/* Thread header */}
            <header style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
              borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0,
            }}>
              {isNarrow && (
                <button onClick={() => setPaneThread(false)} aria-label="Back to inbox"
                  style={{ background: 'none', border: 'none', color: C.inkMuted, cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <ChevronLeft size={22} />
                </button>
              )}
              <Avatar participant={active.participant} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{active.participant.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: roleMeta[active.participant.role].color }}>
                    {roleMeta[active.participant.role].label}
                  </span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: C.inkFaint }} />
                  <span style={{ fontSize: '0.72rem', color: active.participant.isOnline ? '#43d17f' : C.inkFaint }}>
                    {active.participant.isOnline ? 'Active now' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* Real header actions */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconBtn label={starred.has(active.id) ? 'Unstar' : 'Star'} onClick={() => toggleSet(setStarred, active.id)} active={starred.has(active.id)}>
                  <Star size={18} fill={starred.has(active.id) ? C.coral : 'none'} color={starred.has(active.id) ? C.coral : undefined} />
                </IconBtn>
                <IconBtn label={muted.has(active.id) ? 'Unmute' : 'Mute'} onClick={() => toggleSet(setMuted, active.id)} active={muted.has(active.id)}>
                  <BellOff size={18} color={muted.has(active.id) ? C.coral : undefined} />
                </IconBtn>
                {!isNarrow && (
                  <IconBtn label="Details" onClick={() => setContextOpen(o => !o)} active={contextOpen}>
                    <ShieldCheck size={18} color={contextOpen ? C.coral : undefined} />
                  </IconBtn>
                )}
                <div style={{ position: 'relative' }} ref={menuRef}>
                  <IconBtn label="More" onClick={() => setMenuOpen(o => !o)} active={menuOpen}>
                    <MoreHorizontal size={18} />
                  </IconBtn>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        style={{
                          position: 'absolute', top: '110%', right: 0, width: 184, background: '#141414',
                          border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, zIndex: 50,
                          boxShadow: '0 18px 48px rgba(0,0,0,0.65)',
                        }}>
                        <MenuItem onClick={() => { searchRef.current?.focus(); setMenuOpen(false); }}>Search in conversation</MenuItem>
                        <MenuItem onClick={() => { toggleSet(setMuted, active.id); setMenuOpen(false); }}>{muted.has(active.id) ? 'Unmute notifications' : 'Mute notifications'}</MenuItem>
                        <MenuItem onClick={() => { toggleSet(setStarred, active.id); setMenuOpen(false); }}>{starred.has(active.id) ? 'Remove star' : 'Star conversation'}</MenuItem>
                        <div style={{ height: 1, background: C.borderSoft, margin: '5px 4px' }} />
                        <MenuItem danger onClick={() => { setConvos(p => p.filter(c => c.id !== active.id)); setActiveId(null); setPaneThread(false); setMenuOpen(false); }}>Archive conversation</MenuItem>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            {/* Message scroll area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 8px 12px' }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.inkFaint, fontSize: '0.84rem' }}>Loading…</div>
              ) : (
                <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
                  <AnimatePresence initial={false}>
                    {msgs.map((m, i) => {
                      const prev = msgs[i - 1];
                      const next = msgs[i + 1];
                      const newDay = !prev || dayKey(prev.timestamp) !== dayKey(m.timestamp);
                      const sameRunPrev = prev && prev.isFromMe === m.isFromMe && !newDay &&
                        (new Date(m.timestamp).getTime() - new Date(prev.timestamp).getTime() < 5 * 60_000);
                      const sameRunNext = next && next.isFromMe === m.isFromMe &&
                        dayKey(next.timestamp) === dayKey(m.timestamp) &&
                        (new Date(next.timestamp).getTime() - new Date(m.timestamp).getTime() < 5 * 60_000);
                      const showMeta = !sameRunNext;

                      return (
                        <React.Fragment key={m.id}>
                          {newDay && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
                              <div style={{ flex: 1, height: 1, background: C.borderSoft }} />
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint }}>{dayLabel(m.timestamp)}</span>
                              <div style={{ flex: 1, height: 1, background: C.borderSoft }} />
                            </div>
                          )}
                          {i === firstUnreadIdx && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 14px' }}>
                              <div style={{ flex: 1, height: 1, background: 'rgba(255,90,45,0.4)' }} />
                              <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.coral }}>New</span>
                              <div style={{ flex: 1, height: 1, background: 'rgba(255,90,45,0.4)' }} />
                            </div>
                          )}
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14 }}
                            style={{ display: 'flex', justifyContent: m.isFromMe ? 'flex-end' : 'flex-start', marginTop: sameRunPrev ? 2 : 10 }}>
                            <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: m.isFromMe ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                padding: '9px 13px', fontSize: '0.88rem', lineHeight: 1.5, wordBreak: 'break-word',
                                color: m.isFromMe ? '#fff' : C.bubbleInText,
                                background: m.isFromMe
                                  ? 'linear-gradient(135deg, #ff6a3d, #ef4a1d)'
                                  : C.bubbleIn,
                                border: m.isFromMe ? 'none' : `1px solid ${C.border}`,
                                borderRadius: 18,
                                borderBottomRightRadius: m.isFromMe && !sameRunNext ? 5 : 18,
                                borderBottomLeftRadius: !m.isFromMe && !sameRunNext ? 5 : 18,
                                boxShadow: m.isFromMe ? '0 2px 14px rgba(255,90,45,0.22)' : 'none',
                              }}>
                                {m.text}
                              </div>
                              {showMeta && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '0 4px' }}>
                                  <span style={{ fontSize: '0.62rem', color: C.inkFaint }}>{clockTime(m.timestamp)}</span>
                                  {m.isFromMe && (m.isRead
                                    ? <CheckCheck size={13} color={C.coral} />
                                    : <Check size={13} color={C.inkFaint} />)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </React.Fragment>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div style={{ borderTop: `1px solid ${C.border}`, background: C.panel, padding: '12px 16px', flexShrink: 0 }}>
              <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
                <AnimatePresence>
                  {emojiOpen && (
                    <motion.div ref={emojiRef} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      style={{
                        position: 'absolute', bottom: '110%', left: 0, marginBottom: 8, padding: 10,
                        background: '#141414', border: `1px solid ${C.border}`, borderRadius: 14,
                        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, zIndex: 40,
                        boxShadow: '0 16px 44px rgba(0,0,0,0.6)',
                      }}>
                      {EMOJI.map(e => (
                        <button key={e} onClick={() => insertEmoji(e)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', padding: 6, borderRadius: 8, transition: 'background 0.12s' }}
                          onMouseEnter={ev => (ev.currentTarget.style.background = C.hover)}
                          onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}>{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 8,
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '6px 6px 6px 8px',
                }}>
                  <button aria-label="Attach file" title="Attach (coming soon)" disabled
                    style={{ background: 'none', border: 'none', color: C.inkFaint, cursor: 'not-allowed', padding: 8, display: 'flex', alignSelf: 'flex-end' }}>
                    <Paperclip size={19} />
                  </button>
                  <textarea ref={inputRef} rows={1} placeholder={`Message ${active.participant.name.split(' ')[0]}…`}
                    value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    style={{
                      flex: 1, resize: 'none', background: 'none', border: 'none', outline: 'none',
                      color: C.ink, fontSize: '0.9rem', lineHeight: 1.5, padding: '8px 0', maxHeight: 140,
                      fontFamily: 'inherit',
                    }} />
                  <button aria-label="Emoji" onClick={() => setEmojiOpen(o => !o)}
                    style={{ background: 'none', border: 'none', color: emojiOpen ? C.coral : C.inkMuted, cursor: 'pointer', padding: 8, display: 'flex', alignSelf: 'flex-end' }}>
                    <Smile size={19} />
                  </button>
                  <motion.button key={sendPulse} onClick={send} disabled={!draft.trim()} aria-label="Send message"
                    whileTap={{ scale: 0.85 }} animate={sendPulse ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.22 }}
                    style={{
                      width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0, alignSelf: 'flex-end',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: draft.trim() ? C.coral : '#222', cursor: draft.trim() ? 'pointer' : 'not-allowed',
                      boxShadow: draft.trim() ? '0 4px 16px rgba(255,90,45,0.4)' : 'none', transition: 'background 0.15s',
                    }}>
                    <Send size={17} color={draft.trim() ? '#fff' : C.inkFaint} />
                  </motion.button>
                </div>
                <div style={{ fontSize: '0.64rem', color: C.inkFaint, textAlign: 'center', marginTop: 7 }}>
                  Coaches can view your profile from here — keep it professional. <span style={{ color: C.inkMuted }}>Enter to send · Shift+Enter for a new line</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <EmptyThread onCompose={() => setComposeOpen(true)} />
        )
      )}

      {/* ════════════ RIGHT: Recruiting context ════════════ */}
      {active && contextOpen && !isNarrow && (
        <aside style={{ width: 268, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: C.panel, overflowY: 'auto' }}>
          <ContextPanel participant={active.participant} navigate={navigate} />
        </aside>
      )}

      {/* ════════════ Compose modal ════════════ */}
      <AnimatePresence>
        {composeOpen && (
          <ComposeModal
            convos={convos}
            onClose={() => setComposeOpen(false)}
            onPick={(id) => { setComposeOpen(false); openConvo(id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ───────────────────────── Subcomponents ───────────────────────── */

function IconBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      style={{
        width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
        background: active ? C.coralSoft : 'transparent', color: active ? C.coral : C.inkMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.13s, color 0.13s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.hover; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: 'transparent', color: danger ? '#f87171' : C.ink, fontSize: '0.82rem', fontWeight: 500,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.1)' : C.hover)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div style={{ padding: '6px 4px' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 12px' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#161616', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 11, width: '55%', background: '#161616', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 9, width: '85%', background: '#131313', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyThread({ onCompose }: { onCompose: () => void }) {
  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 24 }}>
      <div style={{
        width: 76, height: 76, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.coralSoft, border: '1px solid rgba(255,90,45,0.25)', marginBottom: 20,
      }}>
        <Inbox size={34} color={C.coral} />
      </div>
      <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.5rem', textTransform: 'uppercase', color: C.ink, margin: '0 0 8px' }}>
        Your recruiting line
      </h2>
      <p style={{ color: C.inkMuted, fontSize: '0.88rem', textAlign: 'center', maxWidth: 320, lineHeight: 1.6, margin: '0 0 22px' }}>
        Coaches, recruiters, and teammates reach you here. Pick a conversation or start a new one.
      </p>
      <motion.button whileTap={{ scale: 0.96 }} onClick={onCompose}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none',
          background: C.coral, color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
          boxShadow: '0 6px 22px rgba(255,90,45,0.4)',
        }}>
        <Plus size={17} strokeWidth={2.6} /> New Message
      </motion.button>
    </section>
  );
}

function ContextPanel({ participant, navigate }: { participant: Participant; navigate: ReturnType<typeof useNavigate> }) {
  const meta = roleMeta[participant.role];
  const isRecruiting = participant.role === 'coach' || participant.role === 'recruiter';
  return (
    <div style={{ padding: '26px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Avatar participant={participant} size={76} />
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: C.ink, marginTop: 14, textAlign: 'center' }}>{participant.name}</div>
      <span style={{
        marginTop: 7, fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
        color: meta.color, background: meta.tint, padding: '4px 10px', borderRadius: 6,
      }}>{meta.label}</span>
      <span style={{ marginTop: 8, fontSize: '0.74rem', color: participant.isOnline ? '#43d17f' : C.inkFaint }}>
        {participant.isOnline ? '● Active now' : '○ Offline'}
      </span>

      <div style={{ width: '100%', height: 1, background: C.borderSoft, margin: '20px 0' }} />

      {isRecruiting ? (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint, marginBottom: 10 }}>
            Recruiting Contact
          </div>
          <div style={{
            display: 'flex', gap: 9, padding: 12, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, marginBottom: 14,
          }}>
            <Trophy size={16} color={C.coral} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: '0.76rem', color: C.inkMuted, lineHeight: 1.5 }}>
              This contact can scout your profile, highlights, and rankings. Replies reflect on your recruiting brand.
            </p>
          </div>
          <button onClick={() => navigate('/profile')}
            style={{
              width: '100%', padding: '11px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: C.coral, color: '#fff', fontWeight: 700, fontSize: '0.82rem',
              boxShadow: '0 4px 16px rgba(255,90,45,0.3)',
            }}>
            View My Showcase
          </button>
          <button onClick={() => navigate('/recruiting')}
            style={{
              width: '100%', padding: '11px', borderRadius: 11, marginTop: 9, cursor: 'pointer',
              background: 'transparent', color: C.ink, fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${C.border}`,
            }}>
            Explore Programs
          </button>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint, marginBottom: 10 }}>
            Teammate
          </div>
          <button onClick={() => navigate('/rankings')}
            style={{
              width: '100%', padding: '11px', borderRadius: 11, cursor: 'pointer',
              background: 'transparent', color: C.ink, fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${C.border}`,
            }}>
            View Rankings
          </button>
        </div>
      )}
    </div>
  );
}

function ComposeModal({ convos, onClose, onPick }: { convos: Convo[]; onClose: () => void; onPick: (id: number) => void }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const results = convos.filter(c => c.participant.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(480px, 92vw)', background: '#121212', border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
          <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', textTransform: 'uppercase', color: C.ink, margin: 0 }}>New Message</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: C.inkMuted, cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint, pointerEvents: 'none' }} />
            <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search your contacts"
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 11, padding: '11px 12px 11px 36px', color: C.ink, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '0 10px 12px' }}>
          {results.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: C.inkFaint, fontSize: '0.82rem' }}>
              No contacts match. Reach new coaches from the <span style={{ color: C.coral, fontWeight: 600 }}>Recruiting</span> tab.
            </div>
          ) : results.map(c => {
            const meta = roleMeta[c.participant.role];
            return (
              <button key={c.id} onClick={() => onPick(c.id)}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 11, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Avatar participant={c.participant} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink }}>{c.participant.name}</div>
                  <span style={{ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: meta.color }}>{meta.label}</span>
                </div>
                <Send size={15} color={C.inkFaint} />
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
