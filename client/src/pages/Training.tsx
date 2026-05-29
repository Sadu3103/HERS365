import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, Clock, Flame, ChevronRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const programs = [
  { id: 1, name: 'Elite QB Development',    cat: 'Quarterback',  done: 18, total: 24, level: 'Advanced', next: 'Pocket Presence & Footwork',   locked: false },
  { id: 2, name: 'Speed & Agility Mastery', cat: 'Conditioning', done: 12, total: 18, level: 'Intermediate', next: 'L-Drill Progression',           locked: false },
  { id: 3, name: 'Route Running Academy',   cat: 'Wide Receiver', done: 4,  total: 20, level: 'Elite',     next: 'Double-Move Releases',          locked: false },
  { id: 4, name: 'DB Lockdown System',      cat: 'Defense',      done: 0,  total: 16, level: 'Advanced',  next: 'Press Coverage Fundamentals',   locked: true  },
];

const todayDrills = [
  { id: 1, name: 'Pocket Presence & Footwork', dur: '18 min', cat: 'QB',       done: false },
  { id: 2, name: '3-Step Drop Progression',     dur: '12 min', cat: 'QB',       done: true  },
  { id: 3, name: 'L-Drill Cone Work',           dur: '10 min', cat: 'Agility',  done: true  },
  { id: 4, name: 'Single-Leg RDL Series',       dur: '15 min', cat: 'Strength', done: false },
  { id: 5, name: 'Hand Fighting Drills',        dur: '8 min',  cat: 'DB',       done: false },
];

const levelColor: Record<string, string> = {
  Beginner:     'rgba(100,200,100,0.15)',
  Intermediate: 'rgba(255,180,50,0.12)',
  Advanced:     'rgba(255,90,45,0.12)',
  Elite:        'rgba(200,50,255,0.12)',
};
const levelText: Record<string, string> = {
  Beginner: '#64c864', Intermediate: '#ffb432', Advanced: '#ff5a2d', Elite: '#c832ff',
};

export const Training = () => {
  const navigate = useNavigate();
  const [drills, setDrills] = useState(todayDrills);

  const toggleDrill = (id: number) =>
    setDrills(prev => prev.map(d => d.id === id ? { ...d, done: !d.done } : d));

  const completedToday = drills.filter(d => d.done).length;
  const streak = 12;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          Training Academy
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Your personalized path to elite performance</p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'STREAK',       value: `${streak} Days`,        sub: 'Keep it going' },
          { label: 'THIS WEEK',    value: `${completedToday}/5`,    sub: 'Drills today' },
          { label: 'COMPLETION',   value: '74%',                    sub: 'Program avg' },
          { label: 'LEVEL',        value: 'Advanced',               sub: 'Current tier' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="k-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: '#444' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left: Programs */}
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Active Programs</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {programs.map((p, i) => {
              const pct = Math.round((p.done / p.total) * 100);
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="k-card-hover" style={{ padding: '18px 20px', opacity: p.locked ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{p.name}</span>
                        {p.locked && <Lock size={12} color="#555" />}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#555' }}>{p.cat}</div>
                    </div>
                    <span style={{
                      background: levelColor[p.level] || 'rgba(255,90,45,0.12)',
                      color: levelText[p.level] || '#ff5a2d',
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '3px 8px', borderRadius: 4,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      flexShrink: 0, marginLeft: 12,
                    }}>{p.level}</span>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.72rem', color: '#666' }}>{p.done}/{p.total} sessions</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ff5a2d' }}>{pct}%</span>
                    </div>
                    <div className="k-progress-track">
                      <div className="k-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Next session */}
                  {!p.locked && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Next</div>
                        <div style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 500 }}>{p.next}</div>
                      </div>
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#ff5a2d', border: 'none', borderRadius: 7,
                        color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                        padding: '8px 14px', cursor: 'pointer',
                        letterSpacing: '0.04em',
                      }}>
                        <Play size={12} fill="#fff" /> START
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: Today's drills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Today's session */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Today's Session</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={13} color="#ff5a2d" />
                <span style={{ fontSize: '0.75rem', color: '#ff5a2d', fontWeight: 700 }}>{completedToday}/{drills.length}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="k-progress-track" style={{ marginBottom: 16 }}>
              <div className="k-progress-fill" style={{ width: `${(completedToday / drills.length) * 100}%` }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {drills.map(d => (
                <button key={d.id} onClick={() => toggleDrill(d.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 0', textAlign: 'left',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  opacity: d.done ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  {d.done
                    ? <CheckCircle size={16} color="#ff5a2d" fill="#ff5a2d" style={{ flexShrink: 0 }} />
                    : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #333', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: d.done ? '#555' : '#ccc', fontWeight: 500, textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#444', marginTop: 1 }}>{d.cat}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <Clock size={11} color="#444" />
                    <span style={{ fontSize: '0.68rem', color: '#444' }}>{d.dur}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Weekly streak */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Weekly Streak</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const active = i < 5;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: active ? '#ff5a2d' : 'rgba(255,255,255,0.04)',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <CheckCircle size={14} color="#fff" />}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: active ? '#ff5a2d' : '#444', fontWeight: 600 }}>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Quick Actions</div>
            {[
              { label: 'Browse All Drills',     path: '/drills' },
              { label: 'Schedule a Session',    path: '/events' },
              { label: 'Track Performance',     path: '/rankings' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none',
                padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', color: '#ccc', fontSize: '0.82rem', fontWeight: 500,
              }}>
                {label}
                <ChevronRight size={14} color="#444" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
