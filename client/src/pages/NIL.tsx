import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Zap, TrendingUp, MessageSquare, Send,
  CheckCircle, Lock, ChevronRight, Star, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const FLAME = '#ff5a2d';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const INK_3 = '#161616';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";
const GREEN = '#4ade80';

interface Opportunity {
  id: number;
  brandName: string | null;
  requirements: string | null;
  deliverables: string | null;
  estimatedEarnings: number | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const SEED_OPPS: Opportunity[] = [
  { id: 1, brandName: 'Athlete Fuel Co.', requirements: 'Min. 500 followers, active athlete', deliverables: '2 posts + story', estimatedEarnings: 150 },
  { id: 2, brandName: 'GrindWear', requirements: 'HERS Rating 80+, 2026 class', deliverables: '1 reel + 3 stories', estimatedEarnings: 300 },
  { id: 3, brandName: 'PlayBig Sports', requirements: 'Any position, California athlete', deliverables: 'Combine attendance + 1 post', estimatedEarnings: 75 },
  { id: 4, brandName: 'SportsVault', requirements: 'Elite tier, verified profile', deliverables: 'Highlight film license', estimatedEarnings: 500 },
];

const HOW_IT_WORKS = [
  { icon: Star,        pts: '+50 pts',  action: 'Complete your profile',     done: true  },
  { icon: TrendingUp,  pts: '+100 pts', action: 'Post a training highlight',  done: false },
  { icon: CheckCircle, pts: '+75 pts',  action: 'Get verified by a coach',   done: false },
  { icon: DollarSign,  pts: '+200 pts', action: 'Land your first brand deal', done: false },
];

const css = `
  .nil-opp-card { transition: border-color .22s, box-shadow .22s, background .22s; }
  .nil-opp-card:hover { border-color: rgba(255,90,45,.3) !important; box-shadow: 0 8px 32px rgba(0,0,0,.45); }
  .nil-chat-msg-user { align-self: flex-end; background: rgba(255,90,45,.12); border: 1px solid rgba(255,90,45,.22); }
  .nil-chat-msg-ai   { align-self: flex-start; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
  .clip-trigger { position:relative; display:inline-block }
  .clip-wrap { position:relative; display:inline-block }
  .clip-fg { position:absolute; inset:0; color:#ff5a2d; clip-path:inset(0 100% 0 0); transition:clip-path .5s cubic-bezier(.25,1,.5,1) }
  .clip-trigger:hover .clip-fg { clip-path:inset(0 0% 0 0) }
`;

const ClipText = ({ children }: { children: string }) => (
  <span className="clip-trigger">
    <span className="clip-wrap">
      {children}
      <span className="clip-fg" aria-hidden="true">{children}</span>
    </span>
  </span>
);

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const },
};

export const NIL = () => {
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [nilScore, setNilScore] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: "Hey! I'm your NIL Advisor. I can help you understand brand opportunities, calculate your earning potential, and guide you through your first deal. What do you want to know?" },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/nil/opportunities')
      .then(r => r.json())
      .then((data: Opportunity[]) => {
        if (Array.isArray(data) && data.length > 0) setOpps(data);
        else setOpps(SEED_OPPS);
      })
      .catch(() => setOpps(SEED_OPPS));

    if (user) {
      apiFetch<{ success: boolean; data: { nilPoints?: number } }>('/api/users/profile')
        .then(res => setNilScore(res?.data?.nilPoints ?? null))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsSending(true);
    try {
      const res = await fetch('/api/nil/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.reply || "I'm here to help — try asking about brand deals or eligibility.",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Having trouble connecting right now. Try again in a moment.",
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const tier = nilScore === null
    ? null
    : nilScore >= 500 ? 'Elite'
    : nilScore >= 200 ? 'Rising'
    : 'Starter';

  return (
    <div style={{ background: INK, minHeight: '100vh', color: '#f4f4f2', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* Hero band */}
      <div style={{
        background: `linear-gradient(135deg, #0b0905, ${INK_2})`,
        borderBottom: `1px solid ${LINE}`,
        padding: '44px 28px 36px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          filter: 'blur(100px)', opacity: 0.16, top: -280, right: -80,
          background: 'radial-gradient(circle,rgba(255,90,45,.6),transparent 65%)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,90,45,.08)', border: '1px solid rgba(255,90,45,.2)',
            borderRadius: 9999, padding: '5px 13px', marginBottom: 16,
          }}>
            <DollarSign size={12} color={FLAME} />
            <span style={{ fontFamily: DISP, fontWeight: 700, letterSpacing: '.16em', fontSize: '.7rem', color: FLAME, textTransform: 'uppercase' }}>
              NIL Marketplace
            </span>
          </div>

          <h1 style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(2.6rem,6vw,4rem)', lineHeight: 0.9, margin: '0 0 14px' }}>
            <ClipText>Your Name</ClipText><br />
            <span style={{ color: FLAME }}>Has Value.</span>
          </h1>

          <p style={{ color: MUTED, fontSize: '1rem', maxWidth: 520, lineHeight: 1.65, margin: '0 0 24px' }}>
            Name, Image & Likeness deals for high school flag football athletes. Build your score, land brand partnerships, and start earning before you sign.
          </p>

          {nilScore !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 16,
                background: INK_3, border: `1px solid rgba(255,90,45,.2)`,
                borderRadius: 14, padding: '14px 22px',
              }}
            >
              <div>
                <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '2.2rem', lineHeight: 1, color: FLAME }}>{nilScore}</div>
                <div style={{ fontFamily: DISP, fontWeight: 700, letterSpacing: '.12em', fontSize: '.68rem', textTransform: 'uppercase', color: MUTED, marginTop: 2 }}>NIL Score</div>
              </div>
              <div style={{ width: 1, height: 40, background: LINE }} />
              <div>
                <div style={{
                  fontFamily: DISP, fontWeight: 800, fontSize: '1rem',
                  color: tier === 'Elite' ? GREEN : tier === 'Rising' ? '#fbbf24' : MUTED,
                }}>
                  {tier} Tier
                </div>
                <div style={{ color: MUTED_2, fontSize: '.76rem', marginTop: 2 }}>
                  {tier === 'Elite' ? 'Top deals unlocked' : tier === 'Rising' ? 'More deals opening' : 'Keep growing'}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>

          {/* Opportunities column */}
          <div style={{ minWidth: 0 }}>
            <motion.div {...reveal}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.4rem', letterSpacing: '.03em' }}>
                    Open Deals
                  </div>
                  <div style={{ color: MUTED, fontSize: '.82rem', marginTop: 2 }}>{opps.length} opportunities available</div>
                </div>
                <div style={{
                  fontFamily: DISP, fontWeight: 700, letterSpacing: '.08em', fontSize: '.68rem',
                  textTransform: 'uppercase', color: FLAME, padding: '4px 10px',
                  border: `1px solid rgba(255,90,45,.2)`, borderRadius: 9999,
                }}>
                  LIVE
                </div>
              </div>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {opps.map((opp, i) => (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="nil-opp-card"
                  style={{
                    background: INK_2, border: `1px solid ${LINE}`,
                    borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.05rem', letterSpacing: '.03em', marginBottom: 3 }}>
                        {opp.brandName || 'Brand Partner'}
                      </div>
                      <div style={{ color: MUTED_2, fontSize: '.78rem' }}>{opp.requirements || 'Open to all athletes'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.3rem', color: GREEN, lineHeight: 1 }}>
                        ${opp.estimatedEarnings ?? '—'}
                      </div>
                      <div style={{ color: MUTED_2, fontSize: '.68rem', marginTop: 2 }}>est.</div>
                    </div>
                  </div>

                  {opp.deliverables && (
                    <div style={{ color: MUTED, fontSize: '.78rem', marginBottom: 12, lineHeight: 1.5 }}>
                      {opp.deliverables}
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 9,
                      background: 'rgba(255,90,45,.1)', border: '1px solid rgba(255,90,45,.22)',
                      color: FLAME, fontFamily: DISP, fontWeight: 800, letterSpacing: '.08em',
                      fontSize: '.78rem', textTransform: 'uppercase', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'background .18s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,90,45,.18)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,90,45,.1)')}
                  >
                    Apply Now <ArrowUpRight size={13} />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right column: score builder + AI advisor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Score builder */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} style={{
              background: INK_2, border: `1px solid ${LINE}`, borderRadius: 16, padding: 22,
            }}>
              <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '.03em', marginBottom: 4 }}>
                Build Your Score
              </div>
              <div style={{ color: MUTED, fontSize: '.82rem', marginBottom: 18 }}>Complete actions to unlock better deals.</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {HOW_IT_WORKS.map(({ icon: Icon, pts, action, done }) => (
                  <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: done ? 'rgba(74,222,128,.1)' : 'rgba(255,255,255,.05)',
                      border: `1px solid ${done ? 'rgba(74,222,128,.25)' : LINE}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: done ? GREEN : MUTED_2,
                    }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '.86rem', fontWeight: 600,
                        color: done ? '#f4f4f2' : MUTED,
                        textDecoration: done ? 'line-through' : 'none',
                      }}>
                        {action}
                      </div>
                    </div>
                    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: '.78rem', color: done ? GREEN : MUTED_2, letterSpacing: '.06em', flexShrink: 0 }}>
                      {pts}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* AI Advisor CTA */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.15 }} style={{
              background: `linear-gradient(135deg, rgba(255,90,45,.08), rgba(255,90,45,.04))`,
              border: `1px solid rgba(255,90,45,.2)`, borderRadius: 16, padding: 22,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,90,45,.14)', border: '1px solid rgba(255,90,45,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME,
                }}>
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.05rem', letterSpacing: '.03em' }}>
                    NIL Advisor
                  </div>
                  <div style={{ color: MUTED_2, fontSize: '.74rem' }}>AI-powered deal guidance</div>
                </div>
              </div>
              <p style={{ color: MUTED, fontSize: '.86rem', lineHeight: 1.6, margin: '0 0 16px' }}>
                Ask about eligibility, deal structuring, valuation, and what to say to brands.
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setChatOpen(true)}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 9,
                  background: FLAME, color: '#fff',
                  fontFamily: DISP, fontWeight: 800, letterSpacing: '.08em',
                  fontSize: '.82rem', textTransform: 'uppercase', cursor: 'pointer',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  boxShadow: '0 6px 22px rgba(255,90,45,.28)',
                  transition: 'box-shadow .18s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,90,45,.42)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 6px 22px rgba(255,90,45,.28)')}
              >
                <MessageSquare size={14} /> Talk to NIL Advisor
              </motion.button>
            </motion.div>

            {/* Premium deal teaser */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.2 }} style={{
              background: INK_2, border: `1px solid ${LINE}`, borderRadius: 16, padding: 20,
              display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,.04)', border: `1px solid ${LINE}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED_2,
              }}>
                <Lock size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', fontSize: '.96rem', letterSpacing: '.02em', marginBottom: 3 }}>
                  Premium Deals
                </div>
                <div style={{ color: MUTED_2, fontSize: '.78rem', lineHeight: 1.5 }}>
                  Upgrade to Elite for $1,000+ brand campaigns from national sponsors.
                </div>
              </div>
              <ChevronRight size={16} color={MUTED_2} style={{ flexShrink: 0 }} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* NIL Advisor chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 40 }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '92vw',
                background: '#0f0f0f', borderLeft: `1px solid ${LINE}`,
                zIndex: 50, display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'rgba(255,90,45,.12)',
                  border: '1px solid rgba(255,90,45,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME,
                }}>
                  <Zap size={16} />
                </div>
                <div>
                  <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '.04em' }}>NIL Advisor</div>
                  <div style={{ color: GREEN, fontSize: '.68rem', fontWeight: 600 }}>● Online</div>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: MUTED_2, cursor: 'pointer', padding: 4, fontSize: '1.1rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                    className={msg.role === 'user' ? 'nil-chat-msg-user' : 'nil-chat-msg-ai'}
                    style={{ maxWidth: '85%', borderRadius: 12, padding: '10px 14px', fontSize: '.86rem', lineHeight: 1.55 }}
                  >
                    {msg.text}
                  </motion.div>
                ))}
                {isSending && (
                  <div className="nil-chat-msg-ai" style={{ maxWidth: '85%', borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ color: MUTED_2, fontSize: '.84rem' }}>Thinking…</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '12px 16px 20px', borderTop: `1px solid ${LINE}`, display: 'flex', gap: 10 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  placeholder="Ask about NIL deals, eligibility..."
                  style={{
                    flex: 1, background: INK_3, border: `1px solid ${LINE}`, borderRadius: 9,
                    padding: '10px 14px', color: '#f4f4f2', fontSize: '.84rem',
                    outline: 'none', fontFamily: "'DM Sans', sans-serif",
                    transition: 'border-color .18s',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,90,45,.4)')}
                  onBlur={e => (e.target.style.borderColor = LINE)}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  disabled={isSending || !input.trim()}
                  style={{
                    width: 40, height: 40, borderRadius: 9, flexShrink: 0,
                    background: input.trim() ? FLAME : INK_3,
                    border: `1px solid ${input.trim() ? 'transparent' : LINE}`,
                    color: '#fff', cursor: input.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background .18s',
                  }}
                >
                  <Send size={15} />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
