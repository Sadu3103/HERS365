import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MoreVertical, Phone, Video, Check, CheckCheck, Paperclip, Smile, CheckCircle2, ChevronLeft } from 'lucide-react';

interface Convo {
  id: number;
  name: string;
  role: 'coach' | 'athlete' | 'recruiter';
  online: boolean;
  lastMsg: string;
  time: string;
  fromMe: boolean;
  unread: number;
}

interface Msg {
  id: number;
  text: string;
  time: string;
  fromMe: boolean;
  read: boolean;
}

const convos: Convo[] = [
  { id: 1, name: 'Coach Anderson',  role: 'coach',     online: true,  lastMsg: 'Great game last Friday! Your performance was outstanding.', time: '2m',     fromMe: false, unread: 2 },
  { id: 2, name: 'Sarah Johnson',   role: 'athlete',   online: false, lastMsg: 'Thanks for the feedback on my QB mechanics!',               time: '1h',     fromMe: true,  unread: 0 },
  { id: 3, name: 'Recruiter Mike',  role: 'recruiter', online: true,  lastMsg: "We'd love to discuss your future at State University.",      time: '3h',     fromMe: false, unread: 1 },
  { id: 4, name: 'Maya Johnson',    role: 'athlete',   online: true,  lastMsg: 'See you at 7v7 on Saturday!',                              time: 'Yesterday', fromMe: false, unread: 0 },
  { id: 5, name: 'Coach Martinez',  role: 'coach',     online: false, lastMsg: 'Film review is at 4pm tomorrow.',                          time: '2d',     fromMe: false, unread: 0 },
];

const threadMap: Record<number, Msg[]> = {
  1: [
    { id: 1, text: 'Hey! Wanted to say you looked sharp at practice today.',        time: 'Yesterday 2:30 PM', fromMe: false, read: true },
    { id: 2, text: "Thank you Coach, I've been putting in extra reps after hours.", time: 'Yesterday 2:35 PM', fromMe: true,  read: true },
    { id: 3, text: 'That dedication shows. Your release time has improved a lot.',  time: 'Yesterday 2:36 PM', fromMe: false, read: true },
    { id: 4, text: "Thanks! Coach Martinez has been helping me dial it in.",        time: '3h ago',            fromMe: true,  read: true },
    { id: 5, text: 'Great game last Friday! Your performance was outstanding.',     time: '2m ago',            fromMe: false, read: false },
  ],
  2: [
    { id: 1, text: "Hey, loved watching your film — your route running is elite.",  time: 'Monday 10:00 AM', fromMe: true,  read: true },
    { id: 2, text: "That means a lot! I've been working with Coach on my cuts.",    time: 'Monday 10:15 AM', fromMe: false, read: true },
    { id: 3, text: "Thanks for the feedback on my QB mechanics!",                   time: '1h ago',          fromMe: false, read: true },
  ],
  3: [
    { id: 1, text: "Hi! I came across your HERS365 profile and I'm very impressed.", time: '3h ago', fromMe: false, read: true },
    { id: 2, text: "We'd love to discuss your future at State University.",           time: '3h ago', fromMe: false, read: false },
  ],
  4: [
    { id: 1, text: 'Are you going to the 7v7 tournament this weekend?',             time: 'Yesterday', fromMe: false, read: true },
    { id: 2, text: 'Yes! I signed up yesterday. Should be great.',                  time: 'Yesterday', fromMe: true,  read: true },
    { id: 3, text: 'See you at 7v7 on Saturday!',                                   time: 'Yesterday', fromMe: false, read: true },
  ],
  5: [
    { id: 1, text: 'Film review is at 4pm tomorrow. Don\'t be late.',               time: '2d ago', fromMe: false, read: true },
  ],
};

const roleColor: Record<string, string> = { coach: '#60a5fa', athlete: '#4ade80', recruiter: '#c084fc' };
const roleLabel: Record<string, string> = { coach: 'Coach', athlete: 'Athlete', recruiter: 'Recruiter' };
const avatarBg: Record<string, string> = { coach: '#1e3a5f', athlete: '#14432a', recruiter: '#3b1f5e' };

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function Avatar({ name, role, size = 36, online }: { name: string; role: string; size?: number; online?: boolean }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: avatarBg[role] ?? '#1c1c1c',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${roleColor[role] ?? '#333'}22`,
      }}>
        <span style={{ fontSize: size * 0.33, fontWeight: 700, color: roleColor[role] ?? '#fff', letterSpacing: '0.02em' }}>
          {initials(name)}
        </span>
      </div>
      {online && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#4ade80', border: '2px solid #0a0a0a' }} />
      )}
    </div>
  );
}

export const Messages = () => {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showThread, setShowThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = convos.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const active = convos.find(c => c.id === activeId) ?? null;

  useEffect(() => {
    if (activeId !== null) {
      setMsgs(threadMap[activeId] ?? []);
    }
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const openThread = (id: number) => {
    setActiveId(id);
    setShowThread(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const send = () => {
    if (!draft.trim() || activeId === null) return;
    setMsgs(prev => [...prev, { id: Date.now(), text: draft.trim(), time: 'Just now', fromMe: true, read: false }]);
    setDraft('');
  };

  const totalUnread = convos.reduce((s, c) => s + c.unread, 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#0a0a0a' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        ...(showThread ? { display: 'none' } : {}),
      }} className={showThread ? 'hidden md:flex' : 'flex'} >

        {/* Header */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.25rem', textTransform: 'uppercase', color: '#fff', margin: 0 }}>
              Messages
              {totalUnread > 0 && (
                <span style={{ marginLeft: 8, fontSize: '0.65rem', background: '#ff5a2d', color: '#fff', borderRadius: 9999, padding: '2px 7px', fontWeight: 800, verticalAlign: 'middle' }}>
                  {totalUnread}
                </span>
              )}
            </h2>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px 8px 30px', color: '#fff', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.35)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#444', fontSize: '0.8rem' }}>No conversations found</div>
          ) : filtered.map(c => (
            <button key={c.id} onClick={() => openThread(c.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 16px',
                width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                borderLeft: activeId === c.id ? '2px solid #ff5a2d' : '2px solid transparent',
                backgroundColor: activeId === c.id ? 'rgba(255,90,45,0.07)' : 'transparent',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.backgroundColor = '#111'; }}
              onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Avatar name={c.name} role={c.role} size={40} online={c.online} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: '0.62rem', color: '#444', flexShrink: 0, marginLeft: 6 }}>{c.time}</span>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {c.fromMe && <span style={{ color: '#444' }}>You: </span>}{c.lastMsg}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.62rem', color: roleColor[c.role], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roleLabel[c.role]}</span>
                  {c.unread > 0 && (
                    <div style={{ minWidth: 17, height: 17, borderRadius: 9999, background: '#ff5a2d', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>{c.unread}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Thread ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        ...((!showThread && !active) ? {} : {}),
      }} className={!showThread && !active ? 'hidden md:flex' : 'flex'}>

        {!active ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#333' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={22} color="#333" />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#444' }}>Select a conversation</span>
            <span style={{ fontSize: '0.75rem', color: '#333' }}>Choose from your messages on the left</span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Mobile back */}
                <button
                  onClick={() => { setShowThread(false); setActiveId(null); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '4px 4px 4px 0', display: 'none' }}
                  className="flex md:hidden"
                >
                  <ChevronLeft size={20} />
                </button>
                <Avatar name={active.name} role={active.role} size={38} online={active.online} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>{active.name}</span>
                    <CheckCircle2 size={13} color="#ff5a2d" fill="#ff5a2d" />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: roleColor[active.role], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {roleLabel[active.role]} · {active.online ? <span style={{ color: '#4ade80' }}>Online</span> : 'Offline'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[Phone, Video, MoreVertical].map((Icon, i) => (
                  <button key={i} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: '#444', borderRadius: 7, transition: 'color 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                    <Icon size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence initial={false}>
                {msgs.map(m => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.14 }}
                    style={{ display: 'flex', justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '65%', padding: '10px 14px',
                      borderRadius: m.fromMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.fromMe ? '#ff5a2d' : '#161616',
                      border: m.fromMe ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.5, marginBottom: 4 }}>{m.text}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: '0.62rem', color: m.fromMe ? 'rgba(255,255,255,0.5)' : '#444' }}>{m.time}</span>
                        {m.fromMe && (m.read
                          ? <CheckCheck size={11} color="rgba(255,255,255,0.5)" />
                          : <Check size={11} color="rgba(255,255,255,0.35)" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, background: '#0a0a0a', flexShrink: 0 }}>
              <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 6, borderRadius: 6, flexShrink: 0, transition: 'color 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                <Paperclip size={16} />
              </button>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 40px 10px 14px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}>
                  <Smile size={15} />
                </button>
              </div>
              <button
                onClick={send}
                disabled={!draft.trim()}
                style={{ width: 38, height: 38, borderRadius: 9, background: draft.trim() ? '#ff5a2d' : '#161616', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', flexShrink: 0 }}
              >
                <Send size={15} color={draft.trim() ? '#fff' : '#333'} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
