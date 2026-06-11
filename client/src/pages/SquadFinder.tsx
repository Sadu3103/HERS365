import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, Users, CheckCircle2, Zap, MessageCircle,
} from 'lucide-react';

const FLAME_C = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Athlete = {
  id: number; name: string; school: string; state: string; pos: string;
  gradYear: number; g5Rating: number; verified: boolean; bio: string;
  lookingFor: 'team' | '7v7' | 'training partner' | 'all'; connected: boolean;
};

const SEED_ATHLETES: Athlete[] = [
  { id: 1, name: 'Destiny Clarke', school: 'Houston HS, TX', state: 'TX', pos: 'QB', gradYear: 2026, g5Rating: 91, verified: true, bio: 'Looking for a 7v7 squad that trains hard. QB who can run and throw.', lookingFor: '7v7', connected: false },
  { id: 2, name: 'Priya Patel', school: 'Edison HS, NJ', state: 'NJ', pos: 'DB', gradYear: 2027, g5Rating: 87, verified: true, bio: 'Elite shutdown corner. Want a serious training partner who pushes me.', lookingFor: 'training partner', connected: false },
  { id: 3, name: 'Naomi Carter', school: 'Brookfield HS, NC', state: 'NC', pos: 'WR', gradYear: 2026, g5Rating: 84, verified: true, bio: "Route running is my art. Looking for a competitive team heading into spring.", lookingFor: 'team', connected: false },
  { id: 4, name: 'Layla Hassan', school: 'Crestview HS, AZ', state: 'AZ', pos: 'LB', gradYear: 2028, g5Rating: 83, verified: false, bio: "Physical LB who loves contact. 7v7 or team — I'm in.", lookingFor: 'all', connected: false },
  { id: 5, name: 'Sofia Ramirez', school: 'Desert Ridge HS, AZ', state: 'AZ', pos: 'RB', gradYear: 2026, g5Rating: 89, verified: true, bio: 'Speed back looking for 7v7 reps before the fall season.', lookingFor: '7v7', connected: false },
  { id: 6, name: 'Amara Osei', school: 'Westwood HS, FL', state: 'FL', pos: 'TE', gradYear: 2027, g5Rating: 86, verified: false, bio: 'Versatile TE who can split out wide. Serious about getting recruited.', lookingFor: 'team', connected: false },
];

const POSITIONS = ['All', 'QB', 'WR', 'RB', 'TE', 'LB', 'DB'];
const LOOKING_FOR = ['All', 'team', '7v7', 'training partner'];
const POS_COLOR: Record<string, string> = {
  QB: '#c084fc', WR: '#fbbf24', RB: FLAME_C, TE: '#34d399', LB: '#60a5fa', DB: '#f472b6',
};

function nameToIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return (Math.abs(h) % 90) + 1;
}

function AthleteCard({ athlete, onConnect }: { athlete: Athlete; onConnect: () => void }) {
  const color = POS_COLOR[athlete.pos] || FLAME_C;
  const lookLabels: Record<string, string> = { team: 'Wants a Team', '7v7': '7v7 Squads', 'training partner': 'Training Partner', all: 'Open to All' };
  return (
    <motion.div className="k-card-hover" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }} style={{ padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={`https://randomuser.me/api/portraits/women/${nameToIdx(athlete.name)}.jpg`} alt={athlete.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}55`, boxShadow: `0 0 12px ${color}33` }} />
          {athlete.verified && <div style={{ position: 'absolute', bottom: -2, right: -2, background: FLAME_C, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0a0a0a' }}><CheckCircle2 size={9} color="#fff" /></div>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: DISP, fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2' }}>{athlete.name}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${color}30` }}>{athlete.pos}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: MUTED_2 }}><MapPin size={11} /><span style={{ fontSize: '0.7rem' }}>{athlete.school}</span></div>
            <span style={{ color: LINE, fontSize: '0.65rem' }}>·</span>
            <span style={{ fontSize: '0.7rem', color: MUTED_2 }}>{`'${String(athlete.gradYear).slice(2)}`}</span>
            <span style={{ color: LINE, fontSize: '0.65rem' }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Zap size={10} color={FLAME_C} /><span style={{ fontSize: '0.7rem', fontWeight: 700, color: FLAME_C }}>{athlete.g5Rating}</span></div>
          </div>
          <p style={{ fontSize: '0.78rem', color: MUTED, margin: '0 0 10px', lineHeight: 1.45 }}>{athlete.bio}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}`, color: MUTED }}>{lookLabels[athlete.lookingFor]}</span>
            <motion.button whileTap={{ scale: 0.93 }} onClick={onConnect} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: athlete.connected ? 'rgba(74,222,128,0.12)' : FLAME_C, color: athlete.connected ? '#4ade80' : '#fff', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {athlete.connected ? <><CheckCircle2 size={13} /> Connected</> : <><MessageCircle size={13} /> Connect</>}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const SquadFinder = () => {
  const [athletes, setAthletes] = useState<Athlete[]>(SEED_ATHLETES);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [lookFilter, setLookFilter] = useState('All');

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/players', { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data: any[] | null) => {
        if (!data || data.length === 0) return;
        setAthletes(data.slice(0, 20).map((p) => ({ id: p.id, name: p.name || 'Athlete', school: p.school || 'HERS365', state: p.state || 'CA', pos: p.position || 'ATH', gradYear: p.gradYear || 2026, g5Rating: p.g5Rating || 75, verified: !!p.subscriptionTier && p.subscriptionTier !== 'free', bio: p.bio || 'HERS365 athlete.', lookingFor: 'all' as const, connected: false })));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const filtered = athletes.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.school.toLowerCase().includes(search.toLowerCase())) return false;
    if (posFilter !== 'All' && a.pos !== posFilter) return false;
    if (lookFilter !== 'All' && a.lookingFor !== lookFilter && a.lookingFor !== 'all') return false;
    return true;
  });
  const connect = (id: number) => setAthletes((prev) => prev.map((a) => a.id === id ? { ...a, connected: !a.connected } : a));
  const connectionCount = athletes.filter((a) => a.connected).length;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}><Users size={13} /> SQUAD FINDER</div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>Find Your People.</h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>Connect with athletes nearby. Find a 7v7 squad, training partner, or full team.</p>
      </div>
      {connectionCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 99, padding: '5px 12px', marginBottom: 20, fontSize: '0.72rem', fontWeight: 700, color: '#4ade80' }}>
          <CheckCircle2 size={13} /> {connectionCount} connection{connectionCount !== 1 ? 's' : ''} made
        </motion.div>
      )}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED_2 }} />
        <input className="k-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or school..." style={{ width: '100%', padding: '10px 12px 10px 36px' }} />
      </div>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, scrollbarWidth: 'none' }}>
        {POSITIONS.map((p) => <motion.button key={p} whileTap={{ scale: 0.94 }} onClick={() => setPosFilter(p)} style={{ padding: '5px 12px', borderRadius: 99, border: 'none', background: posFilter === p ? (POS_COLOR[p] || FLAME_C) : 'rgba(255,255,255,0.05)', color: posFilter === p ? '#fff' : MUTED, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>{p}</motion.button>)}
      </div>
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {LOOKING_FOR.map((l) => <motion.button key={l} whileTap={{ scale: 0.94 }} onClick={() => setLookFilter(l)} style={{ padding: '5px 12px', borderRadius: 99, border: 'none', background: lookFilter === l ? FLAME_C : 'rgba(255,255,255,0.04)', color: lookFilter === l ? '#fff' : MUTED_2, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>{l === 'All' ? 'All Types' : l === '7v7' ? '7v7' : l.charAt(0).toUpperCase() + l.slice(1)}</motion.button>)}
      </div>
      <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 14 }}>{filtered.length} athletes found</div>
      <AnimatePresence>
        {filtered.length === 0
          ? <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '48px 0', color: MUTED_2 }}><Search size={32} style={{ marginBottom: 12, opacity: 0.4 }} /><p style={{ fontSize: '0.88rem', margin: 0 }}>No athletes match those filters.</p></motion.div>
          : filtered.map((a) => <AthleteCard key={a.id} athlete={a} onConnect={() => connect(a.id)} />)}
      </AnimatePresence>
    </div>
  );
};
