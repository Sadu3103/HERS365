import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, CheckCircle2, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Zap, Users, Award,
  ClipboardList, BookOpen, Database,
} from 'lucide-react';

interface Program {
  id: number;
  name: string;
  division: string | null;
  city: string | null;
  state: string | null;
  websiteUrl: string | null;
  lastScrapedAt: string | null;
  staffCount: number;
}

interface PendingStory {
  id: number;
  athleteName: string;
  position: string | null;
  commitmentSchool: string;
  commitmentDivision: string | null;
  gradYear: number | null;
  storyText: string | null;
  createdAt: string;
}

interface Application {
  id: number;
  athleteId: number | null;
  programId: number | null;
  position: string;
  note: string | null;
  status: string;
  createdAt: string;
}

interface AIStatus {
  available: boolean;
  model: string | null;
  backend: 'ollama' | 'openai' | null;
}

type Section = 'programs' | 'stories' | 'applications' | 'scholarships';

const SECTIONS = [
  { key: 'programs' as Section,      label: 'Programs',      icon: Database },
  { key: 'stories' as Section,       label: 'Stories',       icon: BookOpen },
  { key: 'applications' as Section,  label: 'Applications',  icon: ClipboardList },
  { key: 'scholarships' as Section,  label: 'Scholarships',  icon: Award },
];

function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('adminToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers || {}) },
  }).then(r => r.json());
}

export const AdminDashboard = () => {
  const [section, setSection] = useState<Section>('programs');
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  // Programs
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  // Stories
  const [stories, setStories] = useState<PendingStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storyExpandedId, setStoryExpandedId] = useState<number | null>(null);

  // Applications (Phase 4 — placeholder state)
  const [_applications, _setApplications] = useState<Application[]>([]);
  const [_appsLoading, _setAppsLoading] = useState(false);

  // Scholarship form
  const [schForm, setSchForm] = useState({ name: '', amount: '', deadline: '', requirements: '', category: '', eligibleStates: '' });
  const [schSubmitting, setSchSubmitting] = useState(false);
  const [schMessage, setSchMessage] = useState('');

  // Fetch AI status on load
  useEffect(() => {
    adminFetch<{ available: boolean; model: string | null; backend: string | null }>('/api/admin/ai-status')
      .then(d => setAiStatus(d as AIStatus))
      .catch(() => setAiStatus({ available: false, model: null, backend: null }));
  }, []);

  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const d = await adminFetch<{ success: boolean; data: Program[] }>('/api/admin/programs');
      if (d.success) setPrograms(d.data);
    } catch { /* non-fatal */ }
    finally { setProgramsLoading(false); }
  }, []);

  const loadStories = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const d = await adminFetch<{ success: boolean; data: PendingStory[] }>('/api/admin/stories/pending');
      if (d.success) setStories(d.data);
    } catch { /* non-fatal */ }
    finally { setStoriesLoading(false); }
  }, []);

  const loadApplications = useCallback(async () => {
    _setAppsLoading(true);
    _setAppsLoading(false);
  }, []);

  useEffect(() => {
    if (section === 'programs') loadPrograms();
    if (section === 'stories') loadStories();
    if (section === 'applications') loadApplications();
  }, [section, loadPrograms, loadStories, loadApplications]);

  const refreshProgram = async (p: Program) => {
    if (!aiStatus?.available) return;
    setRefreshingId(p.id);
    try {
      const d = await adminFetch<{ success: boolean; data: any }>(`/api/admin/programs/${p.id}/refresh`, { method: 'POST' });
      if (d.success) {
        setPrograms(prev => prev.map(pr => pr.id === p.id ? { ...pr, lastScrapedAt: new Date().toISOString(), staffCount: d.data?.staff?.length ?? pr.staffCount } : pr));
      }
    } catch { /* non-fatal */ }
    finally { setRefreshingId(null); }
  };

  const refreshAll = async () => {
    if (!aiStatus?.available || refreshingAll) return;
    setRefreshingAll(true);
    try {
      await adminFetch('/api/admin/programs/refresh-all', { method: 'POST' });
      // Poll programs every 5s to watch lastScrapedAt update
      const poll = setInterval(async () => {
        const d = await adminFetch<{ success: boolean; data: Program[] }>('/api/admin/programs');
        if (d.success) setPrograms(d.data);
        // Stop after 5 minutes
      }, 5000);
      setTimeout(() => { clearInterval(poll); setRefreshingAll(false); }, 5 * 60 * 1000);
    } catch {
      setRefreshingAll(false);
    }
  };

  const approveStory = async (id: number) => {
    await adminFetch(`/api/admin/stories/${id}/approve`, { method: 'PATCH' });
    setStories(prev => prev.filter(s => s.id !== id));
  };

  const deleteStory = async (id: number) => {
    await adminFetch(`/api/admin/stories/${id}`, { method: 'DELETE' });
    setStories(prev => prev.filter(s => s.id !== id));
  };

  const addScholarship = async () => {
    if (!schForm.name || !schForm.amount || !schForm.deadline) return;
    setSchSubmitting(true);
    setSchMessage('');
    try {
      const d = await adminFetch<{ success: boolean; error?: string }>('/api/admin/scholarships', {
        method: 'POST',
        body: JSON.stringify(schForm),
      });
      if (d.success) {
        setSchForm({ name: '', amount: '', deadline: '', requirements: '', category: '', eligibleStates: '' });
        setSchMessage('Scholarship added successfully.');
      } else {
        setSchMessage(d.error || 'Failed to add scholarship.');
      }
    } catch {
      setSchMessage('Request failed. Check your connection.');
    } finally {
      setSchSubmitting(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: '0.82rem',
    outline: 'none', boxSizing: 'border-box',
  };
  const btn = (variant: 'primary' | 'secondary' | 'danger' = 'secondary'): React.CSSProperties => ({
    borderRadius: 7, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em',
    padding: '8px 14px', cursor: 'pointer', border: 'none', transition: 'opacity 0.15s',
    background: variant === 'primary' ? '#ff5a2d' : variant === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(255,90,45,0.1)',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#ef4444' : '#ff5a2d',
  });

  const scraped = programs.filter(p => p.lastScrapedAt).length;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#555', fontSize: '0.85rem' }}>Recruiting data management and platform moderation</p>
        </div>

        {/* AI Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus?.available ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: aiStatus?.available ? '#22c55e' : '#ef4444' }}>
              {aiStatus === null ? 'Checking AI…' : aiStatus.available ? 'AI Ready' : 'AI Offline'}
            </div>
            {aiStatus?.model && <div style={{ fontSize: '0.62rem', color: '#444', marginTop: 1 }}>{aiStatus.backend} · {aiStatus.model}</div>}
          </div>
        </div>
      </div>

      {/* Section Nav */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSection(key)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '10px 18px', fontSize: '0.78rem', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 6,
            color: section === key ? '#ff5a2d' : '#444',
            borderBottom: section === key ? '2px solid #ff5a2d' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── PROGRAMS ── */}
      {section === 'programs' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', color: '#555' }}>
              <span style={{ color: '#ccc', fontWeight: 600 }}>{scraped}</span> / {programs.length} programs scraped
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={loadPrograms} style={btn()} disabled={programsLoading}>
                <RefreshCw size={11} style={{ display: 'inline', marginRight: 5, animation: programsLoading ? 'spin 1s linear infinite' : 'none' }} />
                Refresh List
              </button>
              <button onClick={refreshAll} disabled={refreshingAll || !aiStatus?.available} style={{ ...btn('primary'), opacity: !aiStatus?.available ? 0.4 : 1 }}>
                <Zap size={11} style={{ display: 'inline', marginRight: 5 }} />
                {refreshingAll ? 'Refreshing All…' : 'Refresh All'}
              </button>
            </div>
          </div>

          {!aiStatus?.available && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, marginBottom: 14, fontSize: '0.75rem', color: '#888' }}>
              <AlertCircle size={12} style={{ display: 'inline', marginRight: 5, color: '#ef4444' }} />
              AI backend not available. Start Ollama (<code>ollama serve</code>) or set <code>OPENAI_API_KEY</code> to enable refresh.
            </div>
          )}

          {programsLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
              <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
              <div style={{ fontSize: '0.85rem' }}>Loading programs…</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {programs.map(p => {
                const isRefreshing = refreshingId === p.id;
                const scrapedAgo = p.lastScrapedAt
                  ? Math.floor((Date.now() - new Date(p.lastScrapedAt).getTime()) / 86400000)
                  : null;

                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>{p.name}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                        {p.division && <span style={{ fontSize: '0.62rem', color: '#ff5a2d', fontWeight: 700 }}>{p.division}</span>}
                        {(p.city || p.state) && <span style={{ fontSize: '0.62rem', color: '#444' }}>{[p.city, p.state].filter(Boolean).join(', ')}</span>}
                        <span style={{ fontSize: '0.62rem', color: '#333' }}>{p.staffCount} staff</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {scrapedAgo !== null ? (
                        <div style={{ fontSize: '0.62rem', color: scrapedAgo > 30 ? '#f59e0b' : '#555', marginBottom: 4 }}>
                          {scrapedAgo === 0 ? 'Scraped today' : `${scrapedAgo}d ago`}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.62rem', color: '#2a2a2a', marginBottom: 4 }}>Never scraped</div>
                      )}
                      <button onClick={() => refreshProgram(p)} disabled={isRefreshing || !aiStatus?.available}
                        style={{ ...btn(), padding: '6px 10px', opacity: !aiStatus?.available ? 0.3 : 1 }}>
                        <RefreshCw size={10} style={{ display: 'inline', marginRight: 4, animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                        {isRefreshing ? 'Refreshing…' : 'Refresh'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {programs.length === 0 && !programsLoading && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#444', fontSize: '0.85rem' }}>
                  No programs in database. Run <code>npx tsx scripts/seed-programs.ts</code> to seed the 23 known schools.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STORIES ── */}
      {section === 'stories' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: '0.78rem', color: '#555' }}>
              <span style={{ color: '#ccc', fontWeight: 600 }}>{stories.length}</span> pending approval
            </span>
            <button onClick={loadStories} style={btn()} disabled={storiesLoading}>
              <RefreshCw size={11} style={{ display: 'inline', marginRight: 5, animation: storiesLoading ? 'spin 1s linear infinite' : 'none' }} />
              Reload
            </button>
          </div>

          {stories.length === 0 && !storiesLoading && (
            <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
              <CheckCircle2 size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700 }}>All caught up</div>
              <div style={{ fontSize: '0.82rem', marginTop: 6 }}>No commitment stories pending review.</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stories.map(story => {
              const expanded = storyExpandedId === story.id;
              return (
                <div key={story.id} style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{story.athleteName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>
                        → <span style={{ color: '#ff5a2d', fontWeight: 600 }}>{story.commitmentSchool}</span>
                        {story.commitmentDivision && <span style={{ marginLeft: 6 }}>{story.commitmentDivision}</span>}
                        {story.position && <span style={{ marginLeft: 6 }}>· {story.position}</span>}
                        {story.gradYear && <span style={{ marginLeft: 6 }}>· Class of {story.gradYear}</span>}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#333', marginTop: 3 }}>
                        Submitted {new Date(story.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {story.storyText && (
                        <button onClick={() => setStoryExpandedId(expanded ? null : story.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444', padding: 4 }}>
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      <button onClick={() => approveStory(story.id)} style={btn('primary')}>
                        <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                        Approve
                      </button>
                      <button onClick={() => deleteStory(story.id)} style={btn('danger')}>
                        <XCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                        Reject
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded && story.storyText && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                          <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.7, margin: 0 }}>{story.storyText}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── APPLICATIONS ── */}
      {section === 'applications' && (
        <div>
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'rgba(255,90,45,0.05)', border: '1px solid rgba(255,90,45,0.1)', borderRadius: 10, fontSize: '0.75rem', color: '#777' }}>
            Application status updates are sent via <code>PATCH /api/admin/applications/:id/status</code> with body <code>{JSON.stringify({ status: 'reviewed | accepted | rejected' })}</code>.
            The athlete receives a notification automatically.
          </div>
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#444' }}>
            <Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>Application List Coming in Phase 4</div>
            <div style={{ fontSize: '0.82rem', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              Use the API directly to review and update statuses. An admin UI list view will be added in the next release.
            </div>
          </div>
        </div>
      )}

      {/* ── SCHOLARSHIPS ── */}
      {section === 'scholarships' && (
        <div>
          <div className="k-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ff5a2d', marginBottom: 16 }}>
              Add New Scholarship
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Name *</label>
                <input value={schForm.name} onChange={e => setSchForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. NAIA Flag Football Scholarship" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Amount ($) *</label>
                <input value={schForm.amount} onChange={e => setSchForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" type="number" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Deadline *</label>
                <input value={schForm.deadline} onChange={e => setSchForm(f => ({ ...f, deadline: e.target.value }))} type="date" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Category</label>
                <input value={schForm.category} onChange={e => setSchForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Athletic, Academic, Need-Based" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Eligible States</label>
                <input value={schForm.eligibleStates} onChange={e => setSchForm(f => ({ ...f, eligibleStates: e.target.value }))} placeholder="e.g. CA, FL, TX (leave blank for all)" style={inp} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={addScholarship} disabled={schSubmitting || !schForm.name || !schForm.amount || !schForm.deadline}
                  style={{ ...btn('primary'), width: '100%', padding: '10px', opacity: (!schForm.name || !schForm.amount || !schForm.deadline) ? 0.5 : 1 }}>
                  {schSubmitting ? 'Adding…' : 'Add Scholarship'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Requirements</label>
              <textarea value={schForm.requirements} onChange={e => setSchForm(f => ({ ...f, requirements: e.target.value }))} placeholder="GPA, position, eligibility criteria…" rows={2}
                style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} />
            </div>
            {schMessage && (
              <div style={{ marginTop: 10, fontSize: '0.75rem', color: schMessage.includes('success') ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                {schMessage}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
