import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, Inbox, Plus, Send, User, X } from 'lucide-react';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { apiFetch } from '../lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const FLAME = '#ff5a2d';
const FLAME_L = '#ff8a6a';
const FONT = "'DM Sans', system-ui, sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────

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
type Grouped = ThreadMessage | { _sep: string };

// ─── Utils ────────────────────────────────────────────────────────────────────

function isSep(item: Grouped): item is { _sep: string } {
  return '_sep' in item;
}

function dateSepLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86_400_000);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(msgs: ThreadMessage[]): Grouped[] {
  const result: Grouped[] = [];
  let lastLabel = '';
  for (const m of msgs) {
    const label = dateSepLabel(m.createdAt);
    if (label !== lastLabel) {
      result.push({ _sep: label });
      lastLabel = label;
    }
    result.push(m);
  }
  return result;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,20%)`,
      border: `2px solid hsl(${hue},55%,32%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.34, fontWeight: 800,
      color: `hsl(${hue},70%,72%)`, fontFamily: FONT,
    }}>
      {initials || <User size={size * 0.45} />}
    </div>
  );
}

// ─── DateSep ──────────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 4px 8px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#3d3d3d', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap', fontFamily: FONT }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

// ─── NetworkCanvas ────────────────────────────────────────────────────────────

function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 80;

    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 35 : 65;
    const CONNECT_DIST = 14;
    const MAX_CONN = 3;
    const MAX_SEGS = COUNT * MAX_CONN;

    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      velocities[i * 3] = (Math.random() - 0.5) * 0.035;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.035;
    }

    const posAttr = new THREE.BufferAttribute(positions, 3);
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', posAttr);
    const ptMat = new THREE.PointsMaterial({ color: 0xff5a2d, size: 0.9, transparent: true, opacity: 0.45 });
    scene.add(new THREE.Points(ptGeo, ptMat));

    const linePos = new Float32Array(MAX_SEGS * 2 * 3);
    const linePosAttr = new THREE.BufferAttribute(linePos, 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', linePosAttr);
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff5a2d, transparent: true, opacity: 0.11 });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    const connections = new Int32Array(COUNT);
    let animId = 0;

    const resize = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        if (positions[i * 3] > 58) positions[i * 3] = -58;
        if (positions[i * 3] < -58) positions[i * 3] = 58;
        if (positions[i * 3 + 1] > 58) positions[i * 3 + 1] = -58;
        if (positions[i * 3 + 1] < -58) positions[i * 3 + 1] = 58;
      }
      posAttr.needsUpdate = true;

      connections.fill(0);
      let seg = 0;
      for (let i = 0; i < COUNT && seg < MAX_SEGS; i++) {
        if (connections[i] >= MAX_CONN) continue;
        for (let j = i + 1; j < COUNT && seg < MAX_SEGS; j++) {
          if (connections[i] >= MAX_CONN || connections[j] >= MAX_CONN) continue;
          const dx = positions[i * 3] - positions[j * 3];
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
          if (Math.sqrt(dx * dx + dy * dy) < CONNECT_DIST) {
            linePos[seg * 6] = positions[i * 3];
            linePos[seg * 6 + 1] = positions[i * 3 + 1];
            linePos[seg * 6 + 2] = positions[i * 3 + 2];
            linePos[seg * 6 + 3] = positions[j * 3];
            linePos[seg * 6 + 4] = positions[j * 3 + 1];
            linePos[seg * 6 + 5] = positions[j * 3 + 2];
            connections[i]++;
            connections[j]++;
            seg++;
          }
        }
      }
      linePosAttr.needsUpdate = true;
      lineGeo.setDrawRange(0, seg * 2);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      ptGeo.dispose();
      lineGeo.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.5 }}
    />
  );
}

// ─── UXUIOverlay ──────────────────────────────────────────────────────────────

function UXUIOverlay({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!visible) return;
    const overlay = overlayRef.current;
    const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];
    if (!overlay) return;
    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
    if (cards.length) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 16, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.07, ease: 'back.out(1.3)', delay: 0.1 },
      );
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const card: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(6,6,14,0.97)',
    border: '1px solid rgba(0,120,255,0.28)',
    borderRadius: 14,
    padding: '13px 15px',
    backdropFilter: 'blur(16px)',
  };

  return (
    <div
      ref={overlayRef}
      onClick={onDismiss}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(0,8,24,0.72)',
        backgroundImage: 'linear-gradient(rgba(0,120,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,120,255,0.04) 1px,transparent 1px)',
        backgroundSize: '22px 22px',
        backdropFilter: 'blur(3px)',
      }}
    >
      {/* Badge */}
      <div
        ref={(el) => { cardsRef.current[0] = el; }}
        style={{ ...card, top: 18, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: FONT }}>Design Mode</span>
        <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)', display: 'block' }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0', fontFamily: FONT }}>HERS365</span>
      </div>

      {/* Color tokens */}
      <div
        ref={(el) => { cardsRef.current[1] = el; }}
        style={{ ...card, top: 18, right: 16, minWidth: 168 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: FONT }}>Color Tokens</div>
        {([
          ['--flame', FLAME],
          ['--flame-l', FLAME_L],
          ['--violet', '#a855f7'],
          ['--green', '#22c55e'],
          ['--surface', '#0f0f0f'],
        ] as [string, string][]).map(([n, h]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <div style={{ width: 13, height: 13, borderRadius: 3, background: h, flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: '0.62rem', fontFamily: 'monospace' }}>{n}</span>
            <span style={{ color: '#334155', fontSize: '0.58rem', fontFamily: 'monospace', marginLeft: 'auto' }}>{h}</span>
          </div>
        ))}
      </div>

      {/* Type scale */}
      <div
        ref={(el) => { cardsRef.current[2] = el; }}
        style={{ ...card, bottom: 72, left: 16, minWidth: 188 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: FONT }}>Type Scale</div>
        {([
          ['xs', '0.68rem', 800],
          ['sm', '0.78rem', 600],
          ['base', '0.85rem', 400],
          ['lg', '1rem', 700],
          ['xl', '1.2rem', 800],
        ] as [string, string, number][]).map(([lbl, sz, wt]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ color: '#475569', fontSize: '0.58rem', fontFamily: 'monospace', width: 30 }}>{lbl}</span>
            <span style={{ color: '#e2e8f0', fontSize: sz, fontWeight: wt, fontFamily: FONT }}>Ag</span>
            <span style={{ color: '#334155', fontSize: '0.58rem', fontFamily: 'monospace', marginLeft: 'auto' }}>{sz}/{wt}</span>
          </div>
        ))}
      </div>

      {/* Spacing */}
      <div
        ref={(el) => { cardsRef.current[3] = el; }}
        style={{ ...card, bottom: 72, right: 16, minWidth: 148 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontFamily: FONT }}>Spacing</div>
        {[4, 8, 12, 16, 24, 32].map((n) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: n, height: 5, background: 'rgba(59,130,246,0.5)', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: '0.6rem', fontFamily: 'monospace' }}>{n}px</span>
          </div>
        ))}
      </div>

      {/* ESC hint */}
      <div
        ref={(el) => { cardsRef.current[4] = el; }}
        style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', color: '#3d4f5e', fontSize: '0.62rem', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontFamily: FONT, textAlign: 'center' }}
      >
        press{' '}
        <kbd style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace', fontSize: '0.6rem' }}>
          ESC
        </kbd>
        {' '}or click to dismiss
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export const Messages = () => {
  const qc = useQueryClient();
  const location = useLocation();

  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');
  const [activePartner, setActivePartner] = useState<number | null>(null);
  const [activePartnerName, setActivePartnerName] = useState('');
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeAthletes, setComposeAthletes] = useState<AthleteRow[]>([]);
  const [composeFilter, setComposeFilter] = useState('');
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [uxuiMode, setUxuiMode] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = location.state as { partnerId?: number; partnerName?: string } | null;
    if (state?.partnerId) {
      setActivePartner(state.partnerId);
      if (state.partnerName) setActivePartnerName(state.partnerName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GSAP entrance for compose panel — callback ref fires on mount
  const composeRef = useCallback((node: HTMLDivElement | null) => {
    if (node) gsap.fromTo(node, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' });
  }, []);

  const openCompose = async () => {
    setComposing(true);
    if (composeAthletes.length > 0) return;
    try {
      const res = await apiFetch<{ data: AthleteRow[] }>('/api/athletes?limit=30');
      setComposeAthletes((res.data ?? []).map((a: AthleteRow) => ({
        id: a.id,
        name: a.name ?? '',
        position: a.position ?? '',
        school: a.school ?? '',
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
  const grouped = groupByDate(thread);

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
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['thread', activePartner] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    },
  });

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
    threadEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [thread.length]);

  const checkEasterEgg = (val: string) => {
    if (val.toLowerCase().includes('ux ui')) {
      setUxuiMode(true);
      setDraft('');
    } else {
      setDraft(val);
    }
  };

  const activeConv = conversations.find((c) => c.partnerId === activePartner);
  const displayName = activeConv?.partnerName ?? activePartnerName;

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: FONT, color: '#fff', overflow: 'hidden', background: '#080808' }}>

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        background: '#090909',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', padding: '12px 12px 0', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setTab('inbox')} style={tabStyle(tab === 'inbox')}>
            <Inbox size={12} /> INBOX
          </button>
          <button onClick={() => setTab('requests')} style={tabStyle(tab === 'requests')}>
            <Clock size={12} /> REQUESTS{requests.length > 0 ? ` (${requests.length})` : ''}
          </button>
          <button
            onClick={openCompose}
            title="New message"
            style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: FLAME, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={14} color="#fff" />
          </button>
        </div>

        {/* Compose picker */}
        {composing && (
          <div ref={composeRef} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <input
                autoFocus
                value={composeFilter}
                onChange={(e) => setComposeFilter(e.target.value)}
                placeholder="Search athletes..."
                style={inputSt}
              />
              <button onClick={() => setComposing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0, display: 'flex', flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {composeAthletes
                .filter((a) => a.name.toLowerCase().includes(composeFilter.toLowerCase()))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setActivePartner(a.id); setActivePartnerName(a.name); setComposing(false); setComposeFilter(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 4px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', color: '#fff' }}
                  >
                    <Avatar name={a.name} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#555' }}>{a.position}{a.school ? ` · ${a.school}` : ''}</div>
                    </div>
                  </button>
                ))}
              {composeAthletes.length === 0 && (
                <div style={{ padding: '8px 4px', fontSize: '0.72rem', color: '#444' }}>Loading…</div>
              )}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'inbox' && conversations.length === 0 && (
            <div style={{ padding: '28px 20px', color: '#333', fontSize: '0.78rem' }}>No conversations yet.</div>
          )}
          {tab === 'inbox' && conversations.map((c) => (
            <button
              key={c.partnerId}
              onClick={() => { setActivePartner(c.partnerId); setActivePartnerName(c.partnerName); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '12px 14px',
                background: activePartner === c.partnerId ? 'rgba(255,90,45,0.07)' : 'transparent',
                borderLeft: activePartner === c.partnerId ? `2px solid ${FLAME}` : '2px solid transparent',
                borderTop: 'none', borderRight: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <Avatar name={c.partnerName} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.partnerName}</div>
                <div style={{ fontSize: '0.7rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.lastMessage}</div>
              </div>
              {c.unreadCount > 0 && (
                <div style={{ minWidth: 18, height: 18, borderRadius: 9, background: FLAME, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 900, color: '#fff', padding: '0 4px', flexShrink: 0 }}>
                  {c.unreadCount}
                </div>
              )}
            </button>
          ))}

          {tab === 'requests' && requests.length === 0 && (
            <div style={{ padding: '28px 20px', color: '#333', fontSize: '0.78rem' }}>No pending requests.</div>
          )}
          {tab === 'requests' && requests.map((r) => (
            <div key={r.id} style={{ padding: '14px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{r.senderName}</div>
              <div style={{ fontSize: '0.72rem', color: '#555', margin: '4px 0 10px', lineHeight: 1.4 }}>{r.content}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => respond.mutate({ id: r.id, action: 'approve' })} style={pillBtn(FLAME)}>Accept</button>
                <button onClick={() => respond.mutate({ id: r.id, action: 'reject' })} style={pillBtn('#222')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Thread panel ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
        <NetworkCanvas />

        {activePartner == null ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, gap: 10 }}>
            <div style={{ fontSize: '2rem', opacity: 0.15 }}>💬</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2a2a2a', letterSpacing: '0.04em' }}>Select a conversation</div>
            <div style={{ fontSize: '0.65rem', color: '#1e1e1e' }}>or compose a new message</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.88)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 2 }}>
              <button
                onClick={() => setActivePartner(null)}
                style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4, borderRadius: 8, flexShrink: 0 }}
              >
                <ChevronLeft size={17} />
              </button>
              {displayName && <Avatar name={displayName} size={32} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.87rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName || 'Conversation'}

                </div>
                {activeConv?.partnerRole && (
                  <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 1 }}>
                    {activeConv.partnerRole}
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 1 }}>
              {grouped.map((item, idx) => {
                if (isSep(item)) return <DateSep key={`sep-${idx}`} label={item._sep} />;
                const m = item as ThreadMessage;
                return (
                  <div
                    key={m.id}
                    style={{ alignSelf: m.isFromMe ? 'flex-end' : 'flex-start', maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: m.isFromMe ? 'flex-end' : 'flex-start' }}
                    onMouseEnter={() => setHoveredMsg(m.id)}
                    onMouseLeave={() => setHoveredMsg(null)}
                  >
                    <div style={{
                      background: m.isFromMe ? FLAME : '#141414',
                      color: '#fff',
                      padding: '9px 14px',
                      borderRadius: m.isFromMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      fontSize: '0.84rem',
                      lineHeight: 1.46,
                      border: m.isFromMe ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      boxShadow: m.isFromMe ? `0 2px 14px rgba(255,90,45,0.18)` : 'none',
                    }}>
                      {m.content}
                    </div>
                    {/* Reaction bar — hover reveal */}
                    <div style={{
                      display: 'flex', gap: 3, marginTop: 3,
                      opacity: hoveredMsg === m.id ? 1 : 0,
                      transform: hoveredMsg === m.id ? 'translateY(0)' : 'translateY(3px)',
                      transition: 'opacity 0.13s, transform 0.13s',
                      pointerEvents: hoveredMsg === m.id ? 'auto' : 'none',
                    }}>
                      {['👍', '❤️', '🔥', '💪'].map((r) => (
                        <button
                          key={r}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: '2px 7px', fontSize: '0.72rem', cursor: 'pointer', lineHeight: 1.4, transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); if (draft.trim() && activePartner != null) send.mutate({ partnerId: activePartner, content: draft.trim() }); }}
              style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 2, alignItems: 'center' }}
            >
              <input
                value={draft}
                onChange={(e) => checkEasterEgg(e.target.value)}
                placeholder="Type a message…"
                style={{ ...inputSt, flex: 1, padding: '10px 16px' }}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                style={{ background: draft.trim() ? FLAME : '#161616', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }}
              >
                <Send size={15} color={draft.trim() ? '#fff' : '#333'} />
              </button>
            </form>
          </>
        )}

        <UXUIOverlay visible={uxuiMode} onDismiss={() => setUxuiMode(false)} />
      </div>
    </div>
  );
};

// ─── Style helpers ─────────────────────────────────────────────────────────────

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '7px 0', margin: '0 0 10px', borderRadius: 9999, border: 'none', cursor: 'pointer',
    background: active ? FLAME : '#131313',
    color: active ? '#fff' : '#555',
    fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.07em', fontFamily: FONT,
    transition: 'background 0.15s, color 0.15s',
  };
}

function pillBtn(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none', borderRadius: 9999,
    padding: '5px 14px', fontSize: '0.68rem', fontWeight: 800, cursor: 'pointer', fontFamily: FONT,
  };
}

const inputSt: React.CSSProperties = {
  background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9999,
  padding: '7px 12px', color: '#fff', outline: 'none', fontSize: '0.84rem', fontFamily: FONT,
};
