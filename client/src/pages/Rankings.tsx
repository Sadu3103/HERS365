import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Search, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { athleteAvatar } from '../lib/avatar';
import { POSITION_FILTERS } from '../lib/positions';
import { useIsMobile } from '../hooks/useIsMobile';
import { Skeleton, VisuallyHidden } from '../components/Skeleton';

type RankedPlayer = {
  id: number;
  rank: number;
  name: string;
  school: string;
  position: string;
  gpa: string | null;
  gradYear: number | null;
  rating: number;
  change: number;
  verified: boolean;
};

interface RankingsRow {
  id: number;
  rank?: number;
  name: string;
  school?: string;
  position?: string;
  gpa?: string | null;
  gradYear?: number | null;
  rating?: number;
  change?: number;
  verified?: boolean;
  verificationStatus?: string;
}

const positions = POSITION_FILTERS;

const PER_PAGE = 25;

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <img src={athleteAvatar(name)}
      alt={name} style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0, objectFit: 'cover' }} />
  );
}

function Trend({ curr, prev }: { curr: number; prev: number }) {
  const diff = prev - curr;
  if (diff === 0) return <Minus size={13} color="#444" />;
  if (diff > 0)   return <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><TrendingUp size={13} color="#4ade80" /><span className="tnum" style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>+{diff}</span></div>;
  return <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}><TrendingDown size={13} color="#f87171" /><span className="tnum" style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700 }}>{diff}</span></div>;
}

export const Rankings = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const isMobile = useIsMobile();

  // On phones the six-column table is wider than the screen, which clips the
  // Score column (the whole point of a ranking). Drop POS/YEAR/GPA on mobile and
  // keep RK, ATHLETE, SCORE so the score is always visible.
  const tableCols = isMobile ? '32px 1fr 52px' : '48px 1fr 80px 80px 80px 80px';
  const headers = isMobile
    ? ['RK', 'ATHLETE', 'SCORE']
    : ['RK', 'ATHLETE', 'POS', 'YEAR', 'GPA', 'SCORE'];

  useEffect(() => {
    // Debounce so typing in the search box doesn't fire a request per keystroke.
    // Position and page changes settle on the next tick since they aren't typed.
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (pos !== 'All') params.set('position', pos);
      if (search) params.set('search', search);

      fetch(`/api/rankings?${params.toString()}`)
        .then(r => r.ok ? r.json() : null)
        .then((j: { data?: RankingsRow[]; total?: number; totalPages?: number } | null) => {
          const rows: RankingsRow[] = j?.data ?? [];
          setPlayers(rows.map((p, i) => ({
            id: p.id,
            rank: p.rank ?? i + 1,
            name: p.name,
            school: p.school ?? '',
            position: p.position ?? '–',
            gpa: p.gpa ?? null,
            gradYear: p.gradYear ?? null,
            rating: p.rating ?? 0,
            change: p.change ?? 0,
            verified: p.verified ?? p.verificationStatus === 'verified',
          })));
          setTotal(j?.total ?? 0);
          setTotalPages(j?.totalPages ?? 1);
        })
        .catch(() => {
          setPlayers([]);
          setTotal(0);
          setTotalPages(1);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, pos, page]);

  // The server returns the rows already searched, position-filtered, and paged,
  // so the podium just takes the top of the current (page 1, unfiltered) board.
  const top3 = players.slice(0, 3);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}
      >
        <VisuallyHidden>Loading national rankings</VisuallyHidden>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <Skeleton width={260} height={28} radius={6} style={{ display: 'block', marginBottom: 8 }} />
          <Skeleton width={320} height={12} radius={6} style={{ display: 'block' }} />
        </div>

        {/* Podium (desktop only, matches the loaded layout) */}
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="k-card"
                style={{
                  padding: '20px 18px',
                  borderColor: i === 0 ? 'rgba(255,90,45,0.4)' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <Skeleton width={48} height={48} radius="50%" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton width="70%" height={14} style={{ display: 'block' }} />
                  <Skeleton width="50%" height={11} style={{ display: 'block' }} />
                </div>
                <Skeleton width={36} height={28} radius={6} style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}

        {/* Search + filter row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <Skeleton width="100%" height={36} radius={8} style={{ display: 'block' }} />
          <div style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
            {[60, 56, 72, 64, 58, 70].map((w, i) => (
              <Skeleton key={i} width={w} height={32} radius={7} style={{ flexShrink: 0 }} />
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="k-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid', gridTemplateColumns: tableCols,
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              gap: 12,
            }}
          >
            {headers.map((_, i) => (
              <Skeleton key={i} width={36} height={8} radius={4} style={{ justifySelf: i === 1 ? 'start' : 'center' }} />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, row) => (
            <div
              key={row}
              style={{
                display: 'grid', gridTemplateColumns: tableCols,
                padding: '12px 16px', alignItems: 'center', gap: 12,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <Skeleton width={20} height={14} radius={4} style={{ justifySelf: 'start' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Skeleton width={32} height={32} radius="50%" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skeleton width="60%" height={11} style={{ display: 'block' }} />
                  <Skeleton width="40%" height={9} style={{ display: 'block' }} />
                </div>
              </div>
              {!isMobile && <Skeleton width={36} height={14} radius={4} style={{ justifySelf: 'center' }} />}
              {!isMobile && <Skeleton width={36} height={12} radius={4} style={{ justifySelf: 'center' }} />}
              {!isMobile && <Skeleton width={28} height={12} radius={4} style={{ justifySelf: 'center' }} />}
              <Skeleton width={28} height={18} radius={4} style={{ justifySelf: 'center' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4, letterSpacing: 'var(--tracking-display)' }}>
          National Rankings
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Top female high school athletes ranked by performance score</p>
      </div>

      {/* Podium — top 3. Desktop only: at phone widths three cards are too narrow
          for names, and the table directly below already lists the top 3 with full
          names and scores, so the podium would just be a cramped duplicate. */}
      {search === '' && pos === 'All' && page === 1 && top3.length >= 3 && !isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {top3.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/profile/${p.id}`)}
              className="k-card" style={{
                padding: '20px 18px', position: 'relative', overflow: 'hidden',
                borderColor: i === 0 ? 'rgba(255,90,45,0.4)' : 'rgba(255,255,255,0.06)',
                boxShadow: i === 0 ? '0 0 0 1px rgba(255,90,45,0.1), 0 8px 32px rgba(255,90,45,0.08)' : 'none',
                cursor: 'pointer',
              }}>
              {i === 0 && (
                <div style={{
                  position: 'absolute', top: -40, right: -40, width: 160, height: 160,
                  background: 'radial-gradient(circle, rgba(255,90,45,0.12) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="tnum" style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800,
                  fontSize: i === 0 ? '1.6rem' : '1.2rem',
                  color: i === 0 ? '#ff5a2d' : '#444',
                  textShadow: i === 0 ? '0 0 16px rgba(255,90,45,0.4)' : 'none',
                }}>#{p.rank}</span>
                <span className="tnum" style={{
                  fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800,
                  fontSize: i === 0 ? '2rem' : '1.8rem', color: '#ff5a2d',
                  textShadow: i === 0 ? '0 0 20px rgba(255,90,45,0.5)' : '0 0 12px rgba(255,90,45,0.2)',
                }}>{p.rating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={p.name} size={i === 0 ? 44 : 38} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: i === 0 ? '0.92rem' : '0.85rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    {p.verified && <CheckCircle2 size={12} color="#ff5a2d" fill="#ff5a2d" style={{ flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.position} | {p.school}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters. Reset to page 1 on any filter change: a shrunk result set would
          otherwise leave a user stranded on a now-empty high page number. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
          <input type="text" placeholder="Search athletes or schools..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px 9px 32px', color: '#fff', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' as 'auto' }}>
          {positions.map(p => (
            <button key={p} onClick={() => { setPos(p); setPage(1); }} style={{
              background: pos === p ? '#ff5a2d' : '#111',
              border: '1px solid',
              borderColor: pos === p ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
              borderRadius: 7, padding: '8px 12px',
              color: pos === p ? '#fff' : '#666',
              fontSize: '0.75rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="k-card" style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: tableCols,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {headers.map(h => (
            <div key={h} style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', textAlign: h === 'ATHLETE' ? 'left' : 'center' }}>{h}</div>
          ))}
        </div>

        {players.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/profile/${p.id}`)}
            style={{
              display: 'grid', gridTemplateColumns: tableCols,
              padding: '12px 16px', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.15s', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="tnum" style={{
                fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1rem',
                color: p.rank <= 3 ? '#ff5a2d' : '#555',
              }}>{p.rank}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={p.name} size={32} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ddd' }}>{p.name}</span>
                  {p.verified && <CheckCircle2 size={11} color="#ff5a2d" fill="#ff5a2d" />}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 1 }}>{p.school}</div>
              </div>
            </div>

            {!isMobile && (
              <div style={{ textAlign: 'center' }}>
                <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>{p.position}</span>
              </div>
            )}

            {!isMobile && (
              <div className="tnum" style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#ccc' }}>{p.gradYear ?? '–'}</div>
            )}

            {!isMobile && (
              <div className="tnum" style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#ccc' }}>{p.gpa ?? '–'}</div>
            )}

            <div style={{ textAlign: 'center' }}>
              <span className="tnum" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#ff5a2d' }}>{p.rating}</span>
              <div style={{ marginTop: 2, display: 'flex', justifyContent: 'center' }}>
                <Trend curr={p.rank} prev={p.rank - (p.change > 0 ? 1 : p.change < 0 ? -1 : 0)} />
              </div>
            </div>
          </motion.div>
        ))}

        {players.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#444' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700 }}>
              {search === '' && pos === 'All' ? 'No athletes on the board yet.' : 'No athletes found'}
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
              padding: '8px 14px', color: page <= 1 ? '#333' : '#ccc',
              fontSize: '0.75rem', fontWeight: 700,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >Previous</button>

          <span className="tnum" style={{ fontSize: '0.75rem', color: '#666' }}>
            Page {page} of {totalPages} · {total} athletes
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{
              background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
              padding: '8px 14px', color: page >= totalPages ? '#333' : '#ccc',
              fontSize: '0.75rem', fontWeight: 700,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >Next</button>
        </div>
      )}
    </div>
  );
};
