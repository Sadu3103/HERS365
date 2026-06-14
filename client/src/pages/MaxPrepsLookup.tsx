import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';

const FLAME = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type MPPlayer = {
  maxprepsId?: string;
  name: string;
  school?: string;
  state?: string;
  stats: {
    touchdowns?: number;
    passingYards?: number;
    rushingYards?: number;
    receptions?: number;
    receivingYards?: number;
    interceptions?: number;
  };
};

type MPTeam = {
  name: string;
  state?: string;
  wins?: number;
  losses?: number;
  rank?: number;
};

const STATES = ['', 'CA', 'TX', 'FL', 'OH', 'GA', 'AZ', 'WA', 'CO', 'NY', 'NC'];
const CATS = ['passing', 'rushing', 'receiving', 'touchdowns', 'interceptions'];

type Tab = 'search' | 'leaders' | 'rankings';

export const MaxPrepsLookup = () => {
  const [tab, setTab] = useState<Tab>('leaders');

  // Player search
  const [searchName, setSearchName] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState<MPPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Leaders
  const [leaderCat, setLeaderCat] = useState('touchdowns');
  const [leaderState, setLeaderState] = useState('');
  const [leaders, setLeaders] = useState<MPPlayer[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [leadersLoaded, setLeadersLoaded] = useState(false);

  // Rankings
  const [rankState, setRankState] = useState('CA');
  const [teams, setTeams] = useState<MPTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const fetchLeaders = async () => {
    setLoadingLeaders(true);
    try {
      const qs = new URLSearchParams({ category: leaderCat });
      if (leaderState) qs.set('state', leaderState);
      const res = await fetch(`/api/maxpreps/leaders?${qs}`);
      const data = await res.json();
      setLeaders(data.leaders || []);
    } catch {
      setLeaders([]);
    } finally {
      setLoadingLeaders(false);
      setLeadersLoaded(true);
    }
  };

  const fetchRankings = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch(`/api/maxpreps/rankings?state=${rankState}`);
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      setTeams([]);
    } finally {
      setLoadingTeams(false);
      setTeamsLoaded(true);
    }
  };

  const searchPlayers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;
    setSearching(true);
    try {
      const qs = new URLSearchParams({ name: searchName });
      if (searchState) qs.set('state', searchState);
      const res = await fetch(`/api/maxpreps/player?${qs}`);
      const data = await res.json();
      setSearchResults(data.players || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const statLine = (p: MPPlayer) => {
    const s = p.stats;
    const parts: string[] = [];
    if (s.touchdowns) parts.push(`${s.touchdowns} TDs`);
    if (s.passingYards) parts.push(`${s.passingYards} pass yds`);
    if (s.rushingYards) parts.push(`${s.rushingYards} rush yds`);
    if (s.receivingYards) parts.push(`${s.receivingYards} rec yds`);
    if (s.receptions) parts.push(`${s.receptions} rec`);
    if (s.interceptions) parts.push(`${s.interceptions} INT`);
    return parts.join(' · ') || 'No stats available';
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME }}>
          <Trophy size={13} /> MAXPREPS
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Girls Flag Football Stats
        </h1>
        <p style={{ color: MUTED, fontSize: '0.85rem', margin: 0 }}>Live data from MaxPreps — national stat leaders, team rankings, and player lookup.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {([
          { id: 'leaders', label: 'Stat Leaders', icon: <TrendingUp size={13} /> },
          { id: 'rankings', label: 'Team Rankings', icon: <Trophy size={13} /> },
          { id: 'search', label: 'Player Search', icon: <Search size={13} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <motion.button key={t.id} whileTap={{ scale: 0.95 }} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
            background: tab === t.id ? FLAME : 'rgba(255,255,255,0.05)',
            color: tab === t.id ? '#fff' : MUTED,
            fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
          }}>{t.icon}{t.label}</motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* LEADERS TAB */}
        {tab === 'leaders' && (
          <motion.div key="leaders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>Category</div>
                <select className="k-input" value={leaderCat} onChange={(e) => { setLeaderCat(e.target.value); setLeadersLoaded(false); }} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  {CATS.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>State</div>
                <select className="k-input" value={leaderState} onChange={(e) => { setLeaderState(e.target.value); setLeadersLoaded(false); }} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  <option value="">National</option>
                  {STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={fetchLeaders} disabled={loadingLeaders} style={{ padding: '9px 18px', background: FLAME, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>
                {loadingLeaders ? 'Loading…' : 'Load Leaders'}
              </motion.button>
            </div>
            {leadersLoaded && (
              leaders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: MUTED_2, fontSize: '0.85rem' }}>No data available — MaxPreps may not have current season data for this filter.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leaders.map((p, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? `${FLAME}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${i < 3 ? FLAME : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: DISP, fontWeight: 900, fontSize: '0.85rem', color: i < 3 ? FLAME : MUTED }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2', marginBottom: 2 }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: MUTED }}>{p.school}{p.state ? ` · ${p.state}` : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: DISP, fontSize: '1rem', fontWeight: 900, color: FLAME }}>{statLine(p).split(' · ')[0]}</div>
                        <div style={{ fontSize: '0.65rem', color: MUTED_2 }}>{statLine(p).split(' · ').slice(1).join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {!leadersLoaded && !loadingLeaders && (
              <div style={{ textAlign: 'center', padding: '32px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>
                Select a category and tap "Load Leaders"
              </div>
            )}
          </motion.div>
        )}

        {/* RANKINGS TAB */}
        {tab === 'rankings' && (
          <motion.div key="rankings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>State</div>
                <select className="k-input" value={rankState} onChange={(e) => { setRankState(e.target.value); setTeamsLoaded(false); }} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                  {STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={fetchRankings} disabled={loadingTeams} style={{ padding: '9px 18px', background: FLAME, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>
                {loadingTeams ? 'Loading…' : 'Load Rankings'}
              </motion.button>
            </div>
            {teamsLoaded && (
              teams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: MUTED_2, fontSize: '0.85rem' }}>No rankings available for {rankState}.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {teams.map((t, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? `${FLAME}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${i < 3 ? FLAME : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: DISP, fontWeight: 900, fontSize: '0.85rem', color: i < 3 ? FLAME : MUTED }}>
                        {t.rank ?? i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{t.name}</div>
                        <div style={{ fontSize: '0.72rem', color: MUTED }}>{t.state}</div>
                      </div>
                      {(t.wins !== undefined || t.losses !== undefined) && (
                        <div style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 900, color: '#f4f4f2' }}>
                          {t.wins ?? 0}–{t.losses ?? 0}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
            {!teamsLoaded && !loadingTeams && (
              <div style={{ textAlign: 'center', padding: '32px', color: MUTED_2, fontSize: '0.85rem', border: `1px dashed ${LINE}`, borderRadius: 14 }}>
                Select a state and tap "Load Rankings"
              </div>
            )}
          </motion.div>
        )}

        {/* SEARCH TAB */}
        {tab === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <form onSubmit={searchPlayers} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>Player Name</div>
                <input className="k-input" value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="First or last name..." style={{ width: '100%', padding: '9px 12px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED_2, marginBottom: 6 }}>State</div>
                <select className="k-input" value={searchState} onChange={(e) => setSearchState(e.target.value)} style={{ padding: '9px 12px', fontSize: '0.8rem' }}>
                  <option value="">Any</option>
                  {STATES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={searching} style={{ padding: '9px 18px', background: FLAME, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-end' }}>
                <Search size={14} />{searching ? 'Searching…' : 'Search'}
              </motion.button>
            </form>
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 4 }}><Users size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</div>
                {searchResults.map((p, i) => {
                  const key = p.maxprepsId || `${p.name}-${i}`;
                  const isOpen = expanded === key;
                  return (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? `${FLAME}40` : LINE}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                      <button onClick={() => setExpanded(isOpen ? null : key)} style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f4f4f2' }}>{p.name}</div>
                          <div style={{ fontSize: '0.72rem', color: MUTED }}>{p.school}{p.state ? ` · ${p.state}` : ''}</div>
                        </div>
                        {isOpen ? <ChevronUp size={15} color={FLAME} /> : <ChevronDown size={15} color={MUTED_2} />}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                              {Object.entries(p.stats).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => (
                                <div key={k} style={{ background: 'rgba(255,90,45,0.08)', border: `1px solid ${FLAME}30`, borderRadius: 8, padding: '6px 12px', textAlign: 'center' }}>
                                  <div style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 900, color: FLAME }}>{v as number}</div>
                                  <div style={{ fontSize: '0.6rem', color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                                </div>
                              ))}
                              {Object.values(p.stats).every((v) => !v) && (
                                <div style={{ color: MUTED_2, fontSize: '0.82rem' }}>No detailed stats on MaxPreps for this player.</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
            {searchResults.length === 0 && !searching && searchName && (
              <div style={{ textAlign: 'center', padding: '32px', color: MUTED_2, fontSize: '0.85rem' }}>No players found for "{searchName}".</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
