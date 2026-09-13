import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Lock, Zap, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { athleteAvatar } from '../lib/avatar';
import { POSITION_FILTERS } from '../lib/positions';
import { useIsMobile } from '../hooks/useIsMobile';
import { Skeleton, VisuallyHidden } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import {
  YourRankDock,
  YourRankDockEmpty,
  type RankMeRanked,
  type RankMeUnratedOrHidden,
} from '../components/YourRankDock';

// The "change" field on the server is hardcoded to 0 because there is no
// rank-history table yet. The previous client surfaced a fake ▲/▼ trend
// next to every row; this version drops it (no fabricated motion) and
// removes `change` from the client row shape so a re-introduction needs an
// intentional new field.
type RankedPlayer = {
  id: number;
  rank: number;
  name: string;
  school: string;
  position: string;
  gpa: string | null;
  gradYear: number | null;
  rating: number;
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
  verified?: boolean;
  verificationStatus?: string;
}

type RankMeResponse =
  | ({ success: true } & RankMeRanked)
  | ({ success: true } & RankMeUnratedOrHidden)
  | { success: false };

const positions = POSITION_FILTERS;

const DEMO_RANKINGS_BOARD: RankedPlayer[] = [
  { id: 1, rank: 1, name: 'Maya Johnson', school: 'Lincoln High School (CA)', position: 'QB', gpa: 3.9, gradYear: 2026, rating: 98.4, verified: true },
  { id: 2, rank: 2, name: 'Chloe Adams', school: 'Mater Dei High (CA)', position: 'WR', gpa: 4.0, gradYear: 2026, rating: 97.8, verified: true },
  { id: 3, rank: 3, name: 'Samantha Rivera', school: 'St. Thomas Aquinas (FL)', position: 'Rusher', gpa: 3.8, gradYear: 2027, rating: 96.9, verified: true },
  { id: 4, rank: 4, name: 'Zoe Martinez', school: 'Caty High School (TX)', position: 'RB', gpa: 3.7, gradYear: 2026, rating: 96.2, verified: true },
  { id: 5, rank: 5, name: 'Jordan Lee', school: 'Poly Prep Country Day (NY)', position: 'Safety', gpa: 3.95, gradYear: 2026, rating: 95.8, verified: true },
  { id: 6, rank: 6, name: 'Riley Davis', school: 'Archbishop Mitty (CA)', position: 'Center', gpa: 3.85, gradYear: 2027, rating: 95.1, verified: true },
  { id: 7, rank: 7, name: 'Taylor Brooks', school: 'Chandler High (AZ)', position: 'QB', gpa: 4.0, gradYear: 2027, rating: 94.7, verified: true },
  { id: 8, rank: 8, name: 'Avery Morgan', school: 'Bingham High School (UT)', position: 'WR', gpa: 3.9, gradYear: 2026, rating: 94.2, verified: true },
  { id: 9, rank: 9, name: 'Morgan Vance', school: 'Allen High School (TX)', position: 'Rusher', gpa: 3.65, gradYear: 2026, rating: 93.9, verified: true },
  { id: 10, rank: 10, name: 'Kendall Reese', school: 'Centennial High (GA)', position: 'RB', gpa: 3.8, gradYear: 2027, rating: 93.5, verified: true },
  { id: 11, rank: 11, name: 'Sienna Clark', school: 'Bishop Gorman (NV)', position: 'Safety', gpa: 3.9, gradYear: 2026, rating: 93.0, verified: true },
  { id: 12, rank: 12, name: 'Brianna Scott', school: 'Eastside Catholic (WA)', position: 'Center', gpa: 3.75, gradYear: 2027, rating: 92.4, verified: true },
];

const PER_PAGE = 25;

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <img
      src={athleteAvatar(name)}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0, objectFit: 'cover' }}
    />
  );
}

export const Rankings = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [players, setPlayers] = useState<RankedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const isMobile = useIsMobile();

  const rawUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const parsedUser = rawUser ? JSON.parse(rawUser) : null;
  const currentTier = parsedUser?.subscriptionTier || parsedUser?.tier || 'free';
  const hasDiamondOverride = Boolean(parsedUser?.diamondOverride);
  const isFreeTier = (currentTier === 'free' || currentTier === 'rookie') && !hasDiamondOverride;
  const displayedPlayers = isFreeTier ? players.slice(0, 25) : players;

  // /api/rankings/me — only fired when the viewer is an athlete. Three
  // tri-state shapes from the server map to three render paths.
  const [meRank, setMeRank] = useState<
    { kind: 'ranked'; data: RankMeRanked }
    | { kind: 'empty'; data: RankMeUnratedOrHidden }
    | { kind: 'none' }
  >({ kind: 'none' });

  // Dock state: a slide-in flag (becomes true once me-rank resolves) and a
  // tucked flag flipped by the IntersectionObserver on the athlete's own row.
  const [dockIn, setDockIn] = useState(false);
  const [dockTucked, setDockTucked] = useState(false);
  const selfRowRef = useRef<HTMLDivElement | null>(null);

  // The six-column desktop table compresses to RK/ATHLETE/SCORE on phones so
  // the score is always visible. Identical rule from the previous version.
  const tableCols = isMobile ? '36px 1fr 64px' : '56px 1fr 80px 80px 80px 88px';
  const headers = isMobile
    ? ['RK', 'ATHLETE', 'SCORE']
    : ['RK', 'ATHLETE', 'POS', 'YEAR', 'GPA', 'SCORE'];

  // ── Fetch the board ───────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (pos !== 'All') params.set('position', pos);
      if (search) params.set('search', search);

      fetch(`/api/rankings?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { data?: RankingsRow[]; total?: number; totalPages?: number } | null) => {
          const rows: RankingsRow[] = j?.data ?? [];
          if (rows.length > 0) {
            setPlayers(
              rows.map((p, i) => ({
                id: p.id,
                rank: p.rank ?? i + 1,
                name: p.name,
                school: p.school ?? '',
                position: p.position ?? '–',
                gpa: p.gpa ?? null,
                gradYear: p.gradYear ?? null,
                rating: p.rating ?? 0,
                verified: p.verified ?? p.verificationStatus === 'verified',
              })),
            );
            setTotal(j?.total ?? rows.length);
            setTotalPages(j?.totalPages ?? 1);
          } else {
            const filtered = DEMO_RANKINGS_BOARD.filter(p => {
              const matchPos = pos === 'All' || p.position.toLowerCase() === pos.toLowerCase();
              const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.school.toLowerCase().includes(search.toLowerCase());
              return matchPos && matchSearch;
            });
            setPlayers(filtered);
            setTotal(filtered.length);
            setTotalPages(1);
          }
        })
        .catch(() => {
          const filtered = DEMO_RANKINGS_BOARD.filter(p => {
            const matchPos = pos === 'All' || p.position.toLowerCase() === pos.toLowerCase();
            const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.school.toLowerCase().includes(search.toLowerCase());
            return matchPos && matchSearch;
          });
          setPlayers(filtered);
          setTotal(filtered.length);
          setTotalPages(1);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, pos, page]);

  // ── Fetch /me — only for authed athletes; everything else fails closed ──
  // Effects keep their setState calls inside async callbacks (the fetch
  // .then path or a queueMicrotask deferral). The react-compiler rule
  // forbids synchronous setState inside a useEffect body.
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'athlete') {
      queueMicrotask(() => setMeRank({ kind: 'none' }));
      return;
    }
    let cancelled = false;
    apiFetch<RankMeResponse>('/api/rankings/me')
      .then((res) => {
        if (cancelled) return;
        if (!res || res.success !== true) {
          setMeRank({ kind: 'none' });
          return;
        }
        if (res.ranked === true) {
          setMeRank({ kind: 'ranked', data: res });
        } else if (res.reason === 'unrated' || res.reason === 'hidden') {
          setMeRank({ kind: 'empty', data: res });
        } else {
          setMeRank({ kind: 'none' });
        }
      })
      .catch(() => {
        if (!cancelled) setMeRank({ kind: 'none' });
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role]);

  // ── Slide the dock in once we have a verdict.
  // setState is deferred into requestAnimationFrame both ways so the effect
  // body never calls it synchronously.
  useEffect(() => {
    if (meRank.kind === 'none') {
      const offId = requestAnimationFrame(() => setDockIn(false));
      return () => cancelAnimationFrame(offId);
    }
    const onId = requestAnimationFrame(() => setDockIn(true));
    return () => cancelAnimationFrame(onId);
  }, [meRank.kind]);

  // ── IntersectionObserver: tuck the dock when the athlete's own row is
  // visible in the list. Re-attaches whenever the row ref is set/cleared
  // (page change, filter, etc.).
  useEffect(() => {
    if (meRank.kind !== 'ranked') {
      queueMicrotask(() => setDockTucked(false));
      return;
    }
    const el = selfRowRef.current;
    if (!el) {
      queueMicrotask(() => setDockTucked(false));
      return;
    }
    const dockHeight = isMobile ? 64 : 72;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setDockTucked(entry.isIntersecting);
      },
      {
        // Negative bottom margin = "the bottom dockHeight pixels of viewport
        // don't count as visible." So the row tucks the dock when its own
        // row appears ABOVE the dock surface, not when it's underneath it.
        rootMargin: `0px 0px -${dockHeight}px 0px`,
        threshold: 0,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [meRank, players, isMobile]);

  // ── Whether the current loaded board contains the athlete's row at all.
  // Memoized with the full user object as a dep so react-compiler can keep
  // its memoization in sync with the dependency it actually reads.
  const selfIsLoadedPlayer = useMemo(() => {
    if (meRank.kind !== 'ranked' || !user) return false;
    const myId = user.id;
    return players.some((p) => p.id === myId);
  }, [meRank, players, user]);

  // The server returns the rows already searched, position-filtered, and
  // paged, so the podium just takes the top of the current (page 1,
  // unfiltered) board.
  const top3 = players.slice(0, 3);

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <VisuallyHidden>Loading national rankings</VisuallyHidden>
        <div style={{ marginBottom: 28 }}>
          <Skeleton width={260} height={28} radius={6} style={{ display: 'block', marginBottom: 8 }} />
          <Skeleton width={320} height={12} radius={6} style={{ display: 'block' }} />
        </div>
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="k-card"
                style={{
                  padding: '20px 18px',
                  borderColor: i === 0 ? 'rgba(139, 59, 255,0.4)' : 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <Skeleton width="100%" height={36} radius={8} style={{ display: 'block' }} />
          <div style={{ display: 'flex', gap: 4, overflow: 'hidden' }}>
            {[60, 56, 72, 64, 58, 70].map((w, i) => (
              <Skeleton key={i} width={w} height={32} radius={7} style={{ flexShrink: 0 }} />
            ))}
          </div>
        </div>
        <div className="k-card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: tableCols,
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
                display: 'grid',
                gridTemplateColumns: tableCols,
                padding: '12px 16px',
                alignItems: 'center',
                gap: 12,
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

  // The athlete's own row may need an extra ~80px scroll runway so it can
  // slide above the fixed dock without being permanently hidden behind it.
  const bottomPadForDock = meRank.kind === 'none' ? 0 : isMobile ? 64 + 56 : 96;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', paddingBottom: 24 + bottomPadForDock }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 800,
            fontSize: '2rem',
            textTransform: 'uppercase',
            color: '#fff',
            marginBottom: 4,
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          National Rankings
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Top female high school athletes ranked by performance score</p>
      </div>

      {/* Podium — desktop top 3. Stadium typography upgrade: #1 oversized
          orange numeral, #2/#3 neutral large; size + colour are the medal. */}
      {search === '' && pos === 'All' && page === 1 && top3.length >= 3 && !isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {top3.map((p, i) => {
            const isOne = i === 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(`/profile/${p.id}`)}
                className="k-card"
                style={{
                  padding: '20px 18px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderColor: isOne ? 'rgba(139, 59, 255,0.4)' : 'rgba(255,255,255,0.06)',
                  boxShadow: isOne ? '0 0 0 1px rgba(139, 59, 255,0.1), 0 8px 32px rgba(139, 59, 255,0.08)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {isOne && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -40,
                      right: -40,
                      width: 160,
                      height: 160,
                      background: 'radial-gradient(circle, rgba(139, 59, 255,0.12) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span
                    className="tnum"
                    style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 800,
                      fontSize: isOne ? 88 : 64,
                      lineHeight: 1,
                      letterSpacing: '-0.01em',
                      color: isOne ? '#8B3BFF' : '#F4F4F5',
                      textShadow: isOne ? '0 0 16px rgba(139, 59, 255,0.4)' : 'none',
                    }}
                    aria-hidden="true"
                  >
                    <span style={{ fontSize: '0.55em', color: 'rgba(244,244,245,0.35)', marginRight: 1 }}>#</span>
                    {p.rank}
                  </span>
                  <span
                    className="tnum"
                    style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontWeight: 800,
                      fontSize: isOne ? 64 : 48,
                      color: isOne ? '#A66BFF' : '#C8C8D0',
                      lineHeight: 1,
                    }}
                  >
                    {p.rating}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar name={p.name} size={isOne ? 44 : 38} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: isOne ? '0.92rem' : '0.85rem',
                          fontWeight: 700,
                          color: '#fff',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.name}
                      </span>
                      {p.verified && <CheckCircle2 size={12} color="#8B3BFF" fill="#8B3BFF" style={{ flexShrink: 0 }} />}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#8A8A94',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.position} | {p.school}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }}
          />
          <input
            type="text"
            aria-label="Search athletes or schools"
            placeholder="Search athletes or schools..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              width: '100%',
              background: '#111',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '9px 12px 9px 32px',
              color: '#fff',
              fontSize: '0.82rem',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' as 'auto' }}>
          {positions.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPos(p);
                setPage(1);
              }}
              style={{
                background: pos === p ? '#8B3BFF' : '#111',
                border: '1px solid',
                borderColor: pos === p ? '#8B3BFF' : 'rgba(255,255,255,0.08)',
                borderRadius: 7,
                padding: '8px 12px',
                color: pos === p ? '#fff' : '#666',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Board — wrapper has NO overflow:hidden so sticky header survives. */}
      <div className="rk-board">
        <div
          className="rk-thead"
          style={{
            display: 'grid',
            gridTemplateColumns: tableCols,
            padding: '12px 16px',
          }}
        >
          {headers.map((h) => (
            <div
              key={h}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#8A8A94',
                textAlign: h === 'ATHLETE' ? 'left' : h === 'RK' ? 'left' : 'center',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {displayedPlayers.map((p) => {
          const isSelf = !!user?.id && p.id === user.id;
          const diamondScore = (p.rating / 20).toFixed(1);
          return (
            <div
              key={p.id}
              ref={isSelf ? selfRowRef : undefined}
              data-self={isSelf || undefined}
              onClick={() => navigate(`/profile/${p.id}`)}
              className={isSelf ? 'rk-row-self' : undefined}
              style={{
                display: 'grid',
                gridTemplateColumns: tableCols,
                padding: '0 16px',
                alignItems: 'center',
                minHeight: isMobile ? 56 : 64,
                cursor: 'pointer',
              }}
            >
              {/* Rank */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  className="tnum"
                  style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 800,
                    fontSize: isMobile ? 22 : 28,
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                    color: p.rank <= 3 ? '#A66BFF' : '#F4F4F5',
                  }}
                  aria-hidden="true"
                >
                  <span style={{ fontSize: '0.55em', color: 'rgba(244,244,245,0.35)', marginRight: 1 }}>#</span>
                  {p.rank}
                </span>
              </div>

              {/* Athlete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={p.name} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#F4F4F5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </span>
                    {p.verified && <CheckCircle2 size={11} color="#8B3BFF" fill="#8B3BFF" />}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        background: 'rgba(139, 59, 255, 0.12)',
                        border: '1px solid rgba(139, 59, 255, 0.3)',
                        borderRadius: 99,
                        padding: '1px 6px',
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: '#A66BFF',
                        letterSpacing: '0.03em',
                      }}
                      title="Verified G5 Diamond Rating"
                    >
                      💎 {diamondScore}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#8A8A94',
                      marginTop: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.school}
                  </div>
                </div>
              </div>

              {!isMobile && (
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      background: 'rgba(139, 59, 255,0.10)',
                      color: '#A66BFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {p.position}
                  </span>
                </div>
              )}

              {!isMobile && (
                <div className="tnum" style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#C8C8D0' }}>
                  {p.gradYear ?? '–'}
                </div>
              )}

              {!isMobile && (
                <div className="tnum" style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#C8C8D0' }}>
                  {p.gpa ?? '–'}
                </div>
              )}

              {/* Score */}
              <div style={{ textAlign: 'right' }}>
                <span
                  className="tnum"
                  style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 800,
                    fontSize: isMobile ? 24 : 30,
                    lineHeight: 1,
                    color: '#A66BFF',
                  }}
                >
                  {p.rating}
                </span>
              </div>
            </div>
          );
        })}

        {isFreeTier && players.length > 5 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              margin: '16px',
              padding: isMobile ? '28px 20px' : '36px 32px',
              borderRadius: 16,
              background: 'linear-gradient(145deg, rgba(28,28,30,0.95) 0%, rgba(18,18,20,0.98) 100%)',
              border: '1px solid rgba(139, 59, 255,0.35)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.4), 0 0 40px rgba(139, 59, 255,0.1)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 220,
                height: 220,
                background: 'radial-gradient(circle, rgba(139, 59, 255,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 99,
                background: 'rgba(139, 59, 255,0.15)',
                border: '1px solid rgba(139, 59, 255,0.4)',
                color: '#8B3BFF',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 16,
              }}
            >
              <Lock size={12} /> Verified G5 Diamond Paywall
            </div>
            <h3
              style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 800,
                fontSize: isMobile ? '1.6rem' : '2.1rem',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                margin: '0 0 10px',
                letterSpacing: '-0.01em',
              }}
            >
              Unlock Ranks #26–500 & The Full G5 Diamond System
            </h3>
            <p
              style={{
                color: '#A0A0A8',
                fontSize: '0.9rem',
                maxWidth: 520,
                margin: '0 auto 24px',
                lineHeight: 1.6,
              }}
            >
              Free tier members preview the Top 25 athletes. Upgrade to <strong style={{ color: '#fff' }}>Athlete Pro ($19.99/mo)</strong> or <strong style={{ color: '#fff' }}>High School Coach / College Recruiter</strong> to unlock the complete National Rankings, verified G5 Diamond ratings, combine analytics, and direct recruiter contact.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#E4E4E8', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                💎 Verified 1–5 Diamond Scale
              </span>
              <span style={{ fontSize: '0.78rem', color: '#E4E4E8', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                📊 Search 500+ Prospects by Position & State
              </span>
              <span style={{ fontSize: '0.78rem', color: '#E4E4E8', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 8 }}>
                ⚡ Direct Coach Messaging Access
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/subscribe')}
              style={{
                padding: '14px 32px',
                borderRadius: 12,
                background: '#8B3BFF',
                border: 'none',
                color: '#FFFFFF',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 800,
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(139, 59, 255,0.4)',
              }}
            >
              Upgrade to Athlete Pro ($19.99/mo)
            </motion.button>
          </motion.div>
        )}

        {players.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#444' }}>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              padding: '8px 14px',
              color: page <= 1 ? '#333' : '#ccc',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span className="tnum" style={{ fontSize: '0.75rem', color: '#666' }}>
            Page {page} of {totalPages} · {total} athletes
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              background: '#111',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              padding: '8px 14px',
              color: page >= totalPages ? '#333' : '#ccc',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* "Your rank" dock — bottom fixed. Two presentation forms: ranked
          (full strip → her profile) and unrated/hidden (muted strip with
          inline CTA). The IntersectionObserver above flips dockTucked the
          moment her real row would otherwise be hidden by the dock. */}
      {meRank.kind === 'ranked' && user && (
        <YourRankDock
          data={meRank.data}
          athleteId={user.id}
          athleteName={user.name || 'You'}
          athleteSchool={
            players.find((p) => p.id === user.id)?.school ?? ''
          }
          inView={dockIn}
          tucked={dockTucked && selfIsLoadedPlayer}
        />
      )}
      {meRank.kind === 'empty' && (
        <YourRankDockEmpty data={meRank.data} inView={dockIn} tucked={false} />
      )}
    </div>
  );
};
