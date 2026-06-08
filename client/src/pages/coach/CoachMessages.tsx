import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send, Search, Check, CheckCheck, Plus, X, Star, BellOff, MoreHorizontal,
  ClipboardList, ChevronLeft, Inbox, Paperclip, Smile, BarChart3, GraduationCap,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

/* ───────────────────────── Types ───────────────────────── */

interface RawMessage {
  id: number;
  athleteId: number;
  athleteName: string;
  senderType: 'coach' | 'athlete';
  content: string;
  read: boolean;
  createdAt: string;
}

interface Thread {
  athleteId: number;
  athleteName: string;
  messages: RawMessage[];
  lastAt: string;
  unread: number;
}

interface PlayerResult {
  id: number;
  name: string;
  position?: string;
  school?: string;
  state?: string;
  city?: string;
  gradYear?: number;
  height?: string;
  weight?: number;
  gpa?: number;
  breakoutScore?: number;
  stars?: number;
  archetype?: string;
  stats?: Record<string, number | string>;
  combineStats?: Record<string, number | string>;
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
  athlete: '#43d17f',
  athleteTint: 'rgba(67,209,127,0.14)',
};

const EMOJI = ['🔥', '💪', '🏈', '⚡️', '🎯', '🙌', '👏', '✅', '⭐️', '📈', '💯', '🤝'];

/* ───────────────────────── Time helpers ───────────────────────── */

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
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

/* ───────────────────────── Avatar (athletes — green ring) ───────────────────────── */

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const ini = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', padding: 2, flexShrink: 0, background: `linear-gradient(135deg, ${C.athlete}, ${C.athlete}55)` }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%', background: '#1c1c1c',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.34, fontWeight: 800, color: C.athlete, fontFamily: 'Barlow Condensed, sans-serif',
      }}>{ini}</div>
    </div>
  );
}

function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} fill={i < n ? C.coral : 'none'} color={i < n ? C.coral : C.inkFaint} />
      ))}
    </span>
  );
}

/* ───────────────────────── Component ───────────────────────── */

type FilterKey = 'all' | 'unread';

export function CoachMessages() {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeName, setActiveName] = useState<string>('');
  const [extraMsgs, setExtraMsgs] = useState<RawMessage[]>([]); // optimistic for new threads
  const [scout, setScout] = useState<PlayerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [muted, setMuted] = useState<Set<number>>(new Set());
  const [sendPulse, setSendPulse] = useState(0);
  const [isNarrow, setIsNarrow] = useState(false);
  const [paneThread, setPaneThread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('coachToken');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  /* responsive */
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* data */
  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/coach/messages', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const raw: RawMessage[] = data.messages || [];
      const map = new Map<number, Thread>();
      for (const m of raw) {
        if (!map.has(m.athleteId)) map.set(m.athleteId, { athleteId: m.athleteId, athleteName: m.athleteName, messages: [], lastAt: m.createdAt, unread: 0 });
        const t = map.get(m.athleteId)!;
        t.messages.push(m);
        if (new Date(m.createdAt) > new Date(t.lastAt)) t.lastAt = m.createdAt;
        if (!m.read && m.senderType === 'athlete') t.unread++;
      }
      const sorted = [...map.values()].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
      setThreads(sorted);
      setActiveId(prev => (prev == null && sorted.length && !isNarrow ? sorted[0].athleteId : prev));
    } finally {
      setLoading(false);
    }
  }, [headers, isNarrow]);

  const fetchScout = useCallback(async (id: number) => {
    setScout(null);
    try {
      const res = await fetch(`/coach/players/${id}`, { headers });
      if (res.ok) setScout(await res.json());
    } catch { /* degrade silently */ }
  }, [headers]);

  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (activeId != null) {
      fetchScout(activeId);
      const t = threads.find(x => x.athleteId === activeId);
      if (t) setActiveName(t.athleteName);
    }
  }, [activeId, fetchScout, threads]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeId, threads, extraMsgs]);

  /* close popovers */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* textarea auto-grow */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  /* actions */
  const openAthlete = (id: number, name: string) => {
    setActiveId(id);
    setActiveName(name);
    setExtraMsgs([]);
    setPaneThread(true);
    setMenuOpen(false);
    setComposeOpen(false);
    setTimeout(() => inputRef.current?.focus(), 120);
  };

  const send = async () => {
    if (!draft.trim() || activeId == null) return;
    const text = draft.trim();
    setDraft('');
    setEmojiOpen(false);
    setSendPulse(p => p + 1);
    const optimistic: RawMessage = {
      id: Date.now(), athleteId: activeId, athleteName: activeName,
      senderType: 'coach', content: text, read: false, createdAt: new Date().toISOString(),
    };
    // optimistic into the right place
    setThreads(prev => {
      const exists = prev.find(t => t.athleteId === activeId);
      if (!exists) return prev;
      return prev.map(t => t.athleteId === activeId
        ? { ...t, messages: [...t.messages, optimistic], lastAt: optimistic.createdAt }
        : t);
    });
    setExtraMsgs(prev => [...prev, optimistic]);
    try {
      const res = await fetch(`/coach/message/${activeId}`, { method: 'POST', headers, body: JSON.stringify({ message: text }) });
      if (res.ok) { await fetchThreads(); setExtraMsgs([]); }
      else showNotification('error', 'Send failed', 'Could not deliver the message.');
    } catch {
      showNotification('error', 'Send failed', 'Network error — try again.');
    }
    inputRef.current?.focus();
  };

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
    setter(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const addToBoard = async (id: number) => {
    try {
      const res = await fetch(`/coach/players/${id}/save`, { method: 'POST', headers, body: JSON.stringify({}) });
      if (res.ok) showNotification('success', 'Added to board', `${activeName} saved to your scouting board.`);
      else showNotification('error', 'Could not save', 'Try again from the player profile.');
    } catch {
      showNotification('error', 'Could not save', 'Network error.');
    }
  };

  /* derived */
  const activeThread = threads.find(t => t.athleteId === activeId) || null;
  const threadMsgs = useMemo(() => {
    const base = activeThread ? activeThread.messages.slice() : [];
    const merged = [...base];
    for (const e of extraMsgs) if (!merged.find(m => m.id === e.id)) merged.push(e);
    return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activeThread, extraMsgs]);

  const visibleThreads = useMemo(() => {
    let list = threads;
    if (search.trim()) list = list.filter(t => t.athleteName.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'unread') list = list.filter(t => t.unread > 0);
    return [...list].sort((a, b) => {
      const sa = starred.has(a.athleteId) ? 1 : 0;
      const sb = starred.has(b.athleteId) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    });
  }, [threads, search, filter, starred]);

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);
  const firstUnreadIdx = useMemo(() => {
    if (!activeThread || activeThread.unread === 0) return -1;
    return threadMsgs.findIndex(m => m.senderType === 'athlete' && !m.read);
  }, [threadMsgs, activeThread]);

  const showList = !isNarrow || !paneThread;
  const showThread = !isNarrow || paneThread;
  const hasActive = activeId != null;

  const FilterChip = ({ k, label }: { k: FilterKey; label: string }) => {
    const on = filter === k;
    return (
      <button onClick={() => setFilter(k)} style={{
        padding: '5px 11px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
        background: on ? C.coral : 'transparent', color: on ? '#fff' : C.inkMuted,
        border: `1px solid ${on ? C.coral : C.border}`, transition: 'all 0.15s',
      }}>{label}</button>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: C.bg, overflow: 'hidden' }}>

      {/* ════════ LEFT: thread list ════════ */}
      {showList && (
        <aside style={{ width: isNarrow ? '100%' : 332, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: C.panel }}>
          <div style={{ padding: '20px 18px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', textTransform: 'uppercase', color: C.ink, margin: 0, lineHeight: 1 }}>Inbox</h1>
                {totalUnread > 0 && (
                  <span style={{ background: C.coral, color: '#fff', fontSize: '0.66rem', fontWeight: 800, minWidth: 20, height: 20, borderRadius: 999, padding: '0 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(255,90,45,0.45)' }}>{totalUnread}</span>
                )}
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setComposeOpen(true)} aria-label="New message" title="Message an athlete"
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: C.coral, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,90,45,0.35)' }}>
                <Plus size={19} strokeWidth={2.6} />
              </motion.button>
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint, pointerEvents: 'none' }} />
              <input ref={searchRef} type="text" placeholder="Search athletes" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px 10px 36px', color: C.ink, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.45)')}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <FilterChip k="all" label="All" />
              <FilterChip k="unread" label={totalUnread > 0 ? `Unread · ${totalUnread}` : 'Unread'} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
            {loading ? (
              <ListSkeleton />
            ) : visibleThreads.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: C.inkFaint, fontSize: '0.84rem' }}>
                {threads.length === 0 ? 'No conversations yet. Start scouting.' : 'Nothing here.'}
              </div>
            ) : visibleThreads.map(t => {
              const on = activeId === t.athleteId;
              const last = t.messages[t.messages.length - 1];
              const isStar = starred.has(t.athleteId);
              return (
                <button key={t.athleteId} onClick={() => openAthlete(t.athleteId, t.athleteName)}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', padding: '11px 12px', marginBottom: 2, borderRadius: 12, cursor: 'pointer', background: on ? C.coralSoft : 'transparent', border: `1px solid ${on ? 'rgba(255,90,45,0.28)' : 'transparent'}`, transition: 'background 0.13s, border-color 0.13s' }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = C.hover; }}
                  onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                  <Avatar name={t.athleteName} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.athleteName}</span>
                      {isStar && <Star size={11} fill={C.coral} color={C.coral} style={{ flexShrink: 0 }} />}
                      <span style={{ marginLeft: 'auto', fontSize: '0.66rem', color: t.unread > 0 ? C.coral : C.inkFaint, fontWeight: t.unread > 0 ? 700 : 500, flexShrink: 0 }}>{relTime(t.lastAt)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: t.unread > 0 ? C.ink : C.inkMuted, fontWeight: t.unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {last?.senderType === 'coach' && <span style={{ color: C.inkFaint }}>You: </span>}{last?.content}
                      </span>
                      {t.unread > 0 && (
                        <span style={{ background: C.coral, color: '#fff', fontSize: '0.62rem', fontWeight: 800, minWidth: 18, height: 18, borderRadius: 999, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{t.unread}</span>
                      )}
                    </div>
                    <span style={{ display: 'inline-block', marginTop: 5, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.athlete, background: C.athleteTint, padding: '2px 7px', borderRadius: 5 }}>Athlete</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* ════════ CENTER: thread ════════ */}
      {showThread && (
        hasActive ? (
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: C.bg }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: C.panel, flexShrink: 0 }}>
              {isNarrow && (
                <button onClick={() => setPaneThread(false)} aria-label="Back to inbox" style={{ background: 'none', border: 'none', color: C.inkMuted, cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <ChevronLeft size={22} />
                </button>
              )}
              <Avatar name={activeName} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{activeName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.athlete }}>Athlete</span>
                  {scout?.position && <><span style={{ width: 3, height: 3, borderRadius: '50%', background: C.inkFaint }} /><span style={{ fontSize: '0.72rem', color: C.inkMuted }}>{scout.position}{scout.gradYear ? ` · ’${String(scout.gradYear).slice(2)}` : ''}</span></>}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconBtn label={starred.has(activeId!) ? 'Unstar' : 'Star'} onClick={() => toggleSet(setStarred, activeId!)} active={starred.has(activeId!)}>
                  <Star size={18} fill={starred.has(activeId!) ? C.coral : 'none'} color={starred.has(activeId!) ? C.coral : undefined} />
                </IconBtn>
                <IconBtn label={muted.has(activeId!) ? 'Unmute' : 'Mute'} onClick={() => toggleSet(setMuted, activeId!)} active={muted.has(activeId!)}>
                  <BellOff size={18} color={muted.has(activeId!) ? C.coral : undefined} />
                </IconBtn>
                {!isNarrow && (
                  <IconBtn label="Scouting report" onClick={() => setContextOpen(o => !o)} active={contextOpen}>
                    <ClipboardList size={18} color={contextOpen ? C.coral : undefined} />
                  </IconBtn>
                )}
                <div style={{ position: 'relative' }} ref={menuRef}>
                  <IconBtn label="More" onClick={() => setMenuOpen(o => !o)} active={menuOpen}>
                    <MoreHorizontal size={18} />
                  </IconBtn>
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        style={{ position: 'absolute', top: '110%', right: 0, width: 196, background: '#141414', border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, zIndex: 50, boxShadow: '0 18px 48px rgba(0,0,0,0.65)' }}>
                        <MenuItem onClick={() => { navigate(`/coach/player/${activeId}`); setMenuOpen(false); }}>View full profile</MenuItem>
                        <MenuItem onClick={() => { addToBoard(activeId!); setMenuOpen(false); }}>Add to scouting board</MenuItem>
                        <MenuItem onClick={() => { toggleSet(setMuted, activeId!); setMenuOpen(false); }}>{muted.has(activeId!) ? 'Unmute notifications' : 'Mute notifications'}</MenuItem>
                        <div style={{ height: 1, background: C.borderSoft, margin: '5px 4px' }} />
                        <MenuItem danger onClick={() => { setThreads(p => p.filter(t => t.athleteId !== activeId)); setActiveId(null); setPaneThread(false); setMenuOpen(false); }}>Archive conversation</MenuItem>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 8px 12px' }}>
              <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
                {threadMsgs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: C.athleteTint, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Send size={24} color={C.athlete} />
                    </div>
                    <p style={{ color: C.inkMuted, fontSize: '0.88rem', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
                      Start the conversation with <strong style={{ color: C.ink }}>{activeName.split(' ')[0]}</strong>. Lead with what stood out on film.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {threadMsgs.map((m, i) => {
                      const prev = threadMsgs[i - 1];
                      const next = threadMsgs[i + 1];
                      const isMe = m.senderType === 'coach';
                      const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                      const sameRunPrev = prev && prev.senderType === m.senderType && !newDay && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000);
                      const sameRunNext = next && next.senderType === m.senderType && dayKey(next.createdAt) === dayKey(m.createdAt) && (new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime() < 5 * 60_000);
                      return (
                        <React.Fragment key={m.id}>
                          {newDay && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
                              <div style={{ flex: 1, height: 1, background: C.borderSoft }} />
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint }}>{dayLabel(m.createdAt)}</span>
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
                            style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: sameRunPrev ? 2 : 10 }}>
                            <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                padding: '9px 13px', fontSize: '0.88rem', lineHeight: 1.5, wordBreak: 'break-word',
                                color: isMe ? '#fff' : C.bubbleInText,
                                background: isMe ? 'linear-gradient(135deg, #ff6a3d, #ef4a1d)' : C.bubbleIn,
                                border: isMe ? 'none' : `1px solid ${C.border}`,
                                borderRadius: 18,
                                borderBottomRightRadius: isMe && !sameRunNext ? 5 : 18,
                                borderBottomLeftRadius: !isMe && !sameRunNext ? 5 : 18,
                                boxShadow: isMe ? '0 2px 14px rgba(255,90,45,0.22)' : 'none',
                              }}>{m.content}</div>
                              {!sameRunNext && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '0 4px' }}>
                                  <span style={{ fontSize: '0.62rem', color: C.inkFaint }}>{clockTime(m.createdAt)}</span>
                                  {isMe && (m.read ? <CheckCheck size={13} color={C.coral} /> : <Check size={13} color={C.inkFaint} />)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </React.Fragment>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Composer */}
            <div style={{ borderTop: `1px solid ${C.border}`, background: C.panel, padding: '12px 16px', flexShrink: 0 }}>
              <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
                <AnimatePresence>
                  {emojiOpen && (
                    <motion.div ref={emojiRef} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      style={{ position: 'absolute', bottom: '110%', left: 0, marginBottom: 8, padding: 10, background: '#141414', border: `1px solid ${C.border}`, borderRadius: 14, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, zIndex: 40, boxShadow: '0 16px 44px rgba(0,0,0,0.6)' }}>
                      {EMOJI.map(e => (
                        <button key={e} onClick={() => { setDraft(d => d + e); inputRef.current?.focus(); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', padding: 6, borderRadius: 8 }}
                          onMouseEnter={ev => (ev.currentTarget.style.background = C.hover)}
                          onMouseLeave={ev => (ev.currentTarget.style.background = 'none')}>{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '6px 6px 6px 8px' }}>
                  <button aria-label="Attach" title="Attach (coming soon)" disabled style={{ background: 'none', border: 'none', color: C.inkFaint, cursor: 'not-allowed', padding: 8, display: 'flex', alignSelf: 'flex-end' }}>
                    <Paperclip size={19} />
                  </button>
                  <textarea ref={inputRef} rows={1} placeholder={`Message ${activeName.split(' ')[0] || 'athlete'}…`} value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    style={{ flex: 1, resize: 'none', background: 'none', border: 'none', outline: 'none', color: C.ink, fontSize: '0.9rem', lineHeight: 1.5, padding: '8px 0', maxHeight: 140, fontFamily: 'inherit' }} />
                  <button aria-label="Emoji" onClick={() => setEmojiOpen(o => !o)} style={{ background: 'none', border: 'none', color: emojiOpen ? C.coral : C.inkMuted, cursor: 'pointer', padding: 8, display: 'flex', alignSelf: 'flex-end' }}>
                    <Smile size={19} />
                  </button>
                  <motion.button key={sendPulse} onClick={send} disabled={!draft.trim()} aria-label="Send"
                    whileTap={{ scale: 0.85 }} animate={sendPulse ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.22 }}
                    style={{ width: 40, height: 40, borderRadius: 12, border: 'none', flexShrink: 0, alignSelf: 'flex-end', display: 'flex', alignItems: 'center', justifyContent: 'center', background: draft.trim() ? C.coral : '#222', cursor: draft.trim() ? 'pointer' : 'not-allowed', boxShadow: draft.trim() ? '0 4px 16px rgba(255,90,45,0.4)' : 'none', transition: 'background 0.15s' }}>
                    <Send size={17} color={draft.trim() ? '#fff' : C.inkFaint} />
                  </motion.button>
                </div>
                <div style={{ fontSize: '0.64rem', color: C.inkFaint, textAlign: 'center', marginTop: 7 }}>
                  Messaging a recruit — keep it compliant. <span style={{ color: C.inkMuted }}>Enter to send · Shift+Enter for a new line</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <EmptyThread onCompose={() => setComposeOpen(true)} />
        )
      )}

      {/* ════════ RIGHT: scouting report ════════ */}
      {hasActive && contextOpen && !isNarrow && (
        <aside style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: C.panel, overflowY: 'auto' }}>
          <ScoutPanel name={activeName} scout={scout} onProfile={() => navigate(`/coach/player/${activeId}`)} onSave={() => addToBoard(activeId!)} />
        </aside>
      )}

      {/* ════════ Compose modal ════════ */}
      <AnimatePresence>
        {composeOpen && (
          <ComposeModal headers={headers} onClose={() => setComposeOpen(false)} onPick={(p) => openAthlete(p.id, p.name)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Subcomponents ───────────────────────── */

function IconBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      style={{ width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? C.coralSoft : 'transparent', color: active ? C.coral : C.inkMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.13s, color 0.13s' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.hover; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: danger ? '#f87171' : C.ink, fontSize: '0.82rem', fontWeight: 500 }}
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
      <div style={{ width: 76, height: 76, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.coralSoft, border: '1px solid rgba(255,90,45,0.25)', marginBottom: 20 }}>
        <Inbox size={34} color={C.coral} />
      </div>
      <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.5rem', textTransform: 'uppercase', color: C.ink, margin: '0 0 8px' }}>Your recruiting board</h2>
      <p style={{ color: C.inkMuted, fontSize: '0.88rem', textAlign: 'center', maxWidth: 330, lineHeight: 1.6, margin: '0 0 22px' }}>
        Reach prospects directly. Search the athlete pool and open a conversation — their scouting report rides along.
      </p>
      <motion.button whileTap={{ scale: 0.96 }} onClick={onCompose}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: C.coral, color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 6px 22px rgba(255,90,45,0.4)' }}>
        <Plus size={17} strokeWidth={2.6} /> Message an Athlete
      </motion.button>
    </section>
  );
}

function ScoutPanel({ name, scout, onProfile, onSave }: { name: string; scout: PlayerResult | null; onProfile: () => void; onSave: () => void }) {
  const statEntries = useMemo(() => {
    if (!scout) return [];
    const src = scout.combineStats && Object.keys(scout.combineStats).length ? scout.combineStats : scout.stats;
    if (!src) return [];
    const labelMap: Record<string, string> = {
      fortyYard: '40-yd', vertical: 'Vert', broadJump: 'Broad', shuttle: 'Shuttle',
      receptions: 'Rec', receivingYards: 'Rec Yds', receivingTouchdowns: 'Rec TD', ydsPerCatch: 'Y/C',
    };
    return Object.entries(src).slice(0, 4).map(([k, v]) => ({ label: labelMap[k] || k, value: String(v) }));
  }, [scout]);

  return (
    <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Avatar name={name} size={72} />
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: C.ink, marginTop: 14, textAlign: 'center' }}>{name}</div>
      {scout?.position && (
        <div style={{ fontSize: '0.78rem', color: C.inkMuted, marginTop: 4 }}>
          {scout.position}{scout.gradYear ? ` · Class of ${scout.gradYear}` : ''}
        </div>
      )}
      {scout?.school && (
        <div style={{ fontSize: '0.74rem', color: C.inkFaint, marginTop: 2, textAlign: 'center' }}>
          {scout.school}{scout.city || scout.state ? ` · ${[scout.city, scout.state].filter(Boolean).join(', ')}` : ''}
        </div>
      )}
      {typeof scout?.stars === 'number' && <div style={{ marginTop: 10 }}><Stars n={scout.stars} size={14} /></div>}

      {typeof scout?.breakoutScore === 'number' && (
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, width: '100%', justifyContent: 'center', padding: '14px 0', borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}` }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2.2rem', color: C.coral, lineHeight: 1, textShadow: '0 0 20px rgba(255,90,45,0.4)' }}>{scout.breakoutScore}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint, marginTop: 5 }}>Breakout</div>
          </div>
          {scout.archetype && (
            <div style={{ maxWidth: 120 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.ink, lineHeight: 1.3, display: 'block' }}>{scout.archetype}</span>
              <span style={{ fontSize: '0.6rem', color: C.inkFaint }}>Archetype</span>
            </div>
          )}
        </div>
      )}

      {statEntries.length > 0 && (
        <div style={{ width: '100%', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.inkFaint, marginBottom: 10 }}>
            <BarChart3 size={12} /> Key Numbers
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {statEntries.map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: C.ink, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', color: C.inkFaint, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {typeof scout?.gpa === 'number' && (
        <div style={{ width: '100%', marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <GraduationCap size={15} color={C.athlete} />
          <span style={{ fontSize: '0.76rem', color: C.inkMuted }}>GPA</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1rem', color: C.ink }}>{scout.gpa}</span>
        </div>
      )}

      <button onClick={onProfile} style={{ width: '100%', marginTop: 18, padding: '11px', borderRadius: 11, border: 'none', cursor: 'pointer', background: C.coral, color: '#fff', fontWeight: 700, fontSize: '0.82rem', boxShadow: '0 4px 16px rgba(255,90,45,0.3)' }}>
        View Full Profile
      </button>
      <button onClick={onSave} style={{ width: '100%', marginTop: 9, padding: '11px', borderRadius: 11, cursor: 'pointer', background: 'transparent', color: C.ink, fontWeight: 600, fontSize: '0.82rem', border: `1px solid ${C.border}` }}>
        Add to Scouting Board
      </button>
    </div>
  );
}

function ComposeModal({ headers, onClose, onPick }: { headers: Record<string, string>; onClose: () => void; onPick: (p: PlayerResult) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/coach/players/search?q=${encodeURIComponent(q)}&limit=8`, { headers });
        if (res.ok) { const d = await res.json(); setResults(d.players || d.data || []); }
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, headers]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} onClick={e => e.stopPropagation()}
        style={{ width: 'min(500px, 92vw)', background: '#121212', border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 6px' }}>
          <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', textTransform: 'uppercase', color: C.ink, margin: 0 }}>Message an Athlete</h3>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: C.inkMuted, cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        <p style={{ margin: 0, padding: '0 20px 14px', fontSize: '0.76rem', color: C.inkFaint }}>Search the athlete pool by name, position, or school.</p>
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint, pointerEvents: 'none' }} />
            <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search athletes"
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 11, padding: '11px 12px 11px 36px', color: C.ink, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '0 10px 12px' }}>
          {!q.trim() ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: C.inkFaint, fontSize: '0.82rem' }}>Start typing to find prospects.</div>
          ) : searching ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: C.inkFaint, fontSize: '0.82rem' }}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: C.inkFaint, fontSize: '0.82rem' }}>No athletes match.</div>
          ) : results.map(p => (
            <button key={p.id} onClick={() => onPick(p)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 11, border: 'none', background: 'transparent', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Avatar name={p.name} size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: C.ink }}>{p.name}</span>
                  {typeof p.stars === 'number' && <Stars n={p.stars} size={10} />}
                </div>
                <span style={{ fontSize: '0.72rem', color: C.inkMuted }}>
                  {[p.position, p.school, p.state].filter(Boolean).join(' · ')}
                </span>
              </div>
              {typeof p.breakoutScore === 'number' && (
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1rem', color: C.coral, flexShrink: 0 }}>{p.breakoutScore}</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
