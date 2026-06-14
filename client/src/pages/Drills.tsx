import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Target, Clock, ChevronRight, Play, CheckCircle2,
  RotateCcw, Flame, TrendingUp, Award,
} from 'lucide-react';

const FLAME_C = '#ff5a2d';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Drill = {
  id: number;
  name: string;
  category: 'Speed' | 'Agility' | 'Route Running' | 'Defense' | 'Strength';
  duration: string;
  reps: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  desc: string;
  cues: string[];
  completed: boolean;
};

const DRILLS: Drill[] = [
  {
    id: 1, name: '10-Yard Burst', category: 'Speed', duration: '20 min', reps: '8 × 10 yds',
    difficulty: 'Beginner',
    desc: 'Explosive first-step acceleration off the line. Focus on drive angle and arm mechanics.',
    cues: ['Low start, 45° lean', 'Drive knees high first 5 yards', 'Full arm swing — pump harder', 'Eyes up at 7 yards'],
    completed: false,
  },
  {
    id: 2, name: '5-10-5 Shuttle', category: 'Agility', duration: '25 min', reps: '6 reps',
    difficulty: 'Intermediate',
    desc: 'The pro agility test. Five yards each direction — measures lateral change of direction.',
    cues: ['Touch the line, don\'t reach', 'Crossover step at first cut', 'Stay low through the plant', 'Accelerate through finish'],
    completed: false,
  },
  {
    id: 3, name: 'In-Out Routes', category: 'Route Running', duration: '30 min', reps: '10 reps each',
    difficulty: 'Intermediate',
    desc: 'Crisp inside/outside releases off the line. Sell the go route before breaking.',
    cues: ['Stack the DB with head fake', 'Break at full speed — don\'t slow down', 'Hands ready before the break', 'Look the ball in through contact'],
    completed: false,
  },
  {
    id: 4, name: 'Defensive Back Hip Flip', category: 'Defense', duration: '20 min', reps: '12 reps',
    difficulty: 'Advanced',
    desc: 'Turn your hips fluidly to run with a receiver after pressing at the line.',
    cues: ['Press with outside arm up', 'Flip hips before the receiver does', 'Mirror the release, stay square', 'Eyes on the hip, not the head'],
    completed: false,
  },
  {
    id: 5, name: 'Single-Leg Box Jump', category: 'Strength', duration: '15 min', reps: '3 × 8 each leg',
    difficulty: 'Advanced',
    desc: 'Build unilateral power and landing stability for cutting and jumping.',
    cues: ['Swing opposite arm on takeoff', 'Stick the landing — no wobble', 'Soft knees, absorb on the way down', 'Rest 90s between sets'],
    completed: false,
  },
  {
    id: 6, name: 'Cone Weave Acceleration', category: 'Agility', duration: '25 min', reps: '5 sets',
    difficulty: 'Elite',
    desc: 'High-speed cone weave at 75% then 100%. Develops open-field agility at game speed.',
    cues: ['Lean away from the cone', 'Don\'t chop — long strides between cones', 'Eyes ahead two cones', 'Breathe out on every other cut'],
    completed: false,
  },
];

const CATEGORIES = ['All', 'Speed', 'Agility', 'Route Running', 'Defense', 'Strength'] as const;
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Elite'] as const;
const DIFF_COLOR: Record<string, string> = {
  Beginner: '#4ade80', Intermediate: '#fbbf24', Advanced: FLAME_C, Elite: '#c084fc',
};

function DiffBadge({ level }: { level: string }) {
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5,
      background: `${DIFF_COLOR[level]}18`,
      color: DIFF_COLOR[level],
      border: `1px solid ${DIFF_COLOR[level]}30`,
    }}>
      {level}
    </span>
  );
}

function DrillCard({ drill, onClick }: { drill: Drill; onClick: () => void }) {
  const catIcons: Record<string, React.ReactNode> = {
    Speed: <Zap size={14} />, Agility: <RotateCcw size={14} />,
    'Route Running': <Target size={14} />, Defense: <Flame size={14} />,
    Strength: <TrendingUp size={14} />,
  };

  return (
    <motion.div
      className="k-card-hover"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{ padding: '16px 18px', cursor: 'pointer', marginBottom: 10 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: drill.completed ? `${FLAME_C}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${drill.completed ? `${FLAME_C}40` : LINE}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: drill.completed ? FLAME_C : MUTED,
          transition: 'all 0.2s',
        }}>
          {drill.completed
            ? <CheckCircle2 size={20} />
            : catIcons[drill.category]}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: DISP, fontSize: '1.05rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2',
            }}>
              {drill.name}
            </span>
            {drill.completed && (
              <span style={{ fontSize: '0.6rem', color: '#4ade80', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Done
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <DiffBadge level={drill.difficulty} />
            <span style={{ fontSize: '0.65rem', color: MUTED_2, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {drill.category}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: MUTED, margin: 0, lineHeight: 1.45 }}>
            {drill.desc}
          </p>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: MUTED_2 }}>
            <Clock size={11} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{drill.duration}</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: MUTED_2, fontWeight: 600 }}>{drill.reps}</div>
          <div style={{ color: FLAME_C, display: 'flex', alignItems: 'center', gap: 3 }}>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DrillDetail({ drill, onClose, onComplete }: {
  drill: Drill; onClose: () => void; onComplete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
        zIndex: 50, display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600, margin: '0 auto',
          background: INK_2, borderRadius: '20px 20px 0 0',
          border: `1px solid ${LINE}`, borderBottom: 'none',
          padding: '28px 28px 40px',
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 99, margin: '0 auto 24px' }} />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontFamily: DISP, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.01em' }}>
            {drill.name}
          </h2>
          {drill.completed && <CheckCircle2 size={20} color="#4ade80" />}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <DiffBadge level={drill.difficulty} />
          <span style={{ fontSize: '0.65rem', color: MUTED_2, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>
            {drill.category}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <Clock size={14} />, label: 'Duration', val: drill.duration },
            { icon: <RotateCcw size={14} />, label: 'Volume', val: drill.reps },
          ].map((s) => (
            <div key={s.label} style={{
              flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`,
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: MUTED_2, marginBottom: 4 }}>
                {s.icon}
                <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {s.label}
                </span>
              </div>
              <div style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#f4f4f2' }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 24 }}>
          {drill.desc}
        </p>

        {/* Coaching cues */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: MUTED_2, marginBottom: 14,
          }}>
            Coaching Cues
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {drill.cues.map((cue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 28 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `${FLAME_C}18`, border: `1px solid ${FLAME_C}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: DISP, fontSize: '0.8rem', fontWeight: 800, color: FLAME_C,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
                  {cue}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={drill.completed ? undefined : onComplete}
            style={{
              flex: 1, padding: '13px 20px', borderRadius: 10,
              background: drill.completed ? 'rgba(74,222,128,0.12)' : FLAME_C,
              border: drill.completed ? '1px solid rgba(74,222,128,0.25)' : 'none',
              color: drill.completed ? '#4ade80' : '#fff',
              fontFamily: DISP, fontSize: '1rem', fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              cursor: drill.completed ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {drill.completed ? <><CheckCircle2 size={17} /> Completed</> : <><Play size={17} /> Start Drill</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export const Drills = () => {
  const [drills, setDrills] = useState<Drill[]>(DRILLS);
  const [catFilter, setCatFilter] = useState<string>('All');
  const [diffFilter, setDiffFilter] = useState<string>('All');
  const [selected, setSelected] = useState<Drill | null>(null);

  const completedCount = drills.filter((d) => d.completed).length;
  const streakXP = completedCount * 50;

  const filtered = drills.filter((d) => {
    if (catFilter !== 'All' && d.category !== catFilter) return false;
    if (diffFilter !== 'All' && d.difficulty !== diffFilter) return false;
    return true;
  });

  const markComplete = (id: number) => {
    setDrills((prev) => prev.map((d) => d.id === id ? { ...d, completed: true } : d));
    setSelected((prev) => prev && prev.id === id ? { ...prev, completed: true } : prev);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 120px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: FLAME_C,
        }}>
          <Flame size={13} />
          TRAINING DRILLS
        </div>
        <h1 style={{
          fontFamily: DISP, fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px',
          lineHeight: 1,
        }}>
          Get To Work.
        </h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
          Position-specific drills built for girls flag football. Every rep tracked.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        background: INK_2, border: `1px solid ${LINE}`,
        borderRadius: 12, padding: '16px 18px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11,
          background: completedCount > 0 ? `${FLAME_C}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${completedCount > 0 ? `${FLAME_C}40` : LINE}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Award size={20} color={completedCount > 0 ? FLAME_C : MUTED} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f4f4f2' }}>
              Today's Progress
            </span>
            <span style={{ fontSize: '0.75rem', color: FLAME_C, fontWeight: 800 }}>
              {completedCount} / {drills.length} drills · {streakXP} XP
            </span>
          </div>
          <div className="k-progress-track">
            <motion.div
              className="k-progress-fill"
              animate={{ width: `${(completedCount / drills.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
        {CATEGORIES.map((c) => (
          <motion.button
            key={c}
            whileTap={{ scale: 0.94 }}
            onClick={() => setCatFilter(c)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: 'none',
              background: catFilter === c ? FLAME_C : 'rgba(255,255,255,0.05)',
              color: catFilter === c ? '#fff' : MUTED,
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {c}
          </motion.button>
        ))}
      </div>

      {/* Difficulty filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {DIFFICULTIES.map((d) => (
          <motion.button
            key={d}
            whileTap={{ scale: 0.94 }}
            onClick={() => setDiffFilter(d)}
            style={{
              padding: '5px 12px', borderRadius: 99, border: 'none',
              background: diffFilter === d ? (DIFF_COLOR[d] || FLAME_C) : 'rgba(255,255,255,0.04)',
              color: diffFilter === d ? '#fff' : MUTED_2,
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {d === 'All' ? 'All Levels' : d}
          </motion.button>
        ))}
      </div>

      {/* Drill list */}
      <div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED_2 }}>
            <Target size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: '0.88rem', margin: 0 }}>No drills match those filters.</p>
          </div>
        ) : (
          filtered.map((drill) => (
            <DrillCard key={drill.id} drill={drill} onClick={() => setSelected(drill)} />
          ))
        )}
      </div>

      {/* Drill detail sheet */}
      <AnimatePresence>
        {selected && (
          <DrillDetail
            drill={selected}
            onClose={() => setSelected(null)}
            onComplete={() => {
              markComplete(selected.id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
