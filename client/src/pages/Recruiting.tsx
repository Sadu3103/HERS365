import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Bookmark, BookmarkCheck, X, Send, MapPin,
  Users, Award, Mail, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

interface Program {
  id: number;
  name: string;
  city: string;
  state: string;
  division: string;
  conference: string;
  hasScholarships: boolean;
  programSize: 'Small' | 'Medium' | 'Large';
  coachId: number | null;
  athletesRecruited: number;
  winRecord: string;
  tuitionInState: number;
}

interface Coach {
  id: number;
  name: string;
  title: string;
  school: string;
  sport: string;
  email: string;
  bio: string;
  recruitedAthletes: string[];
}

const mockPrograms: Program[] = [
  { id: 1, name: 'University of Texas', city: 'Austin', state: 'Texas', division: 'NCAA D1', conference: 'Big 12', hasScholarships: true, programSize: 'Large', coachId: 1, athletesRecruited: 48, winRecord: '12-2', tuitionInState: 11000 },
  { id: 2, name: 'Florida State University', city: 'Tallahassee', state: 'Florida', division: 'NCAA D1', conference: 'ACC', hasScholarships: true, programSize: 'Large', coachId: 2, athletesRecruited: 52, winRecord: '13-1', tuitionInState: 13000 },
  { id: 3, name: 'Azusa Pacific University', city: 'Azusa', state: 'California', division: 'NAIA', conference: 'GSAC', hasScholarships: true, programSize: 'Medium', coachId: 3, athletesRecruited: 24, winRecord: '8-4', tuitionInState: 36000 },
  { id: 4, name: 'Hardin-Simmons University', city: 'Abilene', state: 'Texas', division: 'NCAA D3', conference: 'ASC', hasScholarships: false, programSize: 'Small', coachId: 4, athletesRecruited: 16, winRecord: '7-3', tuitionInState: 30000 },
  { id: 5, name: 'Shorter University', city: 'Rome', state: 'Georgia', division: 'NCAA D2', conference: 'SAC', hasScholarships: true, programSize: 'Medium', coachId: 5, athletesRecruited: 28, winRecord: '9-3', tuitionInState: 18000 },
  { id: 6, name: 'San Diego Mesa College', city: 'San Diego', state: 'California', division: 'JUCO', conference: 'PCAC', hasScholarships: false, programSize: 'Small', coachId: null, athletesRecruited: 12, winRecord: '5-5', tuitionInState: 1500 },
  { id: 7, name: 'Lindenwood University', city: 'St. Charles', state: 'Missouri', division: 'NCAA D1', conference: 'OVC', hasScholarships: true, programSize: 'Large', coachId: 6, athletesRecruited: 40, winRecord: '10-4', tuitionInState: 19000 },
  { id: 8, name: 'Benedictine College', city: 'Atchison', state: 'Kansas', division: 'NAIA', conference: 'HAAC', hasScholarships: true, programSize: 'Small', coachId: 7, athletesRecruited: 20, winRecord: '6-4', tuitionInState: 32000 },
];

const mockCoaches: Record<number, Coach> = {
  1: { id: 1, name: 'Coach Maria Torres', title: 'Head Coach', school: 'University of Texas', sport: 'Flag Football', email: 'mtorres@utexas.edu', bio: 'Coach Torres brings 12 years of collegiate flag football experience. Former All-American QB who led her team to 3 national championships. Focused on developing elite QBs and DBs.', recruitedAthletes: ['Sarah W. (QB, TX)', 'Amara J. (DB, GA)', 'Priya K. (WR, CA)'] },
  2: { id: 2, name: 'Coach Lisa Monroe', title: 'Head Coach', school: 'Florida State University', sport: 'Flag Football', email: 'lmonroe@fsu.edu', bio: 'A decorated coach with 8 years at FSU. Known for building elite offensive systems. 2x conference champion and national finalist.', recruitedAthletes: ['Destiny R. (WR, FL)', 'Chloe B. (QB, TX)'] },
  3: { id: 3, name: 'Coach Angela Reed', title: 'Head Coach', school: 'Azusa Pacific University', sport: 'Flag Football', email: 'areed@apu.edu', bio: 'Coach Reed has developed 6 All-NAIA selections in her 5-year tenure. Passionate about the student-athlete balance and faith-based leadership.', recruitedAthletes: ['Hannah L. (RB, CA)', 'Jada T. (LB, AZ)'] },
  4: { id: 4, name: 'Coach Sandra Hill', title: 'Head Coach', school: 'Hardin-Simmons University', sport: 'Flag Football', email: 'shill@hsutx.edu', bio: 'Building the program from the ground up since 2021. Great opportunity for athletes who want immediate playing time in a growing D3 program.', recruitedAthletes: ['Emily G. (QB, TX)'] },
  5: { id: 5, name: 'Coach Tiffany Brooks', title: 'Head Coach', school: 'Shorter University', sport: 'Flag Football', email: 'tbrooks@shorter.edu', bio: 'Southeast regional powerhouse. Coach Brooks has 10 years of flag football coaching at multiple levels. Known for developing defensive specialists.', recruitedAthletes: ['Nia C. (DB, GA)', 'Morgan S. (LB, TN)', 'Ava H. (WR, AL)'] },
  6: { id: 6, name: 'Coach Denise Carr', title: 'Head Coach', school: 'Lindenwood University', sport: 'Flag Football', email: 'dcarr@lindenwood.edu', bio: 'Veteran coach with 15 years of experience. Led Lindenwood to their first OVC championship in 2024. Recruiting elite athletes across all positions.', recruitedAthletes: ['Taylor M. (QB, MO)', 'Jasmine P. (WR, IL)', 'Kayla R. (DB, KS)'] },
  7: { id: 7, name: 'Coach Patricia Vega', title: 'Head Coach', school: 'Benedictine College', sport: 'Flag Football', email: 'pvega@benedictine.edu', bio: 'Strong academic focus with competitive athletics. Coach Vega has built Benedictine into one of the premier small-school programs in the Midwest.', recruitedAthletes: ['Lauren K. (RB, KS)'] },
};

const divisions     = ['All', 'NCAA D1', 'NCAA D2', 'NCAA D3', 'NAIA', 'JUCO'];
const stateOptions  = ['All', 'California', 'Florida', 'Georgia', 'Kansas', 'Missouri', 'Texas'];
const conferences   = ['All', 'ACC', 'ASC', 'Big 12', 'GSAC', 'HAAC', 'OVC', 'PCAC', 'SAC'];
const sizes         = ['All', 'Small', 'Medium', 'Large'];
const positions     = ['QB', 'RB', 'WR', 'TE', 'LB', 'DB'];

function ProgramAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, background: 'rgba(255,90,45,0.12)',
      border: '1px solid rgba(255,90,45,0.25)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#ff5a2d' }}>
        {name.split(' ').map(w => w[0]).slice(0, 2).join('')}
      </span>
    </div>
  );
}

export const Recruiting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotifications();

  const [search, setSearch]               = useState(searchParams.get('q') || '');
  const [filterDiv, setFilterDiv]         = useState(searchParams.get('division') || 'All');
  const [filterState, setFilterState]     = useState(searchParams.get('state') || 'All');
  const [filterConf, setFilterConf]       = useState(searchParams.get('conference') || 'All');
  const [filterScholarship, setFilterScholarship] = useState(searchParams.get('scholarship') || 'All');
  const [filterSize, setFilterSize]       = useState(searchParams.get('size') || 'All');
  const [showFilters, setShowFilters]     = useState(false);
  const [activeTab, setActiveTab]         = useState<'browse' | 'saved'>('browse');

  const [savedSchools, setSavedSchools]     = useState<Set<number>>(new Set());
  const [appliedPrograms, setAppliedPrograms] = useState<Set<number>>(new Set());

  const [coachModal, setCoachModal] = useState<{ open: boolean; coach: Coach | null; program: Program | null }>({
    open: false, coach: null, program: null,
  });
  const [showMessageCompose, setShowMessageCompose] = useState(false);
  const [messageText, setMessageText]   = useState('');
  const [messageSending, setMessageSending] = useState(false);

  const [applyModal, setApplyModal] = useState<{ open: boolean; program: Program | null }>({
    open: false, program: null,
  });
  const [applyForm, setApplyForm] = useState({ name: 'Sarah Watkins', gradYear: '2026', position: '', note: '' });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySubmitted, setApplySubmitted]   = useState(false);

  // Sync filters → URL params
  useEffect(() => {
    const p: Record<string, string> = {};
    if (search) p.q = search;
    if (filterDiv !== 'All') p.division = filterDiv;
    if (filterState !== 'All') p.state = filterState;
    if (filterConf !== 'All') p.conference = filterConf;
    if (filterScholarship !== 'All') p.scholarship = filterScholarship;
    if (filterSize !== 'All') p.size = filterSize;
    setSearchParams(p, { replace: true });
  }, [search, filterDiv, filterState, filterConf, filterScholarship, filterSize, setSearchParams]);

  const filtered = mockPrograms.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.state.toLowerCase().includes(q) || p.conference.toLowerCase().includes(q);
    const matchDiv   = filterDiv === 'All' || p.division === filterDiv;
    const matchState = filterState === 'All' || p.state === filterState;
    const matchConf  = filterConf === 'All' || p.conference === filterConf;
    const matchSch   = filterScholarship === 'All' || (filterScholarship === 'Yes' ? p.hasScholarships : !p.hasScholarships);
    const matchSize  = filterSize === 'All' || p.programSize === filterSize;
    return matchQ && matchDiv && matchState && matchConf && matchSch && matchSize;
  });

  const savedPrograms  = mockPrograms.filter(p => savedSchools.has(p.id));
  const displayPrograms = activeTab === 'browse' ? filtered : savedPrograms;

  const toggleSave = (programId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = savedSchools.has(programId);
    setSavedSchools(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(programId); else next.add(programId);
      return next;
    });
    showNotification('success', isSaved ? 'Removed' : 'Saved', isSaved ? 'School removed from your list' : 'School saved to your list');
    // Best-effort persist — fire and forget, UI state is source of truth
    if (isSaved) {
      fetch(`/api/athletes/me/saved-schools/${programId}`, { method: 'DELETE' }).catch(() => {});
    } else {
      fetch('/api/athletes/me/saved-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: programId }),
      }).catch(() => {});
    }
  };

  const openCoachModal = (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    const coach = program.coachId ? (mockCoaches[program.coachId] ?? null) : null;
    setCoachModal({ open: true, coach, program });
    setShowMessageCompose(false);
    setMessageText('');
  };

  const closeCoachModal = () => {
    setCoachModal({ open: false, coach: null, program: null });
    setShowMessageCompose(false);
    setMessageText('');
  };

  const openApplyModal = (program: Program, e: React.MouseEvent) => {
    e.stopPropagation();
    setApplyModal({ open: true, program });
    setApplySubmitted(false);
    setApplyForm(prev => ({ ...prev, position: '', note: '' }));
  };

  const closeApplyModal = () => {
    setApplyModal({ open: false, program: null });
    setApplySubmitted(false);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !coachModal.coach) return;
    setMessageSending(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: coachModal.coach.id, initialMessage: messageText.trim() }),
      });
      if (!res.ok) throw new Error('send failed');
      showNotification('success', 'Message Sent', `Your message to ${coachModal.coach.name} has been delivered`);
      setShowMessageCompose(false);
      setMessageText('');
    } catch {
      showNotification('error', 'Failed to Send', 'Could not deliver your message. Please try again.');
    } finally {
      setMessageSending(false);
    }
  };

  const submitApplication = async () => {
    if (!applyModal.program || !applyForm.position) return;
    setApplySubmitting(true);
    try {
      const res = await fetch(`/api/programs/${applyModal.program.id}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteName: applyForm.name,
          gradYear: applyForm.gradYear,
          position: applyForm.position,
          note: applyForm.note,
        }),
      });
      if (!res.ok) throw new Error('submit failed');
      setAppliedPrograms(prev => new Set(prev).add(applyModal.program!.id));
      setApplySubmitted(true);
      showNotification('success', 'Interest Submitted!', `Your application to ${applyModal.program.name} has been sent`);
    } catch {
      showNotification('error', 'Submission Failed', 'Could not submit your application. Please try again.');
    } finally {
      setApplySubmitting(false);
    }
  };

  const sel: React.CSSProperties = {
    background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '8px 12px', color: '#ccc',
    fontSize: '0.8rem', outline: 'none', cursor: 'pointer', width: '100%',
  };

  const btnSecondary: React.CSSProperties = {
    background: 'rgba(255,90,45,0.1)', border: '1px solid rgba(255,90,45,0.2)',
    borderRadius: 7, color: '#ff5a2d', fontSize: '0.72rem', fontWeight: 700,
    padding: '8px 12px', cursor: 'pointer', letterSpacing: '0.05em', flex: 1,
    transition: 'all 0.15s',
  };

  const btnPrimary: React.CSSProperties = {
    background: '#ff5a2d', border: '1px solid #ff5a2d',
    borderRadius: 7, color: '#fff', fontSize: '0.72rem', fontWeight: 700,
    padding: '8px 12px', cursor: 'pointer', letterSpacing: '0.05em', flex: 1,
    transition: 'all 0.15s',
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
  };

  const modalStyle: React.CSSProperties = {
    background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 28, width: '90%', maxWidth: 520,
    maxHeight: '88vh', overflowY: 'auto', position: 'relative',
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          College Recruiting
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Explore flag football programs, connect with coaches, and apply to schools</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
        {(['browse', 'saved'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px', fontSize: '0.82rem', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: activeTab === tab ? '#ff5a2d' : '#555',
            borderBottom: activeTab === tab ? '2px solid #ff5a2d' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {tab === 'browse' ? 'Browse Programs' : `Saved Schools${savedSchools.size > 0 ? ` (${savedSchools.size})` : ''}`}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      {activeTab === 'browse' && (
        <div className="k-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
              <input
                type="text" placeholder="Search programs, schools, conferences..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px 10px 36px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: showFilters ? '#ff5a2d' : '#161616',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '10px 16px', color: showFilters ? '#fff' : '#888',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            }}>
              <Filter size={14} /> Filters
              <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>State</div>
                      <select value={filterState} onChange={e => setFilterState(e.target.value)} style={sel}>
                        {stateOptions.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Division</div>
                      <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} style={sel}>
                        {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Divisions' : d}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Conference</div>
                      <select value={filterConf} onChange={e => setFilterConf(e.target.value)} style={sel}>
                        {conferences.map(c => <option key={c} value={c}>{c === 'All' ? 'All Conferences' : c}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Scholarships</div>
                      <select value={filterScholarship} onChange={e => setFilterScholarship(e.target.value)} style={sel}>
                        <option value="All">Any</option>
                        <option value="Yes">Available</option>
                        <option value="No">Not Available</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Program Size</div>
                      <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={sel}>
                        {sizes.map(s => <option key={s} value={s}>{s === 'All' ? 'All Sizes' : s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button onClick={() => { setFilterDiv('All'); setFilterState('All'); setFilterConf('All'); setFilterScholarship('All'); setFilterSize('All'); setSearch(''); }}
                        style={{ ...sel, width: '100%', color: '#555', textAlign: 'center', letterSpacing: '0.04em' }}>
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Results meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.78rem', color: '#555' }}>
          Showing <span style={{ color: '#ccc', fontWeight: 600 }}>{displayPrograms.length}</span>{' '}
          {activeTab === 'browse' ? 'programs' : 'saved schools'}
        </span>
        {activeTab === 'browse' && (
          <span style={{ fontSize: '0.78rem', color: '#555' }}>
            {savedSchools.size} saved · {appliedPrograms.size} applied
          </span>
        )}
      </div>

      {/* Program Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {displayPrograms.map((program, i) => {
          const isSaved   = savedSchools.has(program.id);
          const isApplied = appliedPrograms.has(program.id);

          return (
            <motion.div key={program.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="k-card-hover" style={{ padding: '18px 18px 14px', position: 'relative' }}>

              {/* Save button */}
              <button onClick={e => toggleSave(program.id, e)} style={{
                position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
                cursor: 'pointer', color: isSaved ? '#ff5a2d' : '#333', padding: 4, transition: 'color 0.15s',
              }}>
                {isSaved
                  ? <BookmarkCheck size={16} fill="#ff5a2d" />
                  : <Bookmark size={16} />}
              </button>

              {/* School header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <ProgramAvatar name={program.name} />
                <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{program.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <MapPin size={11} color="#444" />
                    <span style={{ fontSize: '0.72rem', color: '#555' }}>{program.city}, {program.state}</span>
                  </div>
                </div>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>
                  {program.division}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#888', fontSize: '0.68rem', fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
                  {program.conference}
                </span>
                {program.hasScholarships && (
                  <span style={{ background: 'rgba(255,90,45,0.08)', color: '#ff5a2d', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Award size={10} /> Scholarship
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', background: '#0d0d0d', borderRadius: 8, overflow: 'hidden', marginBottom: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                {[
                  { label: 'Record', value: program.winRecord },
                  { label: 'Roster', value: `${program.athletesRecruited}` },
                  { label: 'Size', value: program.programSize },
                ].map(({ label, value }, idx, arr) => (
                  <div key={label} style={{ flex: 1, padding: '9px 6px', textAlign: 'center', borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ddd' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={e => openCoachModal(program, e)}
                  style={btnSecondary}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,90,45,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,90,45,0.1)'; }}>
                  VIEW COACH
                </button>
                <button
                  onClick={e => isApplied ? undefined : openApplyModal(program, e)}
                  style={isApplied
                    ? { ...btnSecondary, color: '#555', borderColor: 'rgba(255,255,255,0.08)', cursor: 'default', background: 'rgba(255,255,255,0.03)' }
                    : btnPrimary}
                  onMouseEnter={e => { if (!isApplied) e.currentTarget.style.background = '#e64a1f'; }}
                  onMouseLeave={e => { if (!isApplied) e.currentTarget.style.background = '#ff5a2d'; }}>
                  {isApplied ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> APPLIED
                    </span>
                  ) : 'APPLY'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty state */}
      {displayPrograms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
            {activeTab === 'saved' ? 'No saved schools yet' : 'No programs found'}
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            {activeTab === 'saved' ? 'Bookmark programs to save them here' : 'Try adjusting your filters'}
          </div>
        </div>
      )}

      {/* ── Coach Profile Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {coachModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={overlayStyle} onClick={closeCoachModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={modalStyle} onClick={e => e.stopPropagation()}>

              {/* Close */}
              <button onClick={closeCoachModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>
                <X size={18} />
              </button>

              {coachModal.coach ? (
                <>
                  {/* Coach header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(coachModal.coach.name)}`}
                      alt={coachModal.coach.name}
                      style={{ width: 56, height: 56, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{coachModal.coach.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#ff5a2d', fontWeight: 600, marginTop: 2 }}>{coachModal.coach.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{coachModal.coach.school} · {coachModal.coach.sport}</div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '10px 12px', background: '#0d0d0d', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <Mail size={14} color="#555" />
                    <span style={{ fontSize: '0.78rem', color: '#888' }}>{coachModal.coach.email}</span>
                  </div>

                  {/* Bio */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>About</div>
                    <p style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.6, margin: 0 }}>{coachModal.coach.bio}</p>
                  </div>

                  {/* Recruited athletes */}
                  {coachModal.coach.recruitedAthletes.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 8 }}>Recent Recruits</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {coachModal.coach.recruitedAthletes.map((a, i) => (
                          <span key={i} style={{ background: 'rgba(255,255,255,0.05)', color: '#888', fontSize: '0.7rem', padding: '4px 10px', borderRadius: 20 }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message compose */}
                  <AnimatePresence>
                    {showMessageCompose && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ paddingTop: 4 }}>
                          <textarea
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            placeholder={`Message ${coachModal.coach.name}...`}
                            rows={3}
                            style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={() => setShowMessageCompose(false)}
                              style={{ ...btnSecondary, flex: '0 0 auto', padding: '8px 16px' }}>
                              Cancel
                            </button>
                            <button onClick={sendMessage} disabled={messageSending || !messageText.trim()}
                              style={{ ...btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!messageText.trim() || messageSending) ? 0.5 : 1, cursor: (!messageText.trim() || messageSending) ? 'not-allowed' : 'pointer' }}>
                              <Send size={13} /> {messageSending ? 'Sending...' : 'Send Message'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Modal actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowMessageCompose(s => !s)}
                      style={btnSecondary}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,90,45,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,90,45,0.1)'; }}>
                      MESSAGE COACH
                    </button>
                    {coachModal.program && (
                      <button
                        onClick={e => { closeCoachModal(); openApplyModal(coachModal.program!, e); }}
                        disabled={appliedPrograms.has(coachModal.program.id)}
                        style={appliedPrograms.has(coachModal.program.id)
                          ? { ...btnSecondary, color: '#555', borderColor: 'rgba(255,255,255,0.08)', cursor: 'default', background: 'rgba(255,255,255,0.03)' }
                          : btnPrimary}
                        onMouseEnter={e => { if (!appliedPrograms.has(coachModal.program!.id)) e.currentTarget.style.background = '#e64a1f'; }}
                        onMouseLeave={e => { if (!appliedPrograms.has(coachModal.program!.id)) e.currentTarget.style.background = '#ff5a2d'; }}>
                        {appliedPrograms.has(coachModal.program.id)
                          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><CheckCircle2 size={12} /> APPLIED</span>
                          : 'APPLY NOW'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* No coach assigned */
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Users size={22} color="#444" />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#555', marginBottom: 6 }}>No Coach Assigned</div>
                  <p style={{ fontSize: '0.8rem', color: '#444', margin: 0 }}>This program has not yet listed a coach. Check back later or apply directly.</p>
                  {coachModal.program && (
                    <button
                      onClick={e => { closeCoachModal(); openApplyModal(coachModal.program!, e); }}
                      style={{ ...btnPrimary, marginTop: 20, display: 'inline-block', flex: 'none' }}>
                      APPLY ANYWAY
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apply / Express Interest Modal ─────────────────────── */}
      <AnimatePresence>
        {applyModal.open && applyModal.program && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={overlayStyle} onClick={closeApplyModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={modalStyle} onClick={e => e.stopPropagation()}>

              <button onClick={closeApplyModal} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}>
                <X size={18} />
              </button>

              {applySubmitted ? (
                /* Success state */
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,90,45,0.12)', border: '1px solid rgba(255,90,45,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={26} color="#ff5a2d" />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: 6, textTransform: 'uppercase' }}>Interest Submitted!</div>
                  <p style={{ fontSize: '0.82rem', color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>
                    Your application to <span style={{ color: '#fff', fontWeight: 600 }}>{applyModal.program.name}</span> has been received. The coaching staff will be in touch.
                  </p>
                  <button onClick={closeApplyModal} style={{ ...btnPrimary, flex: 'none', display: 'inline-block', padding: '10px 28px' }}>
                    DONE
                  </button>
                </div>
              ) : (
                /* Form */
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff5a2d', marginBottom: 4 }}>Express Interest</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{applyModal.program.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{applyModal.program.division} · {applyModal.program.conference}</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>Your Name</label>
                      <input
                        value={applyForm.name}
                        onChange={e => setApplyForm(f => ({ ...f, name: e.target.value }))}
                        style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>Grad Year</label>
                        <input
                          value={applyForm.gradYear}
                          onChange={e => setApplyForm(f => ({ ...f, gradYear: e.target.value }))}
                          style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>Position <span style={{ color: '#ff5a2d' }}>*</span></label>
                        <select value={applyForm.position} onChange={e => setApplyForm(f => ({ ...f, position: e.target.value }))}
                          style={{ ...sel, width: '100%', padding: '10px 12px', color: applyForm.position ? '#fff' : '#555' }}>
                          <option value="">Select...</option>
                          {positions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>Note to Coach <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                      <textarea
                        value={applyForm.note}
                        onChange={e => setApplyForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Tell the coach why you're interested in their program..."
                        rows={3}
                        style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button onClick={closeApplyModal} style={{ ...btnSecondary, flex: '0 0 auto', padding: '10px 20px' }}>
                      Cancel
                    </button>
                    <button
                      onClick={submitApplication}
                      disabled={applySubmitting || !applyForm.position || !applyForm.name.trim()}
                      style={{ ...btnPrimary, flex: 1, opacity: (applySubmitting || !applyForm.position || !applyForm.name.trim()) ? 0.5 : 1, cursor: (applySubmitting || !applyForm.position || !applyForm.name.trim()) ? 'not-allowed' : 'pointer' }}>
                      {applySubmitting ? 'Submitting...' : 'SUBMIT INTEREST'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
