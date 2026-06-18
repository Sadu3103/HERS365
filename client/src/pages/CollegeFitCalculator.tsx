import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, CheckCircle2, AlertCircle,
  Zap, ChevronDown, ChevronUp, Star,
} from 'lucide-react';
import { FLAG_POSITIONS } from '../lib/positions';

const FLAME_C = '#ff5a2d';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type FitLevel = 'reach' | 'target' | 'safety' | 'strong fit';

type College = {
  name: string;
  state: string;
  division: string;
  minGPA: number;
  minRating: number;
  avgGPA: number;
  avgRating: number;
  scholarships: boolean;
  note: string;
};

const COLLEGES: College[] = [
  { name: 'University of Texas', state: 'TX', division: 'D1', minGPA: 3.0, minRating: 88, avgGPA: 3.6, avgRating: 92, scholarships: true, note: 'Flagship program. National recruiting scope.' },
  { name: 'Florida State', state: 'FL', division: 'D1', minGPA: 3.0, minRating: 86, avgGPA: 3.5, avgRating: 90, scholarships: true, note: 'Strong SEC presence. Prioritizes speed.' },
  { name: 'Arizona State', state: 'AZ', division: 'D1', minGPA: 2.5, minRating: 82, avgGPA: 3.2, avgRating: 87, scholarships: true, note: 'Top Pac-12 program. Focus on WR/DB.' },
  { name: 'Cal State Fullerton', state: 'CA', division: 'D2', minGPA: 2.3, minRating: 72, avgGPA: 3.0, avgRating: 80, scholarships: true, note: 'Strong D2 program. Great path to pro.' },
  { name: 'College of Charleston', state: 'SC', division: 'D2', minGPA: 2.5, minRating: 68, avgGPA: 2.9, avgRating: 76, scholarships: false, note: 'Smaller campus. Good academic support.' },
  { name: 'University of Mary', state: 'ND', division: 'NAIA', minGPA: 2.0, minRating: 60, avgGPA: 2.7, avgRating: 72, scholarships: true, note: 'NAIA champion. Full ride available.' },
  { name: 'Eastern New Mexico', state: 'NM', division: 'D2', minGPA: 2.0, minRating: 65, avgGPA: 2.8, avgRating: 74, scholarships: true, note: 'Strong athletic support. Good fit scores.' },
  { name: 'Bethel University', state: 'IN', division: 'NAIA', minGPA: 2.0, minRating: 55, avgGPA: 2.6, avgRating: 68, scholarships: true, note: 'Scholarship-forward. Recruits nationally.' },
];

function getFit(gpa: number, rating: number, college: College): FitLevel {
  if (gpa < college.minGPA || rating < college.minRating) return 'reach';
  if (gpa >= college.avgGPA && rating >= college.avgRating) return 'strong fit';
  if (gpa >= college.minGPA + 0.5 && rating >= college.minRating + 6) return 'target';
  return 'safety';
}

const FIT_CFG: Record<FitLevel, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'strong fit': { label: 'Strong Fit',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)', icon: <CheckCircle2 size={16} /> },
  target:       { label: 'Target',      color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: <Star size={16} /> },
  safety:       { label: 'Safety',      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: <CheckCircle2 size={16} /> },
  reach:        { label: 'Reach',       color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: <AlertCircle size={16} /> },
};

export const CollegeFitCalculator = () => {
  const [gpa, setGpa] = useState('');
  const [rating, setRating] = useState('');
  const [pos, setPos] = useState('WR');
  const [divFilter, setDivFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [calculated, setCalculated] = useState(false);

  const numGpa = parseFloat(gpa) || 0;
  const numRating = parseInt(rating, 10) || 0;

  const results = calculated ? COLLEGES
    .filter((c) => divFilter === 'All' || c.division === divFilter)
    .map((c) => ({ ...c, fit: getFit(numGpa, numRating, c) }))
    .sort((a, b) => {
      const order: FitLevel[] = ['strong fit', 'target', 'safety', 'reach'];
      return order.indexOf(a.fit) - order.indexOf(b.fit);
    }) : [];

  const fitCounts = results.reduce((acc, r) => ({ ...acc, [r.fit]: (acc[r.fit] || 0) + 1 }), {} as Record<string, number>);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}>
          <GraduationCap size={13} /> COLLEGE FIT
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Find Your Fit.
        </h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>
          Enter your stats and see which programs match your profile.
        </p>
      </div>

      {/* Input form */}
      <div style={{ background: INK_2, border: `1px solid ${LINE}`, borderRadius: 14, padding: '22px 22px 20px', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 8 }}>GPA</div>
            <input
              className="k-input"
              type="number" step="0.1" min="0" max="4"
              placeholder="e.g. 3.7"
              value={gpa} onChange={(e) => setGpa(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 8 }}>HERS Rating</div>
            <input
              className="k-input"
              type="number" min="0" max="100"
              placeholder="e.g. 87"
              value={rating} onChange={(e) => setRating(e.target.value)}
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 8 }}>Position</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {FLAG_POSITIONS.map((p) => (
              <motion.button key={p} whileTap={{ scale: 0.93 }} onClick={() => setPos(p)}
                style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: pos === p ? FLAME_C : 'rgba(255,255,255,0.05)', color: pos === p ? '#fff' : MUTED, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}>
                {p}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          className="k-btn k-btn-primary"
          onClick={() => setCalculated(true)}
          disabled={!gpa || !rating}
          style={{ width: '100%', padding: '13px', borderRadius: 10, justifyContent: 'center', fontFamily: DISP, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: !gpa || !rating ? 0.5 : 1 }}
        >
          <Zap size={15} /> Calculate My Fit
        </motion.button>
      </div>

      {/* Results */}
      {calculated && results.length > 0 && (
        <>
          {/* Fit summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 22 }}>
            {(['strong fit', 'target', 'safety', 'reach'] as FitLevel[]).map((f) => {
              const cfg = FIT_CFG[f];
              return (
                <div key={f} style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 10, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: DISP, fontSize: '1.3rem', fontWeight: 900, color: cfg.color, letterSpacing: '-0.01em' }}>{fitCounts[f] || 0}</div>
                  <div style={{ fontSize: '0.58rem', color: cfg.color, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>

          {/* Division filter */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
            {['All', 'D1', 'D2', 'NAIA'].map((d) => (
              <motion.button key={d} whileTap={{ scale: 0.94 }} onClick={() => setDivFilter(d)}
                style={{ padding: '4px 12px', borderRadius: 99, border: 'none', background: divFilter === d ? FLAME_C : 'rgba(255,255,255,0.05)', color: divFilter === d ? '#fff' : MUTED_2, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                {d}
              </motion.button>
            ))}
          </div>

          {/* College cards */}
          {results.map((r) => {
            const cfg = FIT_CFG[r.fit];
            const isOpen = expanded === r.name;
            return (
              <motion.div key={r.name} className="k-card-hover" layout style={{ padding: '14px 18px', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => setExpanded(isOpen ? null : r.name)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: cfg.bg, border: `1px solid ${cfg.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, flexShrink: 0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: DISP, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2' }}>{r.name}</span>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: MUTED_2, marginTop: 2 }}>{r.division} · {r.state}{r.scholarships ? ' · Scholarships Available' : ''}</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color={MUTED_2} /> : <ChevronDown size={16} color={MUTED_2} />}
                </div>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${LINE}` }}>
                    <p style={{ fontSize: '0.8rem', color: MUTED, margin: '0 0 12px', lineHeight: 1.5 }}>{r.note}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Min GPA', val: r.minGPA.toFixed(1), yours: numGpa, good: numGpa >= r.minGPA },
                        { label: 'Avg GPA', val: r.avgGPA.toFixed(1), yours: numGpa, good: numGpa >= r.avgGPA },
                        { label: 'Min Rating', val: r.minRating, yours: numRating, good: numRating >= r.minRating },
                        { label: 'Avg Rating', val: r.avgRating, yours: numRating, good: numRating >= r.avgRating },
                      ].map((stat) => (
                        <div key={stat.label} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ fontSize: '0.58rem', color: MUTED_2, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 3 }}>{stat.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f2' }}>{stat.val}</span>
                            <span style={{ fontSize: '0.65rem', color: stat.good ? '#4ade80' : '#f87171', fontWeight: 700 }}>Yours: {typeof stat.yours === 'number' && stat.label.includes('GPA') ? stat.yours.toFixed(1) : stat.yours}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
};
