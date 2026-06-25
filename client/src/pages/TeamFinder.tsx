import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Users, Star, ChevronRight } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type Team = {
  id?: number;
  name: string;
  city: string;
  state: string;
  level: string;
  type: string;
  roster: number;
  record?: string;
  openSpots: number;
};

interface TeamsApiRow {
  id: number;
  name: string;
  city?: string;
  state?: string;
  division?: string;
  type?: string;
  wins?: number;
  losses?: number;
}

const FALLBACK_TEAMS: Team[] = [
  { name: 'Valley Oak Wolves', city: 'Sacramento', state: 'CA', level: 'Varsity', type: 'School', roster: 22, record: '8-2', openSpots: 2 },
  { name: 'Bay Blazers 7v7', city: 'Oakland', state: 'CA', level: 'Travel', type: '7v7', roster: 14, openSpots: 4 },
  { name: 'SoCal Fire', city: 'Riverside', state: 'CA', level: 'Travel', type: '7v7', roster: 12, record: '14-3', openSpots: 0 },
  { name: 'Phoenix Rising', city: 'Phoenix', state: 'AZ', level: 'Varsity', type: 'School', roster: 28, record: '6-4', openSpots: 3 },
  { name: 'Lone Star Elite', city: 'Austin', state: 'TX', level: 'Elite', type: '7v7', roster: 15, record: '22-5', openSpots: 1 },
  { name: 'Pacific Wave', city: 'Seattle', state: 'WA', level: 'Travel', type: 'Flag', roster: 18, openSpots: 5 },
];

export const TeamFinder = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [teams, setTeams] = useState<Team[]>(FALLBACK_TEAMS);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/teams', { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((res: { success: boolean; data: TeamsApiRow[] } | null) => {
        if (!res?.success || !res.data?.length) return;
        setTeams(res.data.map((t) => ({
          id: t.id,
          name: t.name,
          city: t.city ?? '',
          state: t.state ?? '',
          level: t.division ?? 'Varsity',
          type: t.type ?? 'School',
          roster: 0,
          record: t.wins != null && t.losses != null ? `${t.wins}-${t.losses}` : undefined,
          openSpots: 0,
        })));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const filtered = teams.filter((t) => {
    if (type !== 'All' && t.type !== type) return false;
    if (query && !t.name.toLowerCase().includes(query.toLowerCase()) && !t.city.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <Users size={13} /> TEAM FINDER
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>Find Your Team.</h1>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>School squads, travel teams, and 7v7 programs looking for athletes.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: MUTED_2 }} />
          <input className="k-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Team name or city..." style={{ width: '100%', padding: '9px 12px 9px 34px' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'School', '7v7', 'Flag'].map((t) => <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => setType(t)} style={{ padding: '9px 14px', borderRadius: 99, border: 'none', background: type === t ? FLAME : 'rgba(255,255,255,0.05)', color: type === t ? '#fff' : MUTED, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>{t}</motion.button>)}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((t, i) => (
          <motion.div key={t.id ?? i} whileHover={{ x: 3 }} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f4f4f2' }}>{t.name}</div>
                {t.openSpots > 0 && <span style={{ padding: '2px 7px', background: `${FLAME}15`, border: `1px solid ${FLAME}40`, borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: FLAME }}>{t.openSpots} spot{t.openSpots !== 1 ? 's' : ''} open</span>}
                {t.openSpots === 0 && <span style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.05)', borderRadius: 99, fontSize: '0.6rem', fontWeight: 700, color: MUTED_2 }}>FULL</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.72rem', color: MUTED }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{t.city}, {t.state}</span>
                {t.roster > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} />{t.roster} players</span>}
                {t.record && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={11} />{t.record}</span>}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 99, fontSize: '0.62rem', color: MUTED_2 }}>{t.level} · {t.type}</span>
              </div>
            </div>
            <ChevronRight size={16} color={MUTED_2} />
          </motion.div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '36px', color: MUTED_2, fontSize: '0.85rem' }}>No teams found.</div>}
      </div>
    </div>
  );
};
