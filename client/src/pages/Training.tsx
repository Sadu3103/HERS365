import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Flame, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

interface CombineStats {
  id?: number;
  season?: string | null;
  fortyDash?: string | null;
  shuttle?: string | null;
  vertical?: string | null;
  broadJump?: string | null;
  threeCone?: string | null;
}

const samplePrograms = [
  { id: 1, name: 'Elite QB Development',    cat: 'Quarterback',   done: 0, total: 24, level: 'Advanced',     next: 'Pocket Presence & Footwork' },
  { id: 2, name: 'Speed & Agility Mastery', cat: 'Conditioning',  done: 0, total: 18, level: 'Intermediate',  next: 'L-Drill Progression' },
  { id: 3, name: 'Route Running Academy',   cat: 'Wide Receiver',  done: 0, total: 20, level: 'Elite',        next: 'Double-Move Releases' },
];

const sampleDrills = [
  { id: 1, name: 'Pocket Presence & Footwork', dur: '18 min', cat: 'QB',       difficulty: 'Advanced',     done: false },
  { id: 2, name: '3-Step Drop Progression',    dur: '12 min', cat: 'QB',       difficulty: 'Intermediate', done: false },
  { id: 3, name: 'L-Drill Cone Work',          dur: '10 min', cat: 'Agility',  difficulty: 'Beginner',     done: false },
  { id: 4, name: 'Single-Leg RDL Series',      dur: '15 min', cat: 'Strength', difficulty: 'Intermediate', done: false },
  { id: 5, name: 'Hand Fighting Drills',        dur: '8 min',  cat: 'DB',       difficulty: 'Advanced',     done: false },
];

const levelColor: Record<string, string> = {
  Beginner:     'rgba(100,200,100,0.15)',
  Intermediate: 'rgba(255,180,50,0.12)',
  Advanced:     'rgba(255,90,45,0.12)',
  Elite:        'rgba(200,50,255,0.12)',
};
const levelText: Record<string, string> = {
  Beginner: '#64c864', Intermediate: '#ffb432', Advanced: '#ff5a2d', Elite: '#c832ff',
};

const ALL = 'All';
const drillCategories = [ALL, ...Array.from(new Set(sampleDrills.map(d => d.cat)))];
const difficulties = [ALL, 'Beginner', 'Intermediate', 'Advanced', 'Elite'];

const METRICS: { key: keyof CombineStats; label: string; unit: string; placeholder: string }[] = [
  { key: 'fortyDash',  label: '40-Yard Dash', unit: 'sec',  placeholder: 'e.g. 4.9' },
  { key: 'shuttle',    label: 'Shuttle',       unit: 'sec',  placeholder: 'e.g. 4.3' },
  { key: 'vertical',   label: 'Vertical',      unit: 'in',   placeholder: 'e.g. 28' },
  { key: 'broadJump',  label: 'Broad Jump',    unit: 'in',   placeholder: 'e.g. 90' },
  { key: 'threeCone',  label: '3-Cone',        unit: 'sec',  placeholder: 'e.g. 7.1' },
];

export const Training = () => {
  const navigate = useNavigate();
  const [drills, setDrills] = useState(sampleDrills);
  const [filterCat, setFilterCat] = useState(ALL);
  const [filterDifficulty, setFilterDifficulty] = useState(ALL);

  const [stats, setStats] = useState<CombineStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: CombineStats }>('/api/users/stats');
      setStats(res.data && res.data.id ? res.data : {});
    } catch {
      setStatsError('Failed to load combine results.');
      setStats({});
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const hasAnyStats = stats && METRICS.some(m => stats[m.key]);

  const toggleDrill = (id: number) =>
    setDrills(prev => prev.map(d => d.id === id ? { ...d, done: !d.done } : d));

  const filteredDrills = drills.filter(d =>
    (filterCat === ALL || d.cat === filterCat) &&
    (filterDifficulty === ALL || d.difficulty === filterDifficulty)
  );

  const completedToday = drills.filter(d => d.done).length;

  const handleFormChange = (key: string, value: string) =>
    setFormValues(prev => ({ ...prev, [key]: value }));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    setFormSuccess(false);
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(formValues)) {
        if (v.trim()) body[k] = v.trim();
      }
      await apiFetch('/api/users/stats', { method: 'POST', body: JSON.stringify(body) });
      setFormSuccess(true);
      setShowForm(false);
      setFormValues({});
      await fetchStats();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save. Try again.');
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          Training Academy
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Track your combine results and explore training resources</p>
      </div>

      {/* Today's drill count — real, based on actual checked drills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 28, maxWidth: 480 }}>
        <div className="k-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>TODAY'S DRILLS</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{completedToday}/{drills.length}</div>
          <div style={{ fontSize: '0.7rem', color: '#444' }}>Sample session below</div>
        </div>
        <div className="k-card" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>COMBINE BESTS</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#fff', lineHeight: 1, marginBottom: 4 }}>
            {statsLoading ? '…' : hasAnyStats ? `${METRICS.filter(m => stats && stats[m.key]).length}/5` : '—'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#444' }}>{hasAnyStats ? 'Metrics recorded' : 'None recorded yet'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

        {/* Left: Performance Testing (real feature) + Sample Programs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Combine Personal Bests */}
          <div className="k-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Combine Personal Bests</div>
              <button
                onClick={() => { setShowForm(f => !f); setFormError(null); setFormSuccess(false); }}
                style={{
                  background: '#ff5a2d', border: 'none', borderRadius: 7,
                  color: '#fff', fontSize: '0.72rem', fontWeight: 700,
                  padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                {showForm ? 'Cancel' : 'Record / Update'}
              </button>
            </div>

            {statsLoading && (
              <div style={{ color: '#444', fontSize: '0.82rem', padding: '12px 0' }}>Loading…</div>
            )}

            {!statsLoading && statsError && (
              <div style={{ color: '#ff5a2d', fontSize: '0.82rem', padding: '8px 0' }}>{statsError}</div>
            )}

            {!statsLoading && !statsError && !hasAnyStats && !showForm && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ color: '#555', fontSize: '0.88rem', marginBottom: 6 }}>No combine results yet</div>
                <div style={{ color: '#444', fontSize: '0.78rem' }}>Record your first test to track personal bests</div>
              </div>
            )}

            {!statsLoading && !statsError && hasAnyStats && !showForm && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {METRICS.map(m => {
                  const val = stats ? stats[m.key] : null;
                  return (
                    <div key={m.key} style={{
                      background: val ? 'rgba(255,90,45,0.08)' : 'rgba(255,255,255,0.03)',
                      borderRadius: 8, padding: '12px 14px',
                      border: val ? '1px solid rgba(255,90,45,0.18)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: val ? '#fff' : '#333', lineHeight: 1, marginBottom: 2 }}>
                        {val ?? '—'}
                      </div>
                      {val && <div style={{ fontSize: '0.65rem', color: '#555' }}>{m.unit}</div>}
                    </div>
                  );
                })}
                {stats?.season && (
                  <div style={{ gridColumn: '1/-1', fontSize: '0.72rem', color: '#444', marginTop: 4 }}>Season: {stats.season}</div>
                )}
              </div>
            )}

            {showForm && (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {METRICS.map(m => (
                    <div key={m.key}>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>
                        {m.label} <span style={{ color: '#444', textTransform: 'none', letterSpacing: 0 }}>({m.unit})</span>
                      </label>
                      <input
                        type="text"
                        placeholder={m.placeholder}
                        defaultValue={stats ? (stats[m.key] ?? '') : ''}
                        onChange={e => handleFormChange(m.key, e.target.value)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 7, color: '#fff', fontSize: '0.88rem',
                          padding: '8px 10px', outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 4 }}>
                      Season
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 2026"
                      defaultValue={stats?.season ?? ''}
                      onChange={e => handleFormChange('season', e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 7, color: '#fff', fontSize: '0.88rem',
                        padding: '8px 10px', outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {formError && <div style={{ color: '#ff5a2d', fontSize: '0.8rem' }}>{formError}</div>}

                <button
                  type="submit"
                  disabled={formSaving}
                  style={{
                    background: formSaving ? '#333' : '#ff5a2d', border: 'none', borderRadius: 7,
                    color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                    padding: '10px 20px', cursor: formSaving ? 'not-allowed' : 'pointer',
                    alignSelf: 'flex-start', letterSpacing: '0.04em',
                  }}
                >
                  {formSaving ? 'Saving…' : 'Save Results'}
                </button>
              </form>
            )}

            {formSuccess && !showForm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64c864', fontSize: '0.78rem', marginTop: 8 }}>
                <CheckCircle size={13} /> Results saved
              </div>
            )}
          </div>

          {/* Sample Programs — clearly labeled as preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Sample Programs</span>
              <span style={{ background: 'rgba(255,180,50,0.12)', color: '#ffb432', fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Preview</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {samplePrograms.map((p, i) => {
                const pct = Math.round((p.done / p.total) * 100);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="k-card-hover" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 3 }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#555' }}>{p.cat}</div>
                      </div>
                      <span style={{
                        background: levelColor[p.level] || 'rgba(255,90,45,0.12)',
                        color: levelText[p.level] || '#ff5a2d',
                        fontSize: '0.65rem', fontWeight: 700,
                        padding: '3px 8px', borderRadius: 4,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        flexShrink: 0, marginLeft: 12,
                      }}>{p.level}</span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.72rem', color: '#666' }}>{p.done}/{p.total} sessions</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ff5a2d' }}>{pct}%</span>
                      </div>
                      <div className="k-progress-track">
                        <div className="k-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Next</div>
                      <div style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 500 }}>{p.next}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Today's sample session + Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Today's session */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Sample Session</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={13} color="#ff5a2d" />
                <span style={{ fontSize: '0.75rem', color: '#ff5a2d', fontWeight: 700 }}>{completedToday}/{drills.length}</span>
              </div>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#444', marginBottom: 12 }}>Example drills — check off as you go</div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, color: '#ccc', fontSize: '0.72rem', padding: '4px 8px', cursor: 'pointer',
                }}
              >
                {drillCategories.map(c => <option key={c} value={c}>{c === ALL ? 'All Categories' : c}</option>)}
              </select>
              <select
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, color: '#ccc', fontSize: '0.72rem', padding: '4px 8px', cursor: 'pointer',
                }}
              >
                {difficulties.map(d => <option key={d} value={d}>{d === ALL ? 'All Levels' : d}</option>)}
              </select>
            </div>

            {/* Progress bar — real: reflects actual checked count */}
            <div className="k-progress-track" style={{ marginBottom: 16 }}>
              <div className="k-progress-fill" style={{ width: `${(completedToday / drills.length) * 100}%` }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredDrills.map(d => (
                <button key={d.id} onClick={() => toggleDrill(d.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '8px 0', textAlign: 'left',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  opacity: d.done ? 0.5 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  {d.done
                    ? <CheckCircle size={16} color="#ff5a2d" fill="#ff5a2d" style={{ flexShrink: 0 }} />
                    : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #333', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: d.done ? '#555' : '#ccc', fontWeight: 500, textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#444', marginTop: 1 }}>{d.cat}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <Clock size={11} color="#444" />
                    <span style={{ fontSize: '0.68rem', color: '#444' }}>{d.dur}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Quick Actions</div>
            {[
              { label: 'Browse All Drills',     path: '/drills' },
              { label: 'Schedule a Session',    path: '/events' },
              { label: 'Track Performance',     path: '/rankings' },
            ].map(({ label, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none',
                padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', color: '#ccc', fontSize: '0.82rem', fontWeight: 500,
              }}>
                {label}
                <ChevronRight size={14} color="#444" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
