import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, MessageSquare } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

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

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return 'Yesterday';
  return d.toLocaleDateString();
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#1a1a1a', border: '1px solid rgba(255,90,45,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, color: '#ff5a2d', flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

interface PlayerResult {
  id: number;
  name: string;
  position: string;
  school: string;
  state: string;
}

export function CoachMessages() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [composing, setComposing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotifications();
  const token = localStorage.getItem('coachToken');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/coach/messages', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const raw: RawMessage[] = data.messages || [];

      const threadMap = new Map<number, Thread>();
      for (const m of raw) {
        if (!threadMap.has(m.athleteId)) {
          threadMap.set(m.athleteId, { athleteId: m.athleteId, athleteName: m.athleteName, messages: [], lastAt: m.createdAt, unread: 0 });
        }
        const t = threadMap.get(m.athleteId)!;
        t.messages.push(m);
        if (new Date(m.createdAt) > new Date(t.lastAt)) t.lastAt = m.createdAt;
        if (!m.read && m.senderType === 'athlete') t.unread++;
      }

      const sorted = [...threadMap.values()].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
      setThreads(sorted);
      if (!activeAthleteId && sorted.length) setActiveAthleteId(sorted[0].athleteId);
    } finally {
      setLoading(false);
    }
  }, [activeAthleteId]);

  useEffect(() => { fetchMessages(); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeAthleteId, threads]);

  const searchPlayers = useCallback(async (q: string) => {
    if (!q.trim()) { setPlayerResults([]); return; }
    setSearchingPlayers(true);
    try {
      const res = await fetch(`/coach/players/search?q=${encodeURIComponent(q)}&limit=8`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPlayerResults(data.players || data.data || []);
      }
    } finally {
      setSearchingPlayers(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(playerSearch), 300);
    return () => clearTimeout(t);
  }, [playerSearch]);

  const send = async (athleteId: number) => {
    if (!draft.trim()) return;
    try {
      const res = await fetch(`/coach/message/${athleteId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: draft }),
      });
      if (res.ok) {
        setDraft('');
        setComposing(false);
        setPlayerSearch('');
        setPlayerResults([]);
        fetchMessages();
        showNotification('success', 'Sent', 'Message delivered.');
      }
    } catch {
      showNotification('error', 'Send Failed', 'Could not send message. Please try again.');
    }
  };

  const activeThread = threads.find(t => t.athleteId === activeAthleteId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '0 -24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', textTransform: 'uppercase', color: '#fff', margin: 0 }}>Messages</h2>
          <button onClick={() => setComposing(true)}
            style={{ background: '#ff5a2d', border: 'none', borderRadius: 7, padding: '5px 10px', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' }}>
            + NEW
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '24px 16px', color: '#444', fontSize: '0.8rem', textAlign: 'center' }}>Loading…</div>
          ) : threads.length === 0 ? (
            <div style={{ padding: '24px 16px', color: '#444', fontSize: '0.8rem', textAlign: 'center' }}>No messages yet</div>
          ) : threads.map(t => (
            <div key={t.athleteId} onClick={() => { setActiveAthleteId(t.athleteId); setComposing(false); }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
                background: activeAthleteId === t.athleteId && !composing ? 'rgba(255,90,45,0.07)' : 'transparent',
                borderLeft: activeAthleteId === t.athleteId && !composing ? '2px solid #ff5a2d' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!(activeAthleteId === t.athleteId && !composing)) e.currentTarget.style.background = '#111'; }}
              onMouseLeave={e => { if (!(activeAthleteId === t.athleteId && !composing)) e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar name={t.athleteName} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.athleteName}</span>
                  <span style={{ fontSize: '0.62rem', color: '#444', flexShrink: 0 }}>{formatTime(t.lastAt)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {t.messages[t.messages.length - 1]?.content}
                  </span>
                  {t.unread > 0 && (
                    <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#ff5a2d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 6 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>{t.unread}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main panel */}
      {composing ? (
        /* New message compose */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>New Message</span>
          </div>

          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search athletes…"
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  autoFocus
                  style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px 10px 34px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
              </div>

              {playerSearch && (
                <div style={{ marginTop: 8, background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                  {searchingPlayers ? (
                    <div style={{ padding: '12px 16px', color: '#444', fontSize: '0.8rem' }}>Searching…</div>
                  ) : playerResults.length === 0 ? (
                    <div style={{ padding: '12px 16px', color: '#444', fontSize: '0.8rem' }}>No players found</div>
                  ) : playerResults.map(p => (
                    <div key={p.id}
                      onClick={() => { setActiveAthleteId(p.id); setPlayerSearch(''); setPlayerResults([]); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.1s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Avatar name={p.name} size={32} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#555' }}>{p.position} · {p.school}, {p.state}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeAthleteId && !playerSearch && (
              <>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Write your message…"
                    style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', resize: 'none', height: 140, transition: 'border-color 0.15s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setComposing(false); setDraft(''); setPlayerSearch(''); setPlayerResults([]); }}
                    style={{ flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '10px', color: '#888', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => send(activeAthleteId)} disabled={!draft.trim()}
                    style={{ flex: 2, background: draft.trim() ? '#ff5a2d' : '#1a1a1a', border: 'none', borderRadius: 9, padding: '10px', color: draft.trim() ? '#fff' : '#444', fontSize: '0.85rem', fontWeight: 700, cursor: draft.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
                    <Send size={14} />
                    Send Message
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : activeThread ? (
        /* Thread view */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}>
            <Avatar name={activeThread.athleteName} size={40} />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{activeThread.athleteName}</div>
              <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Athlete</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeThread.messages
              .slice()
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map(m => {
                const isMe = m.senderType === 'coach';
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '60%', padding: '10px 14px',
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isMe ? '#ff5a2d' : '#161616',
                      border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.5, marginBottom: 4 }}>{m.content}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: '0.62rem', color: isMe ? 'rgba(255,255,255,0.55)' : '#444' }}>{formatTime(m.createdAt)}</span>
                        {isMe && <span style={{ fontSize: '0.62rem', color: m.read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)' }}>{m.read ? 'Read' : 'Unread'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#0a0a0a' }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Type a message…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(activeThread.athleteId)}
                style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <button onClick={() => send(activeThread.athleteId)} disabled={!draft.trim()}
              style={{ width: 38, height: 38, borderRadius: 9, background: draft.trim() ? '#ff5a2d' : '#1a1a1a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', flexShrink: 0 }}>
              <Send size={15} color={draft.trim() ? '#fff' : '#444'} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#333' }}>
          <MessageSquare size={32} />
          <span style={{ fontSize: '0.85rem' }}>No conversations yet — hit New to start one</span>
        </div>
      )}
    </div>
  );
}
