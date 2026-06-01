import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Search, CheckCircle2 } from 'lucide-react';

const players = [
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
];

const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'LB', 'DB'];

function nameToIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return (h % 90) + 1;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <img src={`https://randomuser.me/api/portraits/women/${nameToIdx(name)}.jpg`}
      alt={name} style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0, objectFit: 'cover' }} />
  );
}

function Trend({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr;
  if (diff === 0) return <Minus size={13} color="#444" />;
  if (diff > 0)   return <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><TrendingUp size={13} color="#4ade80" /><span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>+{diff}</span></div>;
  return <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><TrendingDown size={13} color="#f87171" /><span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700 }}>{diff}</span></div>;
}

export const Rankings = () => {
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState('All');

  const filtered = players.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q))
      && (pos === 'All' || p.pos === pos);
  });

  const top3 = filtered.slice(0, 3);

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          National Rankings
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Top female high school athletes ranked by performance score</p>
      </div>

      {/* Podium — top 3 */}
      {search === '' && pos === 'All' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {top3.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="k-card" style={{
                padding: '20px 18px', position: 'relative', overflow: 'hidden',
                borderColor: i === 0 ? 'rgba(255,90,45,0.4)' : 'rgba(255,255,255,0.06)',
                boxShadow: i === 0 ? '0 0 0 1px rgba(255,90,45,0.1), 0 8px 32px rgba(255,90,45,0.08)' : 'none',
              }}>
              {/* #1 background glow */}
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: -40, right: -40,
                  width: 160, height: 160,
                  background: 'radial-gradient(circle, rgba(255,90,45,0.12) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800,
                  fontSize: i === 0 ? '1.6rem' : '1.2rem',
                  color: i === 0 ? '#ff5a2d' : '#444',
                  textShadow: i === 0 ? '0 0 16px rgba(255,90,45,0.4)' : 'none',
                }}>#{p.rank}</span>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800,
                  fontSize: i === 0 ? '2rem' : '1.8rem', color: '#ff5a2d',
                  textShadow: i === 0 ? '0 0 20px rgba(255,90,45,0.5)' : '0 0 12px rgba(255,90,45,0.2)',
                }}>{p.score}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={p.name} size={i === 0 ? 44 : 38} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: i === 0 ? '0.92rem' : '0.85rem', fontWeight: 700, color: '#fff' }}>{p.name}</span>
                    {p.verified && <CheckCircle2 size={12} color="#ff5a2d" fill="#ff5a2d" />}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>{p.pos} | {p.school}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search athletes or schools..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px 9px 32px', color: '#fff', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {positions.map(p => (
            <button key={p} onClick={() => setPos(p)} style={{
              background: pos === p ? '#ff5a2d' : '#111',
              border: '1px solid',
              borderColor: pos === p ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
              borderRadius: 7, padding: '8px 12px',
              color: pos === p ? '#fff' : '#666',
              fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="k-card" style={{ overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '48px 1fr 80px 80px 80px 80px',
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {['RK', 'ATHLETE', 'POS', '40YD', 'GPA', 'SCORE'].map(h => (
            <div key={h} style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', textAlign: h === 'ATHLETE' ? 'left' : 'center' }}>{h}</div>
          ))}
        </div>

        {filtered.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            style={{
              display: 'grid', gridTemplateColumns: '48px 1fr 80px 80px 80px 80px',
              padding: '12px 16px', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.15s', cursor: 'default',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Rank */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800,
                fontSize: '1rem',
                color: p.rank <= 3 ? '#ff5a2d' : '#555',
              }}>{p.rank}</span>
            </div>

            {/* Athlete */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={p.name} size={32} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ddd' }}>{p.name}</span>
                  {p.verified && <CheckCircle2 size={11} color="#ff5a2d" fill="#ff5a2d" />}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 1 }}>{p.school}</div>
              </div>
            </div>

            {/* Pos */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>{p.pos}</span>
            </div>

            {/* 40yd */}
            <div style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#ccc' }}>{p.fortyYard.toFixed(2)}s</div>

            {/* GPA */}
            <div style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#ccc' }}>{p.gpa.toFixed(1)}</div>

            {/* Score */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#ff5a2d' }}>{p.score}</span>
              <div style={{ marginTop: 2, display: 'flex', justifyContent: 'center' }}>
                <Trend curr={p.rank} prev={p.prev} />
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#444' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700 }}>No athletes found</div>
          </div>
        )}
      </div>
    </div>
  );
};
