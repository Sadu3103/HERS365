import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bookmark, BookmarkCheck, X, Send,
  Award, Mail, ChevronDown, CheckCircle2, Phone,
  RefreshCw, ExternalLink, Users, MapPin, GraduationCap,
  ClipboardList, TrendingUp, Layers, Clock, AlertCircle,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StaffMember {
  id?: number;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
}

interface School {
  id: number;
  name: string;
  website: string;
  websiteUrl?: string;
  fetched?: boolean;
  division?: string | null;
  conference?: string | null;
  city?: string | null;
  state?: string | null;
  hasScholarships?: boolean | null;
  staff?: StaffMember[];
  staffCount?: number;
  lastScrapedAt?: string | null;
  // detail-only fields (loaded in modal)
  minGpa?: string | null;
  rosterNeeds?: { positions: string[]; notes: string | null } | null;
  athleticBenchmarks?: Record<string, string> | null;
  eligibilityNotes?: string | null;
  majorsList?: string[] | null;
  graduationRate?: string | null;
  studentAthleteSupportNotes?: string | null;
}

interface CoachStaff {
  id: number;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  school: string;
  schoolId: number;
  website: string | null;
}

interface Scholarship {
  id: number;
  name: string;
  amount: number;
  deadline: string;
  requirements: string | null;
  category: string | null;
  eligibleStates: string | null;
}

interface Application {
  id: number;
  programId: number;
  programName: string | null;
  position: string;
  note: string | null;
  status: string;
  createdAt: string;
}

// ── Shared UI ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, background: 'rgba(255,90,45,0.12)',
      border: '1px solid rgba(255,90,45,0.25)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: size * 0.36, color: '#ff5a2d' }}>
        {name.split(' ').filter(w => w[0] === w[0]?.toUpperCase()).map(w => w[0]).slice(0, 2).join('')}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    reviewed: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    accepted: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  };
  const s = map[status] || { color: '#666', bg: 'rgba(255,255,255,0.05)' };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {status}
    </span>
  );
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const days = useMemo(() => Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / 86400000), [deadline]);
  const urgent = days >= 0 && days <= 30;
  const past = days < 0;
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4,
      color: past ? '#666' : urgent ? '#ef4444' : '#f59e0b',
      background: past ? 'rgba(255,255,255,0.04)' : urgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
    }}>
      <Clock size={9} />
      {past ? 'Closed' : days === 0 ? 'Due today' : `${days}d left`}
    </span>
  );
}

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'LB', 'DB'];
const TABS = [
  { key: 'programs',     label: 'Programs',       icon: Layers },
  { key: 'coaches',      label: 'Coaches',        icon: Users },
  { key: 'scholarships', label: 'Scholarships',   icon: Award },
  { key: 'applications', label: 'My Applications', icon: ClipboardList },
  { key: 'insights',     label: 'Insights',       icon: TrendingUp },
] as const;

type Tab = typeof TABS[number]['key'];

// ── Styles ─────────────────────────────────────────────────────────────────────

const sel: React.CSSProperties = {
  background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, padding: '8px 12px', color: '#ccc',
  fontSize: '0.8rem', outline: 'none', cursor: 'pointer', width: '100%',
};
const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,90,45,0.1)', border: '1px solid rgba(255,90,45,0.2)',
  borderRadius: 7, color: '#ff5a2d', fontSize: '0.72rem', fontWeight: 700,
  padding: '8px 12px', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s',
};
const btnPrimary: React.CSSProperties = {
  background: '#ff5a2d', border: '1px solid #ff5a2d',
  borderRadius: 7, color: '#fff', fontSize: '0.72rem', fontWeight: 700,
  padding: '8px 12px', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s',
};
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
};
const modal: React.CSSProperties = {
  background: '#111', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16, padding: 28, width: '90%', maxWidth: 520,
  maxHeight: '88vh', overflowY: 'auto', position: 'relative',
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const Recruiting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showNotification } = useNotifications();
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'programs');

  // Programs state
  const [schools, setSchools]           = useState<School[]>([]);
  const [savedIds, setSavedIds]         = useState<Set<number>>(new Set());
  const [appliedIds, setAppliedIds]     = useState<Set<number>>(new Set());
  const [fetchingId, setFetchingId]     = useState<number | null>(null);
  const [fetchingAll, setFetchingAll]   = useState(false);
  const [expandedId, setExpandedId]     = useState<number | null>(null);
  const [savedOnly, setSavedOnly]       = useState(false);
  const [search, setSearch]             = useState(searchParams.get('q') || '');
  const [filterDiv, setFilterDiv]       = useState('All');
  const [filterState, setFilterState]   = useState('All');
  const [showFilters, setShowFilters]   = useState(false);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);

  // Detail modal
  const [detailSchool, setDetailSchool]         = useState<School | null>(null);
  const [detailTab, setDetailTab]               = useState<'overview' | 'staff' | 'requirements' | 'campus'>('overview');
  const [detailLoading, setDetailLoading]       = useState(false);

  // Apply modal
  const [applyTarget, setApplyTarget]       = useState<School | null>(null);
  const [applyForm, setApplyForm]           = useState({ gradYear: '', position: '', note: '' });
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySubmitted, setApplySubmitted]   = useState(false);

  // Message modal
  const [messageTarget, setMessageTarget]   = useState<(StaffMember & { school: string }) | null>(null);
  const [messageText, setMessageText]       = useState('');
  const [messageSending, setMessageSending] = useState(false);

  // Coaches state
  const [coachList, setCoachList]         = useState<CoachStaff[]>([]);
  const [coachSearch, setCoachSearch]     = useState('');
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [coachesFetched, setCoachesFetched] = useState(false);

  // Scholarships state
  const [scholarships, setScholarships]     = useState<Scholarship[]>([]);
  const [savedScholarshipIds, setSavedScholarshipIds] = useState<Set<number>>(new Set());
  const [scholarshipsLoading, setScholarshipsLoading] = useState(false);
  const [scholarshipsFetched, setScholarshipsFetched] = useState(false);

  // Applications state
  const [applications, setApplications]   = useState<Application[]>([]);
  const [appsLoading, setAppsLoading]     = useState(false);
  const [appsFetched, setAppsFetched]     = useState(false);

  // ── Data Loaders ──────────────────────────────────────────────────────────────

  const loadSchools = useCallback(async () => {
    try {
      const res = await fetch('/api/programs');
      const json = await res.json();
      if (json.success) {
        setSchools(json.data);
        setServerAvailable(true);
      }
    } catch {
      setServerAvailable(false);
    }
  }, []);

  const loadSavedIds = useCallback(async () => {
    if (!user?.id || !token) return;
    try {
      const res = await fetch(`/api/athletes/${user.id}/saved-schools`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setSavedIds(new Set(json.data as number[]));
    } catch { /* non-fatal */ }
  }, [user?.id, token]);

  const loadCoaches = useCallback(async () => {
    if (coachesFetched) return;
    setCoachesLoading(true);
    try {
      const res = await fetch('/api/coaches');
      const json = await res.json();
      if (json.success) { setCoachList(json.data); setCoachesFetched(true); }
    } catch { /* non-fatal */ }
    finally { setCoachesLoading(false); }
  }, [coachesFetched]);

  const loadScholarships = useCallback(async () => {
    if (scholarshipsFetched) return;
    setScholarshipsLoading(true);
    try {
      const res = await fetch('/api/scholarships');
      const json = await res.json();
      if (json.success) { setScholarships(json.data); setScholarshipsFetched(true); }
      if (user?.id && token) {
        const savedRes = await fetch('/api/scholarships/saved', { headers: { Authorization: `Bearer ${token}` } });
        const savedJson = await savedRes.json();
        if (savedJson.success) setSavedScholarshipIds(new Set(savedJson.data as number[]));
      }
    } catch { /* non-fatal */ }
    finally { setScholarshipsLoading(false); }
  }, [scholarshipsFetched, user?.id, token]);

  const loadApplications = useCallback(async () => {
    if (appsFetched || !user?.id || !token) return;
    setAppsLoading(true);
    try {
      const res = await fetch(`/api/athletes/${user.id}/applications`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
        setAppliedIds(new Set(json.data.map((a: Application) => a.programId)));
        setAppsFetched(true);
      }
    } catch { /* non-fatal */ }
    finally { setAppsLoading(false); }
  }, [appsFetched, user?.id, token]);

  useEffect(() => { loadSchools(); loadSavedIds(); }, [loadSchools, loadSavedIds]);

  useEffect(() => {
    if (activeTab === 'coaches') loadCoaches();
    if (activeTab === 'scholarships') loadScholarships();
    if (activeTab === 'applications') loadApplications();
  }, [activeTab, loadCoaches, loadScholarships, loadApplications]);

  // Sync tab + search to URL
  useEffect(() => {
    const p: Record<string, string> = {};
    if (activeTab !== 'programs') p.tab = activeTab;
    if (search) p.q = search;
    setSearchParams(p, { replace: true });
  }, [activeTab, search, setSearchParams]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const fetchOne = async (school: School) => {
    if (fetchingId !== null || fetchingAll) return;
    setFetchingId(school.id);
    try {
      const res = await fetch('/api/programs/fetch-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id }),
      });
      const json = await res.json();
      if (json.success) {
        setSchools(prev => prev.map(s => s.id === school.id ? { ...s, ...json.data, fetched: true } : s));
        setExpandedId(school.id);
        showNotification('success', 'Loaded', `${school.name}: found ${json.data.staff?.length ?? 0} staff`);
      } else {
        showNotification('error', 'Fetch Failed', json.error || 'Could not load data.');
      }
    } catch {
      showNotification('error', 'Fetch Failed', 'Could not reach the server.');
    } finally {
      setFetchingId(null);
    }
  };

  const fetchAll = async () => {
    if (fetchingAll || fetchingId !== null) return;
    setFetchingAll(true);
    try {
      await fetch('/api/programs/fetch-all', { method: 'POST' });
      const poll = setInterval(async () => {
        const res = await fetch('/api/programs').catch(() => null);
        if (!res) return;
        const json = await res.json();
        if (json.success) {
          setSchools(json.data);
          if (json.data.every((s: School) => s.fetched)) {
            clearInterval(poll);
            setFetchingAll(false);
            showNotification('success', 'All Schools Loaded', `Fetched data for ${json.data.length} programs`);
          }
        }
      }, 3000);
      setTimeout(() => { clearInterval(poll); setFetchingAll(false); }, 5 * 60 * 1000);
    } catch {
      setFetchingAll(false);
      showNotification('error', 'Fetch All Failed', 'Could not reach the server.');
    }
  };

  const toggleSave = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id || !token) { showNotification('info', 'Sign In Required', 'Log in to save programs.'); return; }
    const was = savedIds.has(id);
    setSavedIds(prev => { const n = new Set(prev); if (was) n.delete(id); else n.add(id); return n; });
    const url = `/api/athletes/${user.id}/saved-schools${was ? `/${id}` : ''}`;
    try {
      await fetch(url, {
        method: was ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: was ? undefined : JSON.stringify({ schoolId: id }),
      });
      showNotification('success', was ? 'Removed' : 'Saved', was ? 'Removed from saved' : 'Saved to your list');
    } catch {
      setSavedIds(prev => { const n = new Set(prev); if (was) n.add(id); else n.delete(id); return n; });
    }
  };

  const openDetail = async (school: School) => {
    setDetailSchool(school);
    setDetailTab('overview');
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/programs/${school.id}`);
      const json = await res.json();
      if (json.success) setDetailSchool(json.data);
    } catch { /* use existing data */ }
    finally { setDetailLoading(false); }
  };

  const submitApplication = async () => {
    if (!applyTarget || !applyForm.position) return;
    if (!user?.id || !token) { showNotification('info', 'Sign In Required', 'Log in to apply to programs.'); return; }
    setApplySubmitting(true);
    try {
      const res = await fetch(`/api/programs/${applyTarget.id}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ position: applyForm.position, note: applyForm.note }),
      });
      const json = await res.json();
      if (res.status === 409) {
        showNotification('info', 'Already Applied', 'You have already submitted interest to this program.');
        setApplyTarget(null);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'failed');
      setAppliedIds(prev => new Set(prev).add(applyTarget.id));
      setApplySubmitted(true);
      setAppsFetched(false); // force reload
      showNotification('success', 'Interest Submitted!', `Your application to ${applyTarget.name} has been sent`);
    } catch {
      showNotification('error', 'Submission Failed', 'Could not submit. Please try again.');
    } finally {
      setApplySubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !messageTarget) return;
    setMessageSending(true);
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ recipientName: messageTarget.name, initialMessage: messageText.trim() }),
      });
      if (!res.ok) throw new Error();
      showNotification('success', 'Message Sent', `Message to ${messageTarget.name} delivered`);
      setMessageTarget(null);
      setMessageText('');
    } catch {
      showNotification('error', 'Failed to Send', 'Could not deliver your message. Try again.');
    } finally {
      setMessageSending(false);
    }
  };

  const toggleSaveScholarship = async (id: number) => {
    if (!user?.id || !token) { showNotification('info', 'Sign In Required', 'Log in to save scholarships.'); return; }
    const was = savedScholarshipIds.has(id);
    setSavedScholarshipIds(prev => { const n = new Set(prev); if (was) n.delete(id); else n.add(id); return n; });
    try {
      await fetch(`/api/scholarships/${id}/save`, {
        method: was ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setSavedScholarshipIds(prev => { const n = new Set(prev); if (was) n.add(id); else n.delete(id); return n; });
    }
  };

  // ── Derived State ──────────────────────────────────────────────────────────────

  const divisions = ['All', ...Array.from(new Set(schools.map(s => s.division).filter(Boolean))) as string[]].sort();
  const states    = ['All', ...Array.from(new Set(schools.map(s => s.state).filter(Boolean))) as string[]].sort();
  const fetchedCount = schools.filter(s => s.fetched).length;

  const filtered = schools.filter(s => {
    const q = search.toLowerCase();
    const matchQ  = !q || s.name.toLowerCase().includes(q) || (s.state || '').toLowerCase().includes(q) || (s.conference || '').toLowerCase().includes(q);
    const matchD  = filterDiv === 'All' || s.division === filterDiv;
    const matchSt = filterState === 'All' || s.state === filterState;
    return matchQ && matchD && matchSt;
  });
  const displaySchools = savedOnly ? filtered.filter(s => savedIds.has(s.id)) : filtered;

  const filteredCoaches = coachSearch
    ? coachList.filter(m =>
        m.name.toLowerCase().includes(coachSearch.toLowerCase()) ||
        m.school.toLowerCase().includes(coachSearch.toLowerCase()) ||
        m.title.toLowerCase().includes(coachSearch.toLowerCase())
      )
    : coachList;

  // ── Tab Nav ────────────────────────────────────────────────────────────────────

  const switchTab = (key: Tab) => {
    setActiveTab(key);
    setSearch('');
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          College Recruiting
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Explore flag football programs and connect with coaches</p>
      </div>

      {/* Server not running banner */}
      {serverAvailable === false && (
        <div style={{ background: 'rgba(255,90,45,0.08)', border: '1px solid rgba(255,90,45,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: '0.8rem', color: '#888' }}>
          <span style={{ color: '#ff5a2d', fontWeight: 700 }}>Backend not running.</span> Start it to fetch real program data:
          <code style={{ display: 'block', marginTop: 6, background: '#0d0d0d', padding: '6px 10px', borderRadius: 6, color: '#ccc', fontSize: '0.75rem' }}>
            cd server &amp;&amp; npm run dev:core
          </code>
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => switchTab(key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 16px', fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
            color: activeTab === key ? '#ff5a2d' : '#444',
            borderBottom: activeTab === key ? '2px solid #ff5a2d' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── PROGRAMS TAB ── */}
      {activeTab === 'programs' && (
        <>
          {/* Search + filters */}
          <div className="k-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
                <input type="text" placeholder="Search programs, schools, conferences…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px 10px 36px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={() => setShowFilters(f => !f)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: showFilters ? 'rgba(255,90,45,0.15)' : '#161616',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                padding: '10px 14px', color: showFilters ? '#ff5a2d' : '#666',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}>
                Filters <ChevronDown size={13} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              <button onClick={() => setSavedOnly(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: savedOnly ? 'rgba(255,90,45,0.15)' : '#161616',
                border: `1px solid ${savedOnly ? 'rgba(255,90,45,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8, padding: '10px 14px',
                color: savedOnly ? '#ff5a2d' : '#666', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}>
                <Bookmark size={13} fill={savedOnly ? '#ff5a2d' : 'none'} /> Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ''}
              </button>
              <button onClick={fetchAll} disabled={fetchingAll || fetchingId !== null || !serverAvailable} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,90,45,0.1)', border: '1px solid rgba(255,90,45,0.2)',
                borderRadius: 8, padding: '10px 14px', color: '#ff5a2d',
                fontSize: '0.8rem', fontWeight: 700, cursor: (fetchingAll || !serverAvailable) ? 'not-allowed' : 'pointer',
                opacity: !serverAvailable ? 0.4 : 1, letterSpacing: '0.04em',
              }}>
                <RefreshCw size={13} style={{ animation: fetchingAll ? 'spin 1s linear infinite' : 'none' }} />
                {fetchingAll ? `Fetching… ${fetchedCount}/${schools.length}` : 'Fetch All'}
              </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>Division</div>
                      <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} style={sel}>
                        {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Divisions' : d}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#444', textTransform: 'uppercase', marginBottom: 5 }}>State</div>
                      <select value={filterState} onChange={e => setFilterState(e.target.value)} style={sel}>
                        {states.map(s => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button onClick={() => { setFilterDiv('All'); setFilterState('All'); setSearch(''); setSavedOnly(false); }} style={{ ...sel, color: '#555', textAlign: 'center' }}>Clear</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#555' }}>
              <span style={{ color: '#ccc', fontWeight: 600 }}>{displaySchools.length}</span> programs
              {fetchedCount > 0 && <span style={{ color: '#444' }}> · {fetchedCount} with live data</span>}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#444' }}>
              {savedIds.size} saved · {appliedIds.size} applied
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {displaySchools.map((school, i) => {
              const isSaved    = savedIds.has(school.id);
              const isApplied  = appliedIds.has(school.id);
              const isFetching = fetchingId === school.id;
              const isExpanded = expandedId === school.id;
              const staff      = school.staff ?? [];
              const headCoach  = staff.find(m => m.title?.toLowerCase().includes('head'));

              return (
                <motion.div key={school.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="k-card-hover" style={{ padding: '18px 18px 14px', position: 'relative' }}>

                  <button onClick={e => toggleSave(school.id, e)} style={{
                    position: 'absolute', top: 14, right: 14, background: 'none', border: 'none',
                    cursor: 'pointer', color: isSaved ? '#ff5a2d' : '#333', padding: 4, transition: 'color 0.15s',
                  }}>
                    {isSaved ? <BookmarkCheck size={16} fill="#ff5a2d" /> : <Bookmark size={16} />}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingRight: 28 }}>
                    <Avatar name={school.name} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{school.name}</div>
                      {(school.city || school.state) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <MapPin size={11} color="#444" />
                          <span style={{ fontSize: '0.72rem', color: '#555' }}>{[school.city, school.state].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : (
                        <a href={school.website} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '0.68rem', color: '#333', display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, textDecoration: 'none' }}>
                          <ExternalLink size={9} /> Athletics page
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                    {school.division && (
                      <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
                        {school.division}
                      </span>
                    )}
                    {school.conference && (
                      <span style={{ background: 'rgba(255,255,255,0.05)', color: '#777', fontSize: '0.64rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                        {school.conference}
                      </span>
                    )}
                    {school.hasScholarships === true && (
                      <span style={{ background: 'rgba(255,90,45,0.08)', color: '#ff5a2d', fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Award size={9} /> Scholarship
                      </span>
                    )}
                    {school.hasScholarships === false && (
                      <span style={{ background: 'rgba(255,255,255,0.04)', color: '#444', fontSize: '0.64rem', fontWeight: 600, padding: '2px 7px', borderRadius: 4 }}>
                        No Scholarship
                      </span>
                    )}
                  </div>

                  {headCoach && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#0d0d0d', borderRadius: 7, border: '1px solid rgba(255,255,255,0.04)', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#ccc' }}>{headCoach.name}</div>
                        <div style={{ fontSize: '0.64rem', color: '#555', marginTop: 1 }}>{headCoach.title}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {headCoach.email && <a href={`mailto:${headCoach.email}`} title={headCoach.email} onClick={e => e.stopPropagation()} style={{ color: '#444' }}><Mail size={13} /></a>}
                        {headCoach.phone && <a href={`tel:${headCoach.phone}`} title={headCoach.phone} onClick={e => e.stopPropagation()} style={{ color: '#444' }}><Phone size={13} /></a>}
                        <button onClick={() => { setMessageTarget({ ...headCoach, school: school.name }); setMessageText(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5a2d', padding: 0 }}>
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && staff.filter(m => m !== headCoach).length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                          {staff.filter(m => m !== headCoach).map((m, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#0d0d0d', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div>
                                <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#bbb' }}>{m.name}</div>
                                <div style={{ fontSize: '0.62rem', color: '#555', marginTop: 1 }}>{m.title}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {m.email && <a href={`mailto:${m.email}`} title={m.email} onClick={e => e.stopPropagation()} style={{ color: '#444' }}><Mail size={12} /></a>}
                                {m.phone && <a href={`tel:${m.phone}`} title={m.phone} onClick={e => e.stopPropagation()} style={{ color: '#444' }}><Phone size={12} /></a>}
                                <button onClick={() => { setMessageTarget({ ...m, school: school.name }); setMessageText(''); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5a2d', padding: 0 }}>
                                  <Send size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {school.fetched && staff.length > 1 && (
                    <button onClick={() => setExpandedId(isExpanded ? null : school.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '0.68rem', padding: '2px 0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} />
                      {isExpanded ? 'Hide staff' : `View all ${staff.length} staff`}
                    </button>
                  )}

                  {!school.fetched && (
                    <div style={{ fontSize: '0.7rem', color: '#333', marginBottom: 10 }}>
                      No live data yet — click Fetch to load real staff from this school's athletics page.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => fetchOne(school)} disabled={isFetching || fetchingId !== null || !serverAvailable}
                      style={{ ...btnSecondary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: (fetchingId !== null && !isFetching) || !serverAvailable ? 0.4 : 1, cursor: (isFetching || fetchingId !== null || !serverAvailable) ? 'not-allowed' : 'pointer' }}>
                      <RefreshCw size={11} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} />
                      {isFetching ? 'Fetching…' : school.fetched ? 'Re-fetch' : 'Fetch'}
                    </button>
                    <button onClick={() => openDetail(school)}
                      style={{ ...btnSecondary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <GraduationCap size={11} /> Details
                    </button>
                    <button onClick={e => { e.stopPropagation(); if (!isApplied) { setApplyTarget(school); setApplySubmitted(false); setApplyForm({ gradYear: '', position: '', note: '' }); } }}
                      style={isApplied
                        ? { ...btnSecondary, flex: 1, color: '#555', borderColor: 'rgba(255,255,255,0.06)', cursor: 'default', background: 'rgba(255,255,255,0.03)' }
                        : { ...btnPrimary, flex: 1 }}>
                      {isApplied
                        ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><CheckCircle2 size={12} /> Applied</span>
                        : 'Apply'}
                    </button>
                  </div>

                  {school.lastScrapedAt && (
                    <div style={{ fontSize: '0.58rem', color: '#2a2a2a', marginTop: 6, textAlign: 'right' }}>
                      Updated {new Date(school.lastScrapedAt).toLocaleDateString()}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {displaySchools.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
                {savedOnly ? 'No saved schools yet' : 'No programs found'}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                {savedOnly ? 'Bookmark programs to save them here' : 'Try adjusting your search'}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── COACHES TAB ── */}
      {activeTab === 'coaches' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search by coach name, title, or school…"
                value={coachSearch} onChange={e => setCoachSearch(e.target.value)}
                style={{ width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px 10px 36px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {coachesLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
              <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontSize: '0.85rem' }}>Loading coaching staff…</div>
            </div>
          )}

          {!coachesLoading && coachesFetched && filteredCoaches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
              <Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>
                No coaches loaded yet
              </div>
              <p style={{ fontSize: '0.82rem', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Use the Fetch button on program cards in the Programs tab to load real coaching staff from each school's athletics page.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {filteredCoaches.map((coach, i) => (
              <motion.div key={coach.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="k-card-hover" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={coach.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{coach.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 1 }}>{coach.title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#ff5a2d', marginTop: 2, fontWeight: 600 }}>{coach.school}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    {coach.email && <a href={`mailto:${coach.email}`} title={coach.email} style={{ color: '#444' }}><Mail size={14} /></a>}
                    {coach.phone && <a href={`tel:${coach.phone}`} title={coach.phone} style={{ color: '#444' }}><Phone size={14} /></a>}
                    <button onClick={() => { setMessageTarget({ ...coach, school: coach.school }); setMessageText(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5a2d', padding: 0 }}>
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {!coachesLoading && coachesFetched && filteredCoaches.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: '#333', marginTop: 16, textAlign: 'center' }}>
              {filteredCoaches.length} staff members from {new Set(filteredCoaches.map(c => c.schoolId)).size} programs
            </div>
          )}
        </div>
      )}

      {/* ── SCHOLARSHIPS TAB ── */}
      {activeTab === 'scholarships' && (
        <div>
          {scholarshipsLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
              <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontSize: '0.85rem' }}>Loading scholarships…</div>
            </div>
          )}

          {!scholarshipsLoading && scholarshipsFetched && scholarships.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
              <Award size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>
                No scholarships listed yet
              </div>
              <p style={{ fontSize: '0.82rem', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                Scholarship opportunities will appear here once they've been added by an administrator.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scholarships.map((s, i) => {
              const isSaved = savedScholarshipIds.has(s.id);
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="k-card-hover" style={{ padding: 18, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{s.name}</span>
                      {s.category && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,90,45,0.1)', color: '#ff5a2d' }}>{s.category}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ff5a2d' }}>
                        ${s.amount.toLocaleString()}
                      </span>
                      <DeadlineBadge deadline={s.deadline} />
                      {s.eligibleStates && (
                        <span style={{ fontSize: '0.62rem', color: '#555', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={9} /> {s.eligibleStates}
                        </span>
                      )}
                    </div>
                    {s.requirements && (
                      <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5, margin: 0 }}>{s.requirements}</p>
                    )}
                  </div>
                  <button onClick={() => toggleSaveScholarship(s.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: isSaved ? '#ff5a2d' : '#333', padding: 4, flexShrink: 0, transition: 'color 0.15s',
                  }}>
                    {isSaved ? <BookmarkCheck size={18} fill="#ff5a2d" /> : <Bookmark size={18} />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MY APPLICATIONS TAB ── */}
      {activeTab === 'applications' && (
        <div>
          {!user && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
              <AlertCircle size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>Sign in to view applications</div>
              <p style={{ fontSize: '0.82rem' }}>Log into your athlete account to track your recruiting applications.</p>
            </div>
          )}

          {user && appsLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
              <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
              <div style={{ fontSize: '0.85rem' }}>Loading applications…</div>
            </div>
          )}

          {user && !appsLoading && appsFetched && applications.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
              <ClipboardList size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>No applications yet</div>
              <p style={{ fontSize: '0.82rem' }}>Go to the Programs tab and click Apply on any program to express your interest.</p>
            </div>
          )}

          {user && !appsLoading && applications.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {applications.map((app, i) => (
                <motion.div key={app.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="k-card-hover" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>{app.programName || `Program #${app.programId}`}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>Position: <span style={{ color: '#ccc', fontWeight: 600 }}>{app.position}</span></span>
                        <span style={{ fontSize: '0.7rem', color: '#444' }}>
                          Applied {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {app.note && <p style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5, margin: 0 }}>{app.note}</p>}
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS TAB ── */}
      {activeTab === 'insights' && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <TrendingUp size={40} style={{ color: '#ff5a2d', opacity: 0.4, marginBottom: 16 }} />
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', color: '#fff', marginBottom: 8 }}>
            Recruiting Insights
          </div>
          <p style={{ fontSize: '0.85rem', color: '#555', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            Profile view tracking, program match recommendations, and recruiting analytics are coming soon.
            Complete your athlete profile to get personalized program suggestions.
          </p>
        </div>
      )}

      {/* ── Program Detail Modal ── */}
      <AnimatePresence>
        {detailSchool && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlay} onClick={() => setDetailSchool(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ ...modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setDetailSchool(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}><X size={18} /></button>

              {/* Modal header */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                <Avatar name={detailSchool.name} size={48} />
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{detailSchool.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>
                    {[detailSchool.city, detailSchool.state].filter(Boolean).join(', ')}
                    {detailSchool.division && <span style={{ marginLeft: 8, color: '#ff5a2d', fontWeight: 700 }}>{detailSchool.division}</span>}
                  </div>
                  <a href={detailSchool.website || detailSchool.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.68rem', color: '#333', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, textDecoration: 'none' }}>
                    <ExternalLink size={9} /> Athletics page
                  </a>
                </div>
              </div>

              {/* Detail inner tabs */}
              <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 }}>
                {(['overview', 'staff', 'requirements', 'campus'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                    color: detailTab === t ? '#ff5a2d' : '#444',
                    borderBottom: detailTab === t ? '2px solid #ff5a2d' : '2px solid transparent', transition: 'all 0.15s',
                  }}>{t}</button>
                ))}
              </div>

              {detailLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#444' }}>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}

              {!detailLoading && detailTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Division', value: detailSchool.division },
                    { label: 'Conference', value: detailSchool.conference },
                    { label: 'Location', value: [detailSchool.city, detailSchool.state].filter(Boolean).join(', ') || null },
                    { label: 'Scholarships', value: detailSchool.hasScholarships === true ? 'Available' : detailSchool.hasScholarships === false ? 'Not available' : null },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0d0d0d', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: '0.75rem', color: value ? '#ccc' : '#2a2a2a', fontStyle: value ? 'normal' : 'italic' }}>
                        {value || 'Not yet available'}
                      </span>
                    </div>
                  ))}
                  {detailSchool.lastScrapedAt && (
                    <div style={{ fontSize: '0.62rem', color: '#2a2a2a', textAlign: 'right' }}>
                      Data scraped {new Date(detailSchool.lastScrapedAt).toLocaleDateString()}
                    </div>
                  )}
                  {!detailSchool.fetched && (
                    <div style={{ padding: '10px 14px', background: 'rgba(255,90,45,0.05)', borderRadius: 8, border: '1px solid rgba(255,90,45,0.1)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>Click <strong style={{ color: '#ff5a2d' }}>Fetch</strong> on the program card to load real-time data from this school's athletics page.</div>
                    </div>
                  )}
                </div>
              )}

              {!detailLoading && detailTab === 'staff' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(detailSchool.staff || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#444' }}>
                      <Users size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
                      <div style={{ fontSize: '0.82rem' }}>No staff loaded yet — use the Fetch button to retrieve real staff from the school's athletics page.</div>
                    </div>
                  ) : (
                    (detailSchool.staff || []).map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0d0d0d', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={m.name} size={34} />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ccc' }}>{m.name}</div>
                            <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 1 }}>{m.title}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {m.email && <a href={`mailto:${m.email}`} title={m.email} style={{ color: '#444' }}><Mail size={14} /></a>}
                          {m.phone && <a href={`tel:${m.phone}`} title={m.phone} style={{ color: '#444' }}><Phone size={14} /></a>}
                          <button onClick={() => { setDetailSchool(null); setMessageTarget({ ...m, school: detailSchool.name }); setMessageText(''); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff5a2d', padding: 0 }}>
                            <Send size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!detailLoading && detailTab === 'requirements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Minimum GPA', value: detailSchool.minGpa },
                    { label: 'Eligibility Notes', value: detailSchool.eligibilityNotes },
                    { label: 'Roster Needs', value: detailSchool.rosterNeeds?.positions?.join(', ') || null },
                    { label: 'Roster Notes', value: detailSchool.rosterNeeds?.notes || null },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '10px 14px', background: '#0d0d0d', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: '0.78rem', color: value ? '#ccc' : '#2a2a2a', fontStyle: value ? 'normal' : 'italic' }}>
                        {value || 'Not yet available'}
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: '10px 14px', background: 'rgba(255,90,45,0.04)', borderRadius: 8, border: '1px solid rgba(255,90,45,0.08)', fontSize: '0.72rem', color: '#555' }}>
                    Requirements data is populated when an admin runs an expanded refresh for this program.
                  </div>
                </div>
              )}

              {!detailLoading && detailTab === 'campus' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Majors Available', value: detailSchool.majorsList?.join(', ') || null },
                    { label: 'Graduation Rate', value: detailSchool.graduationRate },
                    { label: 'Student-Athlete Support', value: detailSchool.studentAthleteSupportNotes },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '10px 14px', background: '#0d0d0d', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: '0.78rem', color: value ? '#ccc' : '#2a2a2a', fontStyle: value ? 'normal' : 'italic' }}>
                        {value || 'Not yet available'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Message Modal ── */}
      <AnimatePresence>
        {messageTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlay} onClick={() => setMessageTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={modal} onClick={e => e.stopPropagation()}>
              <button onClick={() => setMessageTarget(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}><X size={18} /></button>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff5a2d', marginBottom: 4 }}>Message</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{messageTarget.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{messageTarget.title} · {messageTarget.school}</div>
                {messageTarget.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 10px', background: '#0d0d0d', borderRadius: 7 }}>
                    <Mail size={13} color="#555" />
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{messageTarget.email}</span>
                  </div>
                )}
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,90,45,0.05)', borderRadius: 7, border: '1px solid rgba(255,90,45,0.12)', fontSize: '0.7rem', color: '#777' }}>
                  All messages to coaches are reviewed. For athletes under 18, a parent or guardian must approve contact before it is sent.
                </div>
              </div>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                placeholder={`Write a message to ${messageTarget.name}…`} rows={4}
                style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setMessageTarget(null)} style={{ ...btnSecondary, flex: '0 0 auto', padding: '8px 16px' }}>Cancel</button>
                <button onClick={sendMessage} disabled={messageSending || !messageText.trim()}
                  style={{ ...btnPrimary, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!messageText.trim() || messageSending) ? 0.5 : 1, cursor: (!messageText.trim() || messageSending) ? 'not-allowed' : 'pointer' }}>
                  <Send size={13} /> {messageSending ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Apply Modal ── */}
      <AnimatePresence>
        {applyTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={overlay} onClick={() => setApplyTarget(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={modal} onClick={e => e.stopPropagation()}>
              <button onClick={() => setApplyTarget(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 4 }}><X size={18} /></button>
              {applySubmitted ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,90,45,0.12)', border: '1px solid rgba(255,90,45,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={26} color="#ff5a2d" />
                  </div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: 6, textTransform: 'uppercase' }}>Interest Submitted!</div>
                  <p style={{ fontSize: '0.82rem', color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>
                    Your application to <span style={{ color: '#fff', fontWeight: 600 }}>{applyTarget.name}</span> has been received.
                  </p>
                  <button onClick={() => setApplyTarget(null)} style={{ ...btnPrimary, display: 'inline-block', padding: '10px 28px' }}>Done</button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ff5a2d', marginBottom: 4 }}>Express Interest</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{applyTarget.name}</div>
                    {(applyTarget.division || applyTarget.conference) && (
                      <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{[applyTarget.division, applyTarget.conference].filter(Boolean).join(' · ')}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>Grad Year</label>
                        <input value={applyForm.gradYear} onChange={e => setApplyForm(f => ({ ...f, gradYear: e.target.value }))} placeholder="e.g. 2027"
                          style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>Position <span style={{ color: '#ff5a2d' }}>*</span></label>
                        <select value={applyForm.position} onChange={e => setApplyForm(f => ({ ...f, position: e.target.value }))}
                          style={{ ...sel, padding: '10px 12px', color: applyForm.position ? '#fff' : '#555' }}>
                          <option value="">Select…</option>
                          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>
                        Note to Coach <span style={{ color: '#555', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                      </label>
                      <textarea value={applyForm.note} onChange={e => setApplyForm(f => ({ ...f, note: e.target.value }))}
                        placeholder="Tell the coach why you're interested in their program…" rows={3}
                        style={{ width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button onClick={() => setApplyTarget(null)} style={{ ...btnSecondary, flex: '0 0 auto', padding: '10px 20px' }}>Cancel</button>
                    <button onClick={submitApplication} disabled={applySubmitting || !applyForm.position}
                      style={{ ...btnPrimary, flex: 1, opacity: (applySubmitting || !applyForm.position) ? 0.5 : 1, cursor: (applySubmitting || !applyForm.position) ? 'not-allowed' : 'pointer' }}>
                      {applySubmitting ? 'Submitting…' : 'Submit Interest'}
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
