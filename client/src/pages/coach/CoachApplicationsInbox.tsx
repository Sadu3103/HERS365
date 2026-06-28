import { useEffect, useMemo, useState, useCallback } from 'react';
import { Inbox, Filter, MapPin, GraduationCap, ChevronDown } from 'lucide-react';

interface ApplicationRow {
  id: number;
  athleteId: number;
  athleteName: string;
  position: string;
  note: string | null;
  status: string;
  createdAt: string;
  athleteSchool: string | null;
  athleteState: string | null;
  athleteGradYear: number | null;
  programName: string | null;
}

type FilterValue = 'all' | 'pending' | 'reviewing' | 'interested' | 'pass';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'interested', label: 'Interested' },
  { value: 'pass', label: 'Pass' },
];

const STATUS_OPTIONS = ['pending', 'reviewing', 'interested', 'pass'] as const;

// Color palette mirrors the coach portal's tone — restrained on the
// neutrals, with the orange brand accent only on positive intent
// (pending = waiting on you, interested = active recruit).
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending:   { bg: 'rgba(255,90,45,0.10)',    text: '#ff7a52', border: 'rgba(255,90,45,0.35)',  label: 'Pending' },
  reviewing: { bg: 'rgba(251,191,36,0.10)',   text: '#fbbf24', border: 'rgba(251,191,36,0.35)', label: 'Reviewing' },
  interested:{ bg: 'rgba(74,222,128,0.10)',   text: '#4ade80', border: 'rgba(74,222,128,0.35)', label: 'Interested' },
  pass:      { bg: 'rgba(255,255,255,0.05)',  text: '#9a9a96', border: 'rgba(255,255,255,0.08)',label: 'Pass' },
};

function truncate(s: string | null, max: number): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd() + '…';
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function StatusChip({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontSize: '0.65rem',
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 5,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}

export function CoachApplicationsInbox() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterValue>('all');

  const fetchInbox = useCallback(async () => {
    setError(null);
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch('/api/coach/applications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = await res.json();
      setApplications(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem('coachToken');
      const res = await fetch(`/api/coach/applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      // Update locally — avoids a full refetch round-trip on every change.
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch (e) {
      setError((e as Error).message || 'Failed to update');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    return applications.filter((a) => a.status === filter);
  }, [applications, filter]);

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === 'pending').length,
    [applications],
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: '#f4f4f2' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '1.9rem',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-display, -0.03em)',
              color: '#fff',
              margin: 0,
            }}
          >
            Recruiting Inbox
          </h1>
          {pendingCount > 0 && (
            <span
              className="tnum"
              style={{
                background: '#ff5a2d',
                color: '#0a0a0c',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '4px 9px',
                borderRadius: 999,
              }}
              aria-label={`${pendingCount} pending applications`}
            >
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Filter applications by status"
        style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}
      >
        <Filter size={14} color="#555" style={{ alignSelf: 'center', flexShrink: 0, marginRight: 4 }} />
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.value)}
              style={{
                background: active ? '#ff5a2d' : '#111',
                border: '1px solid',
                borderColor: active ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                padding: '7px 14px',
                color: active ? '#0a0a0c' : '#9a9a96',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 80, textAlign: 'center', color: '#555' }}>Loading…</div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          role="alert"
          style={{
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            color: '#f87171',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 16,
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && applications.length === 0 && (
        <div
          className="k-card"
          style={{ padding: '64px 24px', textAlign: 'center' }}
        >
          <Inbox size={32} color="#555" style={{ margin: '0 auto 14px', display: 'block' }} />
          <div
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: '1.1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: '#f4f4f2',
              marginBottom: 6,
            }}
          >
            No applications yet
          </div>
          <p style={{ color: '#9a9a96', fontSize: '0.88rem', margin: 0 }}>
            Athletes who express interest in your program will appear here.
          </p>
        </div>
      )}

      {/* Filtered-but-empty (data exists but the current filter hides it). */}
      {!loading && !error && applications.length > 0 && filtered.length === 0 && (
        <div
          className="k-card"
          style={{ padding: '40px 24px', textAlign: 'center', color: '#9a9a96', fontSize: '0.88rem' }}
        >
          No applications match the {FILTERS.find((f) => f.value === filter)?.label} filter.
        </div>
      )}

      {/* Card grid */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map((app) => (
            <div
              key={app.id}
              className="k-card"
              style={{
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Top row: name + status chip */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      color: '#fff',
                      letterSpacing: '0.01em',
                      textTransform: 'uppercase',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {app.athleteName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }} className="tnum">
                    {timeAgo(app.createdAt)}
                  </div>
                </div>
                <StatusChip status={app.status} />
              </div>

              {/* Mid row: position + school + state + grad year */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: '0.78rem', color: '#a0a0ab' }}>
                <span
                  style={{
                    background: 'rgba(255,90,45,0.10)',
                    color: '#ff5a2d',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {app.position}
                </span>
                {app.athleteSchool && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <GraduationCap size={12} color="#666" />
                    {truncate(app.athleteSchool, 28)}
                  </span>
                )}
                {app.athleteState && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} color="#666" />
                    {app.athleteState}
                  </span>
                )}
                {app.athleteGradYear && (
                  <span className="tnum" style={{ color: '#9a9a96' }}>
                    Class of {app.athleteGradYear}
                  </span>
                )}
              </div>

              {/* Note */}
              {app.note && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.82rem',
                    color: '#d4d4d0',
                    lineHeight: 1.5,
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: '2px solid rgba(255,90,45,0.35)',
                    padding: '8px 10px',
                    borderRadius: '0 6px 6px 0',
                  }}
                >
                  {truncate(app.note, 120)}
                </p>
              )}

              {/* Status updater */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                <label
                  htmlFor={`status-${app.id}`}
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#666',
                  }}
                >
                  Status
                </label>
                <div style={{ position: 'relative', flex: 1 }}>
                  <select
                    id={`status-${app.id}`}
                    value={app.status}
                    disabled={updatingId === app.id}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    style={{
                      width: '100%',
                      appearance: 'none',
                      background: '#161616',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      color: '#f4f4f2',
                      padding: '8px 30px 8px 12px',
                      fontSize: '0.82rem',
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: updatingId === app.id ? 'wait' : 'pointer',
                      opacity: updatingId === app.id ? 0.6 : 1,
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {(STATUS_STYLES[s]?.label ?? s)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    color="#666"
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
                {updatingId === app.id && (
                  <span style={{ fontSize: '0.7rem', color: '#9a9a96' }}>Updating…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
