import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, CheckCircle2, Crown, Award, Flame,
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import {
  FLAME, FLAME_SOFT, INK_2, INK_3, LINE, LINE_2, MUTED, MUTED_2,
  DISP, BODY, disp, kicker, glowBlob,
} from '../lib/theme';

type Player = {
  rank: number; prev: number; name: string; school: string;
  pos: string; score: number; gpa: number; fortyYard: number; verified: boolean;
};

const players: Player[] = [
  { rank: 1,  prev: 1,  name: 'Sarah Watkins',   school: 'Westlake HS, TX',          pos: 'QB', score: 95, gpa: 3.9,  fortyYard: 4.72, verified: true  },
  { rank: 2,  prev: 3,  name: 'Maya Johnson',    school: "St. Mary's Academy, FL",   pos: 'WR', score: 92, gpa: 3.7,  fortyYard: 4.71, verified: true  },
  { rank: 3,  prev: 2,  name: 'Isabella Reyes',  school: 'Centennial HS, CA',        pos: 'DB', score: 91, gpa: 4.0,  fortyYard: 4.68, verified: true  },
  { rank: 4,  prev: 4,  name: 'Chloe Zhang',     school: 'Northwood HS, GA',         pos: 'RB', score: 90, gpa: 3.8,  fortyYard: 4.65, verified: true  },
  { rank: 5,  prev: 7,  name: "Emma O'Connor",   school: 'Summit Prep, CO',          pos: 'QB', score: 89, gpa: 3.95, fortyYard: 4.88, verified: false },
  { rank: 6,  prev: 5,  name: 'Ava Mitchell',    school: 'Harrison HS, AL',          pos: 'LB', score: 89, gpa: 3.6,  fortyYard: 4.75, verified: true  },
  { rank: 7,  prev: 6,  name: 'Jordan Lee',      school: 'Lincoln Prep, OH',         pos: 'WR', score: 88, gpa: 3.5,  fortyYard: 4.62, verified: true  },
  { rank: 8,  prev: 9,  name: 'Priya Patel',     school: 'Edison HS, NJ',            pos: 'DB', score: 87, gpa: 4.0,  fortyYard: 4.78, verified: false },
  { rank: 9,  prev: 8,  name: 'Taylor Brooks',   school: 'Riverside Academy, TN',    pos: 'RB', score: 86, gpa: 3.4,  fortyYard: 4.59, verified: true  },
  { rank: 10, prev: 12, name: 'Zoe Williams',    school: 'Lakewood HS, WA',          pos: 'QB', score: 85, gpa: 3.8,  fortyYard: 4.91, verified: true  },
  { rank: 11, prev: 10, name: 'Naomi Carter',    school: 'Brookfield HS, NC',        pos: 'WR', score: 84, gpa: 3.7,  fortyYard: 4.70, verified: true  },
  { rank: 12, prev: 15, name: 'Layla Hassan',    school: 'Crestview HS, AZ',         pos: 'LB', score: 83, gpa: 3.9,  fortyYard: 4.81, verified: false },
];

const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'LB', 'DB'];

function nameToIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return (h % 90) + 1;
}

function Avatar({ name, size = 36, ring }: { name: string; size?: number; ring?: string }) {
  return (
    <img
      src={`https://randomuser.me/api/portraits/women/${nameToIdx(name)}.jpg`}
      alt={name}
      style={{
        width: size, height: size, borderRadius: '50%', background: '#1c1c1c',
        flexShrink: 0, objectFit: 'cover',
        border: ring ? `2px solid ${ring}` : '2px solid rgba(255,255,255,0.08)',
        boxShadow: ring ? `0 0 18px ${ring}55` : 'none',
      }}
    />
  );
}

// Compact rank-movement indicator used in the table rows.
function Trend({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr;
  if (diff === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: MUTED_2 }}>
        <Minus size={12} />
      </span>
    );
  }
  const up = diff > 0;
  const color = up ? '#4ade80' : '#f87171';
  return (
    <motion.span
      initial={{ opacity: 0, y: up ? 4 : -4 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 1,
        color, fontFamily: DISP, fontWeight: 800, fontSize: '.78rem',
        letterSpacing: '.02em',
      }}
    >
      {up ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
      {Math.abs(diff)}
    </motion.span>
  );
}

// Bigger, glowing movement pill used on the podium cards.
function TrendPill({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr;
  const steady = diff === 0;
  const up = diff > 0;
  const color = steady ? MUTED : up ? '#4ade80' : '#f87171';
  const bg = steady ? 'rgba(255,255,255,0.05)' : up ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '4px 9px', borderRadius: 9999, background: bg,
      border: `1px solid ${color}33`, color,
      fontFamily: DISP, fontWeight: 800, fontSize: '.72rem',
      letterSpacing: '.06em', textTransform: 'uppercase',
    }}>
      {steady ? <Minus size={12} /> : up ? <ChevronUp size={13} strokeWidth={3} /> : <ChevronDown size={13} strokeWidth={3} />}
      {steady ? 'Steady' : Math.abs(diff)}
    </span>
  );
}

const VerifiedBadge = ({ size = 13 }: { size?: number }) => (
  <span title="Verified athlete" style={{ display: 'inline-flex', filter: `drop-shadow(0 0 5px ${FLAME}88)` }}>
    <CheckCircle2 size={size} color="#fff" fill={FLAME} strokeWidth={2.2} />
  </span>
);

// ── Podium card (used for #1 dominant + #2/#3 flanks) ──
function PodiumCard({ p, place }: { p: Player; place: 1 | 2 | 3 }) {
  const isFirst = place === 1;
  const ring = isFirst ? FLAME : place === 2 ? '#d7d7d2' : '#cd8a55';
  const numeralColor = isFirst ? FLAME : place === 2 ? '#e8e8e4' : '#cd8a55';
  const delay = isFirst ? 0.05 : place === 2 ? 0.18 : 0.28;

  return (
    <motion.div
      className={`podium-card ${isFirst ? 'podium-first' : ''}`}
      initial={{ opacity: 0, y: 34 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 22,
        padding: isFirst ? '30px 24px 26px' : '24px 20px 22px',
        background: isFirst
          ? `linear-gradient(165deg, #1a0f0a, ${INK_2})`
          : `linear-gradient(165deg, ${INK_3}, ${INK_2})`,
        border: `1px solid ${isFirst ? 'rgba(255,90,45,0.45)' : LINE}`,
        boxShadow: isFirst
          ? '0 0 0 1px rgba(255,90,45,0.18), 0 26px 70px rgba(255,90,45,0.16), 0 18px 50px rgba(0,0,0,0.6)'
          : '0 16px 44px rgba(0,0,0,0.5)',
      }}
    >
      {/* glow blobs */}
      {isFirst ? (
        <div style={glowBlob({ size: 280, top: -120, right: -90, opacity: 0.55, strength: 0.55 })} />
      ) : (
        <div style={glowBlob({ size: 180, top: -90, right: -70, opacity: 0.18, strength: 0.35 })} />
      )}

      {/* crown for #1 */}
      {isFirst && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 13 }}
          style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            color: FLAME, filter: `drop-shadow(0 0 14px ${FLAME}aa)`, zIndex: 2,
          }}
        >
          <Crown size={30} fill={FLAME} strokeWidth={1.5} />
        </motion.div>
      )}

      {/* massive rank numeral */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', marginTop: isFirst ? 22 : 4 }}>
        <span style={{
          ...disp, fontWeight: 800,
          fontSize: isFirst ? 'clamp(5.5rem,15vw,8rem)' : 'clamp(4rem,11vw,6rem)',
          color: numeralColor,
          textShadow: isFirst
            ? `0 0 44px ${FLAME}66`
            : `0 0 22px ${numeralColor}33`,
          lineHeight: 0.8,
        }}>{p.rank}</span>
      </div>

      {/* score chip */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', margin: '6px 0 18px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 6,
          padding: '6px 14px', borderRadius: 9999,
          background: isFirst ? 'rgba(255,90,45,0.16)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isFirst ? 'rgba(255,90,45,0.4)' : LINE_2}`,
        }}>
          <Flame size={13} color={FLAME} fill={isFirst ? FLAME : 'none'} />
          <span style={{ ...disp, fontWeight: 800, fontSize: '1.25rem', color: isFirst ? FLAME : '#f4f4f2', letterSpacing: '.02em' }}>{p.score}</span>
          <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: '.58rem', letterSpacing: '.16em', color: MUTED_2 }}>HERS</span>
        </span>
      </div>

      {/* athlete identity */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
        <Avatar name={p.name} size={isFirst ? 76 : 60} ring={ring} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: BODY, fontWeight: 700, color: '#fbfbf9',
              fontSize: isFirst ? '1.18rem' : '1rem', lineHeight: 1.1,
            }}>{p.name}</span>
            {p.verified && <VerifiedBadge size={isFirst ? 16 : 14} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 9px', borderRadius: 6, background: 'rgba(255,90,45,0.12)',
              border: '1px solid rgba(255,90,45,0.25)', color: FLAME_SOFT,
              fontFamily: DISP, fontWeight: 800, fontSize: '.66rem', letterSpacing: '.12em',
            }}>{p.pos}</span>
            <TrendPill curr={p.rank} prev={p.prev} />
          </div>
          <span style={{ color: MUTED, fontSize: '.78rem', marginTop: 2 }}>{p.school}</span>
        </div>
      </div>
    </motion.div>
  );
}

export const Rankings = () => {
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState('All');
  const [focused, setFocused] = useState(false);

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q))
      && (pos === 'All' || p.pos === pos);
  });

  const showPodium = search === '' && pos === 'All';
  const top3 = filtered.slice(0, 3);
  const rest = showPodium ? filtered.slice(3) : filtered;

  const cols = '56px minmax(0,1fr) 64px 76px 64px 92px';

  return (
    <div style={{ position: 'relative', overflow: 'hidden', fontFamily: BODY, color: '#f4f4f2' }}>
      {/* ambient glow blobs (absolute inside this relative wrapper) */}
      <div style={glowBlob({ size: 620, top: -260, right: -180, opacity: 0.16, strength: 0.5 })} />
      <div style={glowBlob({ size: 460, top: 420, left: -200, opacity: 0.1, strength: 0.4 })} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ marginBottom: 30 }}
        >
          <div style={{ ...kicker, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flame size={14} color={FLAME} fill={FLAME} /> National Leaderboard
          </div>
          <h1 style={{ ...disp, fontWeight: 800, fontSize: 'clamp(2.8rem,7vw,4.6rem)', margin: 0, color: '#fff' }}>
            THE <span style={{ color: FLAME, textShadow: `0 0 34px ${FLAME}55` }}>GRID</span>
          </h1>
          <p style={{ color: MUTED, fontSize: '1rem', maxWidth: 520, marginTop: 10, lineHeight: 1.6 }}>
            Every elite flag football athlete in the nation, ranked by HERS score. Movement updates as the season unfolds.
          </p>
        </motion.div>

        {/* ── PODIUM ── */}
        {showPodium && top3.length === 3 && (
          <div className="podium-grid" style={{ marginBottom: 40 }}>
            <div className="podium-slot podium-slot-2"><PodiumCard p={top3[1]} place={2} /></div>
            <div className="podium-slot podium-slot-1"><PodiumCard p={top3[0]} place={1} /></div>
            <div className="podium-slot podium-slot-3"><PodiumCard p={top3[2]} place={3} /></div>
          </div>
        )}

        {/* ── FILTERS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="filter-bar"
          style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}
        >
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? FLAME : MUTED_2, pointerEvents: 'none', transition: 'color .2s' }} />
            <input
              type="text"
              placeholder="Search athletes or schools…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${focused ? 'rgba(255,90,45,0.55)' : LINE}`,
                borderRadius: 13, padding: '13px 14px 13px 40px',
                color: '#f4f4f2', fontSize: '.92rem', fontFamily: BODY, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color .2s, box-shadow .2s',
                boxShadow: focused ? '0 0 0 3px rgba(255,90,45,0.09)' : 'none',
              }}
            />
          </div>
          <div className="pos-pills" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {positions.map(p => {
              const active = pos === p;
              return (
                <button
                  key={p}
                  onClick={() => setPos(p)}
                  style={{
                    minHeight: 40, padding: '8px 15px', borderRadius: 10,
                    background: active ? FLAME : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? FLAME : LINE}`,
                    color: active ? '#fff' : MUTED,
                    fontFamily: DISP, fontWeight: 800, fontSize: '.82rem',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                    cursor: 'pointer', transition: 'all .18s',
                    boxShadow: active ? '0 6px 18px rgba(255,90,45,0.32)' : 'none',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = LINE_2; e.currentTarget.style.color = '#f4f4f2'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = MUTED; } }}
                >{p}</button>
              );
            })}
          </div>
        </motion.div>

        {/* ── LEADERBOARD TABLE ── */}
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          border: `1px solid ${LINE}`, background: `linear-gradient(180deg, ${INK_3}, ${INK_2})`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}>
          {/* header row */}
          <div className="lb-row lb-head" style={{ gridTemplateColumns: cols }}>
            {[
              { h: 'RK', a: 'left' as const },
              { h: 'ATHLETE', a: 'left' as const },
              { h: 'POS', a: 'center' as const },
              { h: '40YD', a: 'center' as const },
              { h: 'GPA', a: 'center' as const },
              { h: 'SCORE', a: 'right' as const },
            ].map(({ h, a }) => (
              <div key={h} style={{
                fontFamily: DISP, fontWeight: 800, fontSize: '.66rem', letterSpacing: '.16em',
                textTransform: 'uppercase', color: MUTED_2, textAlign: a,
              }}>{h}</div>
            ))}
          </div>

          {rest.map((p, i) => (
            <motion.div
              key={p.name}
              className="lb-row lb-data"
              style={{ gridTemplateColumns: cols }}
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.04, 0.3), ease: [0.2, 0.8, 0.2, 1] }}
            >
              {/* flame hover wash */}
              <span className="lb-wash" aria-hidden />

              {/* rank */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  ...disp, fontWeight: 800, fontSize: '1.35rem',
                  color: p.rank <= 3 ? FLAME : '#7a7a76', minWidth: 22,
                }}>{p.rank}</span>
                {p.rank <= 3 && <Award size={13} color={FLAME} style={{ flexShrink: 0 }} />}
              </div>

              {/* athlete */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <Avatar name={p.name} size={38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontSize: '.92rem', fontWeight: 700, color: '#f0f0ee',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{p.name}</span>
                    {p.verified && <VerifiedBadge size={12} />}
                  </div>
                  <div style={{ fontSize: '.72rem', color: MUTED, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.school}</div>
                </div>
              </div>

              {/* pos */}
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <span style={{
                  background: 'rgba(255,90,45,0.1)', color: FLAME_SOFT,
                  fontFamily: DISP, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.08em',
                  padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,90,45,0.18)',
                }}>{p.pos}</span>
              </div>

              {/* 40yd */}
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', fontFamily: DISP, fontWeight: 700, fontSize: '.98rem', color: '#cfcfca', letterSpacing: '.02em' }}>
                {p.fortyYard.toFixed(2)}<span style={{ color: MUTED_2, fontSize: '.7rem' }}>s</span>
              </div>

              {/* gpa */}
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', fontFamily: DISP, fontWeight: 700, fontSize: '.98rem', color: '#cfcfca' }}>{p.gpa.toFixed(1)}</div>

              {/* score + trend */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ ...disp, fontWeight: 800, fontSize: '1.4rem', color: FLAME, lineHeight: 1 }}>{p.score}</span>
                <Trend curr={p.rank} prev={p.prev} />
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ ...disp, fontWeight: 800, fontSize: '1.6rem', color: '#6a6a66' }}>No athletes found</div>
              <p style={{ color: MUTED_2, fontSize: '.85rem', marginTop: 6 }}>Try a different position or search term.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .podium-grid {
          display: grid;
          grid-template-columns: 1fr 1.16fr 1fr;
          align-items: end;
          gap: 18px;
        }
        .podium-slot-2, .podium-slot-3 { padding-bottom: 14px; }
        .podium-card { height: 100%; transition: transform .25s ease, box-shadow .25s ease; }
        .podium-card:hover { transform: translateY(-4px); }
        .podium-first:hover { transform: translateY(-6px); }

        .lb-row {
          display: grid;
          align-items: center;
          gap: 10px;
          padding: 13px 18px;
        }
        .lb-head {
          border-bottom: 1px solid ${LINE};
          background: rgba(255,255,255,0.015);
        }
        .lb-data {
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          cursor: default;
          isolation: isolate;
        }
        .lb-data:last-child { border-bottom: none; }
        .lb-wash {
          position: absolute; inset: 0; z-index: 0; opacity: 0;
          background: linear-gradient(90deg, rgba(255,90,45,0.14), rgba(255,90,45,0.02) 60%, transparent);
          border-left: 2px solid transparent;
          transition: opacity .22s ease;
          pointer-events: none;
        }
        .lb-data:hover .lb-wash { opacity: 1; border-left-color: ${FLAME}; }

        @media (max-width: 900px) {
          .podium-grid {
            grid-template-columns: 1fr 1fr;
            align-items: stretch;
          }
          .podium-slot-1 { grid-column: 1 / -1; order: -1; }
          .podium-slot-2, .podium-slot-3 { padding-bottom: 0; }
          .filter-bar { flex-direction: column; align-items: stretch; }
          .pos-pills { justify-content: flex-start; }
        }

        @media (max-width: 600px) {
          .podium-grid { grid-template-columns: 1fr; }
          .lb-row { gap: 8px; }
          .lb-head { display: none; }
          .lb-data {
            grid-template-columns: 40px 1fr auto !important;
            grid-template-areas: "rank athlete score";
            row-gap: 10px;
            padding: 14px 14px;
          }
          .lb-data > div:nth-child(2) { grid-area: rank; }
          .lb-data > div:nth-child(3) { grid-area: athlete; }
          .lb-data > div:nth-child(7) { grid-area: score; }
          /* hide pos / 40yd / gpa columns on the narrowest layout to keep rows tidy */
          .lb-data > div:nth-child(4),
          .lb-data > div:nth-child(5),
          .lb-data > div:nth-child(6) { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Rankings;
