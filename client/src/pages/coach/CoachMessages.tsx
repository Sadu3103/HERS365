import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { useNotifications } from '../../context/NotificationContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type RawMessage = {
  id: number;
  coachId: number;
  athleteId: number;
  senderId: number;
  senderType: 'coach' | 'athlete';
  content: string;
  read: boolean;
  createdAt: string;
  athleteName: string;
};

type Convo = {
  athleteId: number;
  athleteName: string;
  lastMsg: string;
  lastAt: string;
  unread: number;
  msgs: RawMessage[];
};

type PlayerResult = {
  id: number;
  name: string;
  position: string;
  school: string;
  state: string;
  gradYear?: number;
};

// ── Coach auth fetch ──────────────────────────────────────────────────────────

async function coachFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('coachToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const e: any = new Error(data?.error || `Request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return data as T;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GRADIENTS = [
  ['#ff5a2d', '#ff8a6a'], ['#a855f7', '#ec4899'],
  ['#3b82f6', '#06b6d4'], ['#10b981', '#84cc16'],
  ['#f59e0b', '#ef4444'], ['#8b5cf6', '#6366f1'],
];

function getGradient(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return GRADIENTS[Math.abs(h) % GRADIENTS.length] as [string, string];
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [a, b] = getGradient(name);
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${a}, ${b})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function groupMessages(raw: RawMessage[]): Convo[] {
  const map = new Map<number, Convo>();
  for (const m of [...raw].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    if (!map.has(m.athleteId)) {
      map.set(m.athleteId, {
        athleteId: m.athleteId,
        athleteName: m.athleteName || `Player #${m.athleteId}`,
        lastMsg: '',
        lastAt: m.createdAt,
        unread: 0,
        msgs: [],
      });
    }
    const c = map.get(m.athleteId)!;
    c.msgs.push(m);
    c.lastMsg = m.content;
    c.lastAt = m.createdAt;
    if (!m.read && m.senderType === 'athlete') c.unread++;
  }
  return [...map.values()].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
}

// ── Three.js particle background ──────────────────────────────────────────────

function ParticleCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const w = window.innerWidth, h = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.z = 5;

    const N = 80;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = Array.from({ length: N }, () => ({
      x: (Math.random() - 0.5) * 0.014,
      y: (Math.random() - 0.5) * 0.014,
      z: (Math.random() - 0.5) * 0.007,
    }));
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff5a2d, size: 0.055,
      transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) {
        p[i * 3] += vel[i].x;
        p[i * 3 + 1] += vel[i].y;
        p[i * 3 + 2] += vel[i].z;
        if (Math.abs(p[i * 3]) > 4.2) vel[i].x *= -1;
        if (Math.abs(p[i * 3 + 1]) > 2.6) vel[i].y *= -1;
        if (Math.abs(p[i * 3 + 2]) > 1.6) vel[i].z *= -1;
      }
      geo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };
    tick();

    return () => { cancelAnimationFrame(raf); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingDots() {
  const dotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dots = dotsRef.current?.querySelectorAll('.dot');
    if (!dots) return;
    const tl = gsap.timeline({ repeat: -1 });
    dots.forEach((d, i) => tl.to(d, { y: -4, duration: 0.3, ease: 'power2.out' }, i * 0.12)
      .to(d, { y: 0, duration: 0.3, ease: 'power2.in' }, i * 0.12 + 0.3));
    return () => { tl.kill(); };
  }, []);
  return (
    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6,
      background: '#1c1c1e', borderRadius: 16, padding: '10px 14px', marginBottom: 4 }}>
      <div ref={dotsRef} style={{ display: 'flex', gap: 4 }}>
        {[0,1,2].map(i => <div key={i} className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#666' }} />)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoachMessages() {
  const qc = useQueryClient();
  const { showNotification } = useNotifications();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [msgText, setMsgText] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  // Typing indicator is not wired up to a backend signal yet; bind the flag so
  // the render below doesn't throw a ReferenceError when an active thread is
  // open. The <TypingDots /> branch stays in place for the future wire-up.
  const isTyping = false;

  const convListRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const composePanelRef = useRef<HTMLDivElement>(null);
  const sendBtnRef = useRef<HTMLButtonElement>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: rawMsgs = [], isLoading, isError: msgsError } = useQuery({
    queryKey: ['coach-messages'],
    queryFn: () => coachFetch<{ messages: RawMessage[] }>('/api/coach/messages').then(d => d.messages ?? []),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (msgsError) showNotification('error', 'Load Failed', 'Could not load messages. Check your connection and refresh.');
  }, [msgsError, showNotification]);

  const convos = useMemo(() => groupMessages(rawMsgs), [rawMsgs]);
  const activeConvo = useMemo(() => convos.find(c => c.athleteId === activeId) ?? null, [convos, activeId]);

  const filtered = useMemo(() =>
    !searchQ ? convos : convos.filter(c => c.athleteName.toLowerCase().includes(searchQ.toLowerCase())),
  [convos, searchQ]);

  const { data: playerResults = [] } = useQuery({
    queryKey: ['coach-player-search', playerSearch],
    queryFn: () => coachFetch<PlayerResult[]>(`/api/coach/players/search?q=${encodeURIComponent(playerSearch)}&limit=10`),
    enabled: playerSearch.length > 1,
    select: (d: unknown) => {
      if (Array.isArray(d)) return d as PlayerResult[];
      const obj = d as Record<string, unknown>;
      if (Array.isArray(obj?.players)) return obj.players as PlayerResult[];
      return [];
    },
  });

  const [contactRequestSent, setContactRequestSent] = useState<number | null>(null);

  const sendMut = useMutation({
    mutationFn: async ({ athleteId, content }: { athleteId: number; content: string }) => {
      try {
        return await coachFetch<{ contactRequest?: boolean }>(
          `/api/coach/message/${athleteId}`,
          { method: 'POST', body: JSON.stringify({ message: content }) }
        );
      } catch (e: any) {
        if (e?.status === 403) {
          const r = await coachFetch<{ success: boolean; data: { status: string } }>(
            `/api/coach/contact/${athleteId}`,
            { method: 'POST', body: JSON.stringify({ message: content }) }
          );
          return { ...r, contactRequest: true };
        }
        throw e;
      }
    },
    onSuccess: (data: any, vars) => {
      setMsgText('');
      if (data?.contactRequest) {
        setContactRequestSent(vars.athleteId);
      } else {
        qc.invalidateQueries({ queryKey: ['coach-messages'] });
      }
    },
    onError: () => {
      showNotification('error', 'Send Failed', 'Message could not be sent. Please try again.');
    },
  });

  // ── GSAP: conv list stagger ───────────────────────────────────────────────

  useEffect(() => {
    if (!isLoading && convListRef.current) {
      gsap.fromTo(convListRef.current.querySelectorAll('.conv-row'),
        { opacity: 0, x: -18 },
        { opacity: 1, x: 0, stagger: 0.05, duration: 0.38, ease: 'power2.out', delay: 0.1 });
    }
  }, [isLoading, filtered.length]);

  // ── GSAP: thread slide-in ─────────────────────────────────────────────────

  useEffect(() => {
    if (activeConvo && threadRef.current) {
      gsap.fromTo(threadRef.current.querySelectorAll('.msg-bubble'),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, stagger: 0.035, duration: 0.32, ease: 'power2.out' });
    }
  }, [activeConvo?.athleteId]);

  // ── GSAP: compose panel ───────────────────────────────────────────────────

  useEffect(() => {
    const el = composePanelRef.current;
    if (!el) return;
    if (composeOpen) {
      gsap.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.32, ease: 'power3.out' });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.22, ease: 'power2.in' });
    }
  }, [composeOpen]);

  // ── Scroll thread to bottom ───────────────────────────────────────────────

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [activeConvo?.msgs.length]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!msgText.trim() || !activeId) return;
    gsap.to(sendBtnRef.current, { scale: 0.88, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    sendMut.mutate({ athleteId: activeId, content: msgText });
  }, [msgText, activeId, sendMut]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectConvo = (convo: Convo) => {
    setActiveId(convo.athleteId);
    setMobileView('thread');
  };

  const handleComposeSelect = (player: PlayerResult) => {
    setActiveId(player.id);
    setSelectedPlayerName(player.name);
    setContactRequestSent(null);
    setComposeOpen(false);
    setPlayerSearch('');
    setMobileView('thread');
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const S = {
    shell: {
      position: 'relative' as const, zIndex: 1,
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'rgba(14,14,16,0.82)', backdropFilter: 'blur(2px)',
      fontFamily: "'DM Sans', 'Inter', sans-serif",
    },
    sidebar: {
      width: 320, flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column' as const,
      background: 'rgba(22,22,26,0.6)',
    },
    sidebarHead: {
      padding: '16px 14px 8px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    },
    headRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 12,
    },
    title: {
      fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em',
      color: '#fff', textTransform: 'uppercase' as const,
    },
    coachBadge: {
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
      background: 'linear-gradient(90deg,#a855f7,#ff5a2d)',
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      textTransform: 'uppercase' as const,
    },
    composeBtn: {
      width: 30, height: 30, borderRadius: '50%',
      background: '#ff5a2d', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 18, lineHeight: 1, flexShrink: 0,
      transition: 'background 0.2s',
    },
    searchInput: {
      width: '100%', background: '#1a1a1e',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 9999, padding: '8px 14px',
      color: '#fff', fontSize: '0.78rem', outline: 'none',
    },
    composePanel: {
      overflow: 'hidden', height: 0, opacity: 0,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    composePanelInner: {
      padding: '12px 14px',
    },
    composeSectionLabel: {
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
      color: '#ff5a2d', textTransform: 'uppercase' as const, marginBottom: 8,
    },
    playerSearchInput: {
      width: '100%', background: '#111113',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 9999, padding: '7px 14px',
      color: '#fff', fontSize: '0.78rem', outline: 'none',
      marginBottom: 8,
    },
    playerResultItem: {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
      background: 'rgba(255,255,255,0.03)',
      transition: 'background 0.15s',
      marginBottom: 4,
    },
    posBadge: (_pos: string) => ({
      fontSize: '0.6rem', fontWeight: 700,
      padding: '2px 6px', borderRadius: 4,
      background: 'rgba(168,85,247,0.15)',
      color: '#c084fc',
      letterSpacing: '0.04em',
    }),
    convList: {
      flex: 1, overflowY: 'auto' as const,
    },
    convRow: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '11px 14px', textAlign: 'left' as const,
      background: active ? 'rgba(255,90,45,0.08)' : 'transparent',
      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
      cursor: 'pointer', color: '#fff',
      borderLeft: active ? '2px solid #ff5a2d' : '2px solid transparent',
      transition: 'background 0.15s',
    }),
    convInfo: { flex: 1, minWidth: 0 },
    convName: (unread: boolean) => ({
      fontSize: '0.82rem', fontWeight: unread ? 700 : 500,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
      color: '#fff',
    }),
    convPreview: {
      fontSize: '0.7rem', color: '#666',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
      marginTop: 2,
    },
    unreadBadge: {
      minWidth: 18, height: 18, borderRadius: 9,
      background: '#ff5a2d', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6rem', fontWeight: 700, color: '#fff', padding: '0 4px',
    },
    convMeta: {
      fontSize: '0.65rem', color: '#555', marginTop: 1,
    },
    main: {
      flex: 1, display: 'flex', flexDirection: 'column' as const,
      background: 'rgba(14,14,16,0.5)',
    },
    threadHeader: {
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(22,22,26,0.4)',
    },
    threadName: { fontWeight: 700, fontSize: '0.9rem', color: '#fff', flex: 1 },
    viewProfileLink: {
      fontSize: '0.7rem', color: '#ff5a2d',
      textDecoration: 'none', fontWeight: 600,
      padding: '4px 10px', border: '1px solid rgba(255,90,45,0.3)',
      borderRadius: 999, transition: 'background 0.15s',
    },
    thread: {
      flex: 1, overflowY: 'auto' as const,
      padding: '20px 24px', display: 'flex',
      flexDirection: 'column' as const, gap: 6,
    },
    bubble: (mine: boolean) => ({
      maxWidth: '68%',
      padding: '9px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      fontSize: '0.84rem', lineHeight: 1.45,
      alignSelf: mine ? 'flex-end' : 'flex-start',
      background: mine ? 'linear-gradient(135deg,#ff5a2d,#ff7a4d)' : '#1c1c1e',
      color: '#fff',
      wordBreak: 'break-word' as const,
    }),
    bubbleMeta: (mine: boolean) => ({
      fontSize: '0.62rem', color: '#555',
      alignSelf: mine ? 'flex-end' : 'flex-start',
      marginBottom: 2,
    }),
    footer: {
      display: 'flex', gap: 10, padding: '14px 20px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(22,22,26,0.5)',
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
    },
    footerInput: {
      flex: 1, background: '#1a1a1e',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 9999, padding: '10px 16px',
      color: '#fff', fontSize: '0.84rem', outline: 'none',
      resize: 'none' as const,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: '50%',
      background: '#ff5a2d', border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0, alignSelf: 'flex-end',
    },
    emptyState: {
      flex: 1, display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center', gap: 10,
      color: '#444',
    },
    backBtn: {
      background: 'none', border: 'none', color: '#ff5a2d',
      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
      padding: '4px 8px', borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 4,
    },
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .conv-row:hover { background: rgba(255,255,255,0.03) !important; }
        .player-result-item:hover { background: rgba(255,255,255,0.07) !important; }
        .view-profile-link:hover { background: rgba(255,90,45,0.1); }
      `}</style>

      <ParticleCanvas />

      <div style={{
        ...S.shell,
        ...(isMobile ? { flexDirection: 'column' } : {}),
      }}>
        {/* ── Sidebar ── */}
        <div style={{
          ...S.sidebar,
          ...(isMobile && mobileView === 'thread' ? { display: 'none' } : {}),
          ...(isMobile ? { width: '100%', height: '100%' } : {}),
        }}>
          {/* Header */}
          <div style={S.sidebarHead}>
            <div style={S.headRow}>
              <div>
                <div style={S.title}>Messages</div>
                <div style={S.coachBadge}>Coach Portal</div>
              </div>
              <button
                style={S.composeBtn}
                onClick={() => setComposeOpen(v => !v)}
                title="Message a player"
              >
                {composeOpen ? '×' : '+'}
              </button>
            </div>

            <input
              style={S.searchInput}
              placeholder="Search conversations…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>

          {/* Compose panel */}
          <div ref={composePanelRef} style={S.composePanel}>
            <div style={S.composePanelInner}>
              <div style={S.composeSectionLabel}>Message a Player</div>
              <input
                style={S.playerSearchInput}
                placeholder="Search players by name…"
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                autoFocus={composeOpen}
              />
              {playerSearch.length > 1 && (
                <div>
                  {playerResults.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: '#555', padding: '6px 4px' }}>
                      {playerSearch.length < 2 ? 'Type to search…' : 'No players found'}
                    </div>
                  ) : playerResults.map(p => (
                    <div
                      key={p.id}
                      className="player-result-item"
                      style={S.playerResultItem}
                      onClick={() => handleComposeSelect(p)}
                    >
                      <Avatar name={p.name} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#666' }}>{p.school} · {p.state}</div>
                      </div>
                      <span style={S.posBadge(p.position)}>{p.position}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div ref={convListRef} style={S.convList}>
            {isLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#444', fontSize: '0.78rem' }}>
                Loading…
              </div>
            ) : msgsError ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>⚠️</div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.5, marginBottom: 12 }}>
                  Could not load messages.
                </div>
                <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['coach-messages'] })}
                  style={{ background: '#ff5a2d', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 16px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#444' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>📭</div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {searchQ ? 'No conversations match.' : 'No messages yet. Use + to reach out to a player.'}
                </div>
              </div>
            ) : filtered.map(c => (
              <button
                key={c.athleteId}
                className="conv-row"
                style={S.convRow(activeId === c.athleteId)}
                onClick={() => handleSelectConvo(c)}
              >
                <Avatar name={c.athleteName} size={38} />
                <div style={S.convInfo}>
                  <div style={S.convName(c.unread > 0)}>{c.athleteName}</div>
                  <div style={S.convPreview}>{c.lastMsg}</div>
                  <div style={S.convMeta}>{relativeTime(c.lastAt)}</div>
                </div>
                {c.unread > 0 && (
                  <div style={S.unreadBadge}>{c.unread > 9 ? '9+' : c.unread}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main thread area ── */}
        <div style={{
          ...S.main,
          ...(isMobile && mobileView === 'list' ? { display: 'none' } : {}),
        }}>
          {activeConvo ? (
            <>
              {/* Thread header */}
              <div style={S.threadHeader}>
                {isMobile && (
                  <button style={S.backBtn} onClick={() => setMobileView('list')}>
                    ← Back
                  </button>
                )}
                <Avatar name={activeConvo.athleteName} size={34} />
                <div style={S.threadName}>{activeConvo.athleteName}</div>
                <Link
                  to={`/coach/players/${activeConvo.athleteId}`}
                  style={S.viewProfileLink}
                  className="view-profile-link"
                >
                  View Profile
                </Link>
              </div>

              {/* Messages */}
              <div ref={threadRef} style={S.thread}>
                {activeConvo.msgs.map((m, i) => {
                  const mine = m.senderType === 'coach';
                  return (
                    <div key={m.id}>
                      {(i === 0 || new Date(m.createdAt).getDate() !== new Date(activeConvo.msgs[i - 1].createdAt).getDate()) && (
                        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#444', margin: '8px 0 4px' }}>
                          {new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                      <div className="msg-bubble" style={S.bubble(mine)}>
                        {m.content}
                      </div>
                      <div style={S.bubbleMeta(mine)}>
                        {relativeTime(m.createdAt)}
                      </div>
                    </div>
                  );
                })}
                {isTyping && <TypingDots />}
              </div>

              {/* Compose footer */}
              <div style={S.footer}>
                <textarea
                  rows={1}
                  style={S.footerInput}
                  placeholder={`Message ${activeConvo.athleteName}…`}
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  ref={sendBtnRef}
                  style={{
                    ...S.sendBtn,
                    opacity: !msgText.trim() || sendMut.isPending ? 0.4 : 1,
                    cursor: !msgText.trim() || sendMut.isPending ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleSend}
                  disabled={!msgText.trim() || sendMut.isPending}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          ) : activeId && selectedPlayerName ? (
            <>
              <div style={S.threadHeader}>
                {isMobile && (
                  <button style={S.backBtn} onClick={() => setMobileView('list')}>
                    ← Back
                  </button>
                )}
                <Avatar name={selectedPlayerName} size={34} />
                <div style={S.threadName}>{selectedPlayerName}</div>
              </div>
              <div ref={threadRef} style={{ ...S.thread, alignItems: 'center', justifyContent: 'center' }}>
                {contactRequestSent === activeId ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <div style={{ fontSize: '2rem', marginBottom: 10 }}>✅</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: 6 }}>Contact Request Sent</div>
                    <div style={{ fontSize: '0.75rem', color: '#666', maxWidth: 280, lineHeight: 1.6 }}>
                      A parent or guardian must approve your request before messaging begins. You will be notified once approved.
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24 }}>
                    <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.6, maxWidth: 280 }}>
                      Send a contact request to {selectedPlayerName}. A parent must approve before direct messaging begins.
                    </div>
                  </div>
                )}
              </div>
              {contactRequestSent !== activeId && (
                <div style={S.footer}>
                  <textarea
                    rows={1}
                    style={S.footerInput}
                    placeholder={`Introduce yourself to ${selectedPlayerName}…`}
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    style={{
                      ...S.sendBtn,
                      opacity: !msgText.trim() || sendMut.isPending ? 0.4 : 1,
                      cursor: !msgText.trim() || sendMut.isPending ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleSend}
                    disabled={!msgText.trim() || sendMut.isPending}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={S.emptyState}>
              <div style={{ fontSize: '2.5rem' }}>💬</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#555' }}>Select a conversation</div>
              <div style={{ fontSize: '0.75rem', color: '#3a3a3a', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
                Choose a thread on the left, or tap <span style={{ color: '#ff5a2d' }}>+</span> to reach out to a player.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
