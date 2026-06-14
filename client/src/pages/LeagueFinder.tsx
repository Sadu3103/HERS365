import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users, Calendar, ChevronRight, Trophy } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

const STATES = ['CA', 'TX', 'FL', 'OH', 'GA', 'AZ', 'WA', 'CO', 'NY', 'NC'];
const FORMATS = ['All', '7v7', 'Flag', 'Combined'];

type League = { name: string; state: string; city: string; format: string; teams: number; season: string; level: string; open: boolean };

const LEAGUES: League[] = [
  { name: 'SoCal Girls Flag Football League', state: 'CA', city: 'Los Angeles', format: 'Flag', teams: 24, season: 'Fall 2025', level: 'High School', open: true },
  { name: 'Bay Area 7v7 Circuit', state: 'CA', city: 'San Jose', format: '7v7', teams: 16, season: 'Spring 2026', level: 'All Ages', open: true },
  { name: 'Texas Girls Flag Alliance', state: 'TX', city: 'Dallas', format: 'Flag', teams: 32, season: 'Fall 2025', level: 'High School', open: false },
  { name: 'Florida Girls 7v7 Classic', state: 'FL', city: 'Orlando', format: '7v7', teams: 20, season: 'Spring 2026', level: 'HS & College', open: true },
  { name: 'Buckeye Flag Football Association', state: 'OH', city: 'Columbus', format: 'Combined', teams: 18, season: 'Fall 2025', level: 'High School', open: true },
  { name: 'Pacific Northwest Flag Circuit', state: 'WA', city: 'Seattle', format: 'Flag', teams: 14, season: 'Fall 2025', level: 'All Ages', open: false },
];

export const LeagueFinder = () => {
  const [state, setState] = useState('');
  const [format, setFormat] = useState('All');
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = LEAGUES.filter((l) => {
    if (state && l.state !== state) return false;
    if (format !== 'All' && l.format !== format) return false;
    if (openOnly && !l.open) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <Trophy size={13} /> LEAGUE FINDER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>Find Your League.</h1>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Girls flag football leagues and 7v7 circuits near you.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>State</div>
          <select className="k-input" value={state} onChange={(e) => setState(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
            <option value="">All States</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>Format</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {FORMATS.map((f) => <motion.button key={f} whileTap={{ scale: 0.94 }} onClick={() => setFormat(f)} style={{ padding: '8px 12px', borderRadius: 99, border: 'none', background: format === f ? FLAME : 'rgba(255,255,255,0.05)', color: format === f ? '#fff' : MUTED, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>{f}</motion.button>)}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', alignSelf: 'flex-end', paddingBottom: 4 }}>
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} style={{ accentColor: FLAME }} />
          <span style={{ fontSize: '0.75rem', color: MUTED }}>Open registration only</span>
        </label>
      </div>

      <div style={{ fontSize: '0.7rem', color: MUTED_2, marginBottom: 14 }}>{filtered.length} league{filtered.length !== 1 ? 's' : ''} found</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((l, i) => (
          <motion.div key={i} whileHover={{ x: 3 }} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{l.name}</div>
                {l.open && <span style={{ padding: '2px 7px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: '#4ade80' }}>OPEN</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.72rem', color: MUTED }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{l.city}, {l.state}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} />{l.teams} teams</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{l.season}</span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <span style={{ padding: '2px 8px', background: `${FLAME}15`, border: `1px solid ${FLAME}30`, borderRadius: 99, fontSize: '0.62rem', fontWeight: 700, color: FLAME }}>{l.format}</span>
                <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 99, fontSize: '0.62rem', color: MUTED_2 }}>{l.level}</span>
              </div>
            </div>
            <ChevronRight size={16} color={MUTED_2} />
          </motion.div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem' }}>No leagues match your filters.</div>}
      </div>
    </div>
  );
};
