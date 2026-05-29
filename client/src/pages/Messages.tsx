import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, MoreVertical, Phone, Video, Check, CheckCheck, Paperclip, Smile, CheckCircle2 } from 'lucide-react';

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
  { id: 1, name: 'Coach Anderson',  role: 'coach',     online: true,  lastMsg: 'Great game last Friday! Your performance was outstanding.', time: '2m ago',  fromMe: false, unread: 2 },
  { id: 2, name: 'Sarah Johnson',   role: 'athlete',   online: false, lastMsg: 'Thanks for the feedback on my QB mechanics!',               time: '1h ago',  fromMe: true,  unread: 0 },
  { id: 3, name: 'Recruiter Mike',  role: 'recruiter', online: true,  lastMsg: "We'd love to discuss your future at State University.",       time: '3h ago',  fromMe: false, unread: 1 },
  { id: 4, name: 'Maya Johnson',    role: 'athlete',   online: true,  lastMsg: 'See you at 7v7 on Saturday!',                               time: 'Yesterday', fromMe: false, unread: 0 },
  { id: 5, name: 'Coach Martinez',  role: 'coach',     online: false, lastMsg: 'Film review is at 4pm tomorrow.',                           time: '2d ago',  fromMe: false, unread: 0 },
];

const mockMsgs: Msg[] = [
  { id: 1, text: 'Hi! I saw your profile and was impressed by your stats.',     time: 'Yesterday 2:30 PM', fromMe: false, read: true },
  { id: 2, text: "Thank you! I've been working really hard on my training.",    time: 'Yesterday 2:35 PM', fromMe: true,  read: true },
  { id: 3, text: 'That shows. Your 40-yard dash time is excellent for a QB.',   time: 'Yesterday 2:36 PM', fromMe: false, read: true },
  { id: 4, text: 'Thanks! Coach has been helping me with speed training.',      time: '2h ago',            fromMe: true,  read: true },
  { id: 5, text: 'Great game last Friday! Your performance was outstanding.',   time: '2m ago',            fromMe: false, read: false },
];

const roleColor: Record<string, string> = { coach: '#60a5fa', athlete: '#4ade80', recruiter: '#c084fc' };
const roleLabel: Record<string, string> = { coach: 'Coach', athlete: 'Athlete', recruiter: 'Recruiter' };

function nameToIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return (h % 90) + 1;
}

function Avatar({ name, size = 36, online }: { name: string; size?: number; online?: boolean }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <img src={`https://randomuser.me/api/portraits/women/${nameToIdx(name)}.jpg`}
        alt={name} style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', objectFit: 'cover' }} />
      {online && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#4ade80', border: '2px solid #0a0a0a' }} />
      )}
    </div>
  );
}

export const Messages = () => {
  const [activeId, setActiveId] = useState<number>(1);
  const [msgs, setMsgs] = useState<Msg[]>(mockMsgs);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const active = convos.find(c => c.id === activeId)!;
  const filtered = convos.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const send = () => {
    if (!draft.trim()) return;
    setMsgs(prev => [...prev, { id: Date.now(), text: draft, time: 'Just now', fromMe: true, read: false }]);
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', margin: '0 -24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
        <div style={{ padding: '20px 16px 12px' }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', textTransform: 'uppercase', color: '#fff', marginBottom: 12 }}>Messages</h2>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '8px 10px 8px 28px', color: '#fff', fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setActiveId(c.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
                background: activeId === c.id ? 'rgba(255,90,45,0.07)' : 'transparent',
                borderLeft: activeId === c.id ? '2px solid #ff5a2d' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = '#111'; }}
              onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <Avatar name={c.name} size={38} online={c.online} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: '0.62rem', color: '#444', flexShrink: 0 }}>{c.time}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  {c.fromMe ? 'You: ' : ''}{c.lastMsg}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.62rem', color: roleColor[c.role], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{roleLabel[c.role]}</span>
                  {c.unread > 0 && (
                    <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#ff5a2d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>{c.unread}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Chat header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={active.name} size={40} online={active.online} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{active.name}</span>
                <CheckCircle2 size={13} color="#ff5a2d" fill="#ff5a2d" />
              </div>
              <span style={{ fontSize: '0.7rem', color: roleColor[active.role], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {roleLabel[active.role]} · {active.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[Phone, Video, MoreVertical].map((Icon, i) => (
              <button key={i} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', color: '#444', borderRadius: 6, transition: 'color 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {msgs.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                style={{ display: 'flex', justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '60%',
                  padding: '10px 14px',
                  borderRadius: m.fromMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.fromMe ? '#ff5a2d' : '#161616',
                  border: m.fromMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: 1.5, marginBottom: 4 }}>{m.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                    <span style={{ fontSize: '0.62rem', color: m.fromMe ? 'rgba(255,255,255,0.55)' : '#444' }}>{m.time}</span>
                    {m.fromMe && (m.read ? <CheckCheck size={11} color="rgba(255,255,255,0.55)" /> : <Check size={11} color="rgba(255,255,255,0.4)" />)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#0a0a0a' }}>
          <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 6, borderRadius: 6, transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')} onMouseLeave={e => (e.currentTarget.style.color = '#444')}>
            <Paperclip size={16} />
          </button>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Type a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 40px 10px 14px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <button style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}>
              <Smile size={15} />
            </button>
          </div>
          <button onClick={send} disabled={!draft.trim()}
            style={{ width: 38, height: 38, borderRadius: 9, background: draft.trim() ? '#ff5a2d' : '#1a1a1a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s', flexShrink: 0 }}>
            <Send size={15} color={draft.trim() ? '#fff' : '#444'} />
          </button>
        </div>
      </div>
    </div>
  );
};
