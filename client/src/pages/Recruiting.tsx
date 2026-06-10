import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Heart, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

interface Athlete {
  id: number;
  name: string;
  school: string;
  position: string;
  score: number;
  location: string;
  graduationYear: number | null;
  height: string;
  fortyYardTime: number;
  gpa: number;
  verified: boolean;
  isFavorited: boolean;
}

const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'LB', 'DB'];
const locations  = ['All', 'California', 'Texas', 'Florida', 'Georgia', 'Colorado', 'Alabama'];
const years      = ['All', '2025', '2026', '2027', '2028'];

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <img
      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0 }}
    />
  );
}

export const Recruiting = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState('All');
  const [loc, setLoc] = useState('All');
  const [year, setYear] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: any[] }>('/api/athletes');
        setAthletes((res.data ?? []).map(row => ({
          id: row.id,
          name: row.name,
          school: row.school ?? '',
          position: row.position ?? '',
          score: row.g5Rating ? row.g5Rating * 20 : 0,
          location: row.state ?? '',
          graduationYear: row.gradYear ?? null,
          height: '—',
          fortyYardTime: 0,
          gpa: parseFloat(String(row.gpa)) || 0,
          verified: row.verificationStatus === 'verified',
          isFavorited: false,
        })));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = athletes.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || (a.name ?? '').toLowerCase().includes(q) || (a.school ?? '').toLowerCase().includes(q) || (a.position ?? '').toLowerCase().includes(q);
    return matchQ && (pos === 'All' || a.position === pos) && (loc === 'All' || a.location === loc) && (year === 'All' || (a.graduationYear?.toString() ?? '') === year);
  }).sort((a, b) => b.score - a.score);

  const toggleFav = (id: number) => setAthletes(prev => prev.map(a => a.id === id ? { ...a, isFavorited: !a.isFavorited } : a));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', gap: 16 }}>
        <Loader2 size={40} color="#ff5a2d" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>Loading athletes...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', gap: 16 }}>
        <div className="k-card" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>Failed to load athletes</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, background: '#ff5a2d', border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sel: React.CSSProperties = {
    background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, padding: '8px 12px', color: '#ccc',
    fontSize: '0.8rem', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          Athlete Recruiting
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Discover and connect with top female high school athletes</p>
      </div>

      {/* Search */}
      <div className="k-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search athletes, schools, positions..."
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
          </button>
        </div>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <select value={pos}  onChange={e => setPos(e.target.value)}  style={sel}>{positions.map(p => <option key={p} value={p}>{p === 'All' ? 'All Positions' : p}</option>)}</select>
              <select value={loc}  onChange={e => setLoc(e.target.value)}  style={sel}>{locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}</select>
              <select value={year} onChange={e => setYear(e.target.value)} style={sel}>{years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Years' : `Class of ${y}`}</option>)}</select>
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.78rem', color: '#555' }}>Showing <span style={{ color: '#ccc', fontWeight: 600 }}>{filtered.length}</span> athletes</span>
        <span style={{ fontSize: '0.78rem', color: '#555' }}>{athletes.filter(a => a.isFavorited).length} favorited</span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {filtered.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="k-card-hover" style={{ padding: '18px 18px 14px', cursor: 'pointer', position: 'relative' }}
            onClick={() => navigate(`/profile/${a.id}`)}>

            <button onClick={e => { e.stopPropagation(); toggleFav(a.id); }}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: a.isFavorited ? '#ff5a2d' : '#333', padding: 4, transition: 'color 0.15s' }}>
              <Heart size={16} fill={a.isFavorited ? '#ff5a2d' : 'none'} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Avatar name={a.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{a.name}</span>
                  {a.verified && <CheckCircle2 size={13} color="#ff5a2d" fill="#ff5a2d" />}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 2 }}>{a.school}</div>
              </div>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#ff5a2d', lineHeight: 1, flexShrink: 0 }}>{a.score}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>{a.position}</span>
              {a.graduationYear && <span style={{ fontSize: '0.72rem', color: '#555' }}>Class of {a.graduationYear}</span>}
            </div>

            <div style={{ display: 'flex', background: '#0d0d0d', borderRadius: 8, overflow: 'hidden', marginBottom: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
              {[{ label: '40YD', value: a.fortyYardTime ? `${a.fortyYardTime.toFixed(2)}s` : '—' }, { label: 'GPA', value: a.gpa.toFixed(1) }, { label: 'HGT', value: a.height }].map(({ label, value }, idx, arr) => (
                <div key={label} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ddd' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <MapPin size={11} color="#444" />
              <span style={{ fontSize: '0.72rem', color: '#444' }}>{a.location}</span>
            </div>

            <button onClick={e => { e.stopPropagation(); navigate(`/profile/${a.id}`); }}
              style={{ width: '100%', background: 'rgba(255,90,45,0.1)', border: '1px solid rgba(255,90,45,0.2)', borderRadius: 7, color: '#ff5a2d', fontSize: '0.75rem', fontWeight: 700, padding: '9px', cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ff5a2d'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,90,45,0.1)'; e.currentTarget.style.color = '#ff5a2d'; }}>
              VIEW PROFILE
            </button>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>No athletes found</div>
          <div style={{ fontSize: '0.85rem' }}>Try adjusting your filters</div>
        </div>
      )}
    </div>
  );
};
