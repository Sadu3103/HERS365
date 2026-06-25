import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, Flame,
  CheckCircle2, Clock, ChevronRight, Trophy,
} from 'lucide-react';

const FLAME_C = '#ff5a2d';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

type EventType = 'Tournament' | 'Camp' | '7v7' | 'Combine' | 'Showcase';

type EventItem = {
  id: number;
  title: string;
  org: string;
  type: EventType;
  date: string;
  city: string;
  state: string;
  cost: string;
  spots: number | null;
  spotsLeft: number | null;
  registered: boolean;
  featured: boolean;
  desc: string;
};

type ApiEvent = {
  id: number;
  name: string;
  date: string;
  location: string;
  registrationDeadline: string | null;
  participantCount: number;
  capacity: number;
  price: number;
  description: string | null;
  upcoming: boolean;
  org?: string;
  type?: string;
  city?: string;
  state?: string;
  featured?: boolean;
};

function mapApiEvent(e: ApiEvent, registeredIds: Set<number>): EventItem {
  const locationParts = e.location.split(',').map((s) => s.trim());
  const city = e.city ?? locationParts[0] ?? '';
  const state = e.state ?? locationParts[1] ?? '';
  const spotsLeft = e.capacity > 0 ? Math.max(0, e.capacity - e.participantCount) : null;
  const cost = e.price === 0 ? 'Free' : `$${(e.price / 100).toFixed(0)}`;
  const rawType = (e.type ?? 'Showcase') as string;
  const validTypes: EventType[] = ['Tournament', 'Camp', '7v7', 'Combine', 'Showcase'];
  const type: EventType = validTypes.includes(rawType as EventType)
    ? (rawType as EventType)
    : 'Showcase';

  return {
    id: e.id,
    title: e.name,
    org: e.org ?? 'HERS365',
    type,
    date: e.date,
    city,
    state,
    cost,
    spots: e.capacity > 0 ? e.capacity : null,
    spotsLeft,
    registered: registeredIds.has(e.id),
    featured: e.featured ?? false,
    desc: e.description ?? '',
  };
}

const TYPES = ['All', 'Tournament', 'Camp', '7v7', 'Combine', 'Showcase'] as const;
const TYPE_COLOR: Record<string, string> = {
  Tournament: '#fbbf24', Camp: '#34d399', '7v7': FLAME_C, Combine: '#60a5fa', Showcase: '#c084fc',
};

function urgencyColor(left: number | null): string | null {
  if (left === null) return null;
  if (left <= 10) return '#f87171';
  if (left <= 25) return '#fbbf24';
  return '#4ade80';
}

function EventCard({ ev, onRegister }: { ev: EventItem; onRegister: () => void }) {
  const color = TYPE_COLOR[ev.type] || FLAME_C;
  const urg = urgencyColor(ev.spotsLeft);

  return (
    <motion.div
      className="k-card-hover"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      style={{ padding: '18px 20px', marginBottom: 12 }}
    >
      {ev.featured && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, color: FLAME_C }}>
          <Flame size={11} />
          <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Featured Event</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2' }}>{ev.title}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5, background: `${color}18`, color, border: `1px solid ${color}30` }}>{ev.type}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: MUTED_2, marginBottom: 10 }}>{ev.org}</div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: MUTED }}>
              <Calendar size={12} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{ev.date}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: MUTED }}>
              <MapPin size={12} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{ev.city}, {ev.state}</span>
            </div>
            {ev.spotsLeft !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} color={urg || MUTED} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: urg || MUTED }}>{ev.spotsLeft} spots left</span>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.8rem', color: MUTED, margin: '0 0 14px', lineHeight: 1.5 }}>{ev.desc}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f4f4f2' }}>{ev.cost}</span>
              {ev.spots && <span style={{ fontSize: '0.65rem', color: MUTED_2 }}>· {ev.spots} total spots</span>}
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onRegister}
              style={{
                padding: '7px 18px', borderRadius: 8, border: 'none',
                background: ev.registered ? 'rgba(74,222,128,0.12)' : FLAME_C,
                color: ev.registered ? '#4ade80' : '#fff',
                fontSize: '0.73rem', fontWeight: 800, letterSpacing: '0.04em',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {ev.registered
                ? <><CheckCircle2 size={13} /> Registered</>
                : <><ChevronRight size={13} /> Register</>}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const Events = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [registeredIds, setRegisteredIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch('/api/events')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load events (${r.status})`);
        return r.json() as Promise<ApiEvent[]>;
      })
      .then((data) => {
        setEvents(data.map((e) => mapApiEvent(e, registeredIds)));
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  // registeredIds intentionally omitted — only runs on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (id: number) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}') as { id?: number };
    const playerId = user.id;

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, playerId }),
      });

      if (!res.ok) {
        const body = await res.json() as { message?: string };
        if (res.status === 400 && body.message === 'Already registered for this event') {
          // treat as registered
        } else {
          console.error('Registration failed:', body.message);
          return;
        }
      }

      setRegisteredIds((prev) => new Set([...prev, id]));
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, registered: true, spotsLeft: e.spotsLeft !== null ? Math.max(0, e.spotsLeft - 1) : null }
            : e
        )
      );
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  const filtered = typeFilter === 'All' ? events : events.filter((e) => e.type === typeFilter);
  const registeredCount = events.filter((e) => e.registered).length;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 120px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}>
          <Trophy size={13} /> EVENTS
        </div>
        <h1 style={{ fontFamily: DISP, fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>
          Get On The Field.
        </h1>
        <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0 }}>
          Tournaments, camps, showcases, and combines. Where scouts are watching.
        </p>
      </div>

      {registeredCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 99, padding: '5px 12px', marginBottom: 20, fontSize: '0.72rem', fontWeight: 700, color: '#4ade80' }}>
          <CheckCircle2 size={13} /> {registeredCount} event{registeredCount !== 1 ? 's' : ''} registered
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, scrollbarWidth: 'none' }}>
        {TYPES.map((t) => (
          <motion.button key={t} whileTap={{ scale: 0.94 }} onClick={() => setTypeFilter(t)}
            style={{ padding: '6px 14px', borderRadius: 99, border: 'none', background: typeFilter === t ? (TYPE_COLOR[t] || FLAME_C) : 'rgba(255,255,255,0.05)', color: typeFilter === t ? '#fff' : MUTED, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
            {t}
          </motion.button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, padding: '14px 18px', background: INK_2, border: `1px solid ${LINE}`, borderRadius: 12 }}>
        {[
          { icon: <Calendar size={14} />, val: events.length, label: 'Events' },
          { icon: <Clock size={14} />, val: events.filter((e) => e.spotsLeft !== null && e.spotsLeft <= 20).length, label: 'Filling Fast' },
          { icon: <Trophy size={14} />, val: registeredCount, label: 'Registered' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: i === 2 && registeredCount > 0 ? '#4ade80' : MUTED_2 }}>{s.icon}</div>
            <div style={{ fontFamily: DISP, fontSize: '1.25rem', fontWeight: 900, color: i === 2 && registeredCount > 0 ? '#4ade80' : FLAME_C, letterSpacing: '-0.02em' }}>{s.val}</div>
            <div style={{ fontSize: '0.6rem', color: MUTED_2, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontSize: '0.85rem' }}>
          Loading events...
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#f87171', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: MUTED, fontSize: '0.85rem' }}>
          No events match this filter.
        </div>
      )}

      <AnimatePresence>
        {!loading && !error && filtered.map((ev) => (
          <EventCard key={ev.id} ev={ev} onRegister={() => register(ev.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};
