import { Trophy, GraduationCap, Star, ArrowRight } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

const COLLEGES = [
  { name: 'Eastern Michigan University', div: 'NAIA', state: 'MI', status: 'Established', note: 'First college women\'s flag football program, 2020' },
  { name: 'Southeastern University', div: 'NAIA', state: 'FL', status: 'Established', note: 'Championship program, national exposure' },
  { name: 'Indiana Wesleyan University', div: 'NAIA', state: 'IN', status: 'Established', note: 'Growing roster, athletic scholarships available' },
  { name: 'Bethune-Cookman University', div: 'HBCU', state: 'FL', status: 'Expanding', note: 'HBCU pioneer in women\'s flag football' },
  { name: 'University of California', div: 'Club/D1', state: 'CA', status: 'Club', note: 'Active club program, D1 path anticipated' },
  { name: 'Florida A&M University', div: 'HBCU', state: 'FL', status: 'Established', note: 'Varsity program with national tournament bids' },
];

const STATS = [
  { label: 'Varsity Programs', val: '40+' },
  { label: 'States with Programs', val: '22' },
  { label: 'Scholarships Available', val: '150+' },
  { label: 'Projected Growth (5yr)', val: '3×' },
];

export const CollegeFlagFootball = () => (
  <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
        <GraduationCap size={13} /> COLLEGE PROGRAMS
      </div>
      <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 10px', lineHeight: 1 }}>College Flag Football.</h1>
      <p style={{ color: MUTED, fontSize: '0.88rem', maxWidth: 520, lineHeight: 1.65 }}>Women's flag football is the fastest-growing college sport in America. Here's where the opportunities are — and where they're headed.</p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 36 }}>
      {STATS.map((s) => (
        <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
          <div style={{ fontFamily: DISP, fontSize: '1.8rem', fontWeight: 900, color: FLAME, lineHeight: 1 }}>{s.val}</div>
          <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 5 }}>{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Trophy size={16} color={FLAME} />
        <span style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase' }}>Active Programs</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {COLLEGES.map((c) => {
          const divColor = c.div === 'NAIA' ? FLAME : c.div === 'HBCU' ? '#a78bfa' : '#60a5fa';
          return (
            <div key={c.name} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2', marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: '0.72rem', color: MUTED }}>{c.note}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <span style={{ padding: '2px 8px', background: `${divColor}15`, border: `1px solid ${divColor}30`, borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, color: divColor }}>{c.div}</span>
                <span style={{ fontSize: '0.65rem', color: MUTED_2 }}>{c.state} · {c.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div style={{ background: `${FLAME}10`, border: `1px solid ${FLAME}30`, borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Star size={14} color={FLAME} />
          <span style={{ fontFamily: DISP, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase' }}>Use the College Fit Calculator</span>
        </div>
        <p style={{ color: MUTED, fontSize: '0.78rem', margin: 0 }}>Enter your GPA and HERS Rating to see which programs match your profile.</p>
      </div>
      <ArrowRight size={18} color={FLAME} />
    </div>
  </div>
);
