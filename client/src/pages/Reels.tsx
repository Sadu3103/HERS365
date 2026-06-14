import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX,
  Play, Pause, ChevronUp, ChevronDown, Flame,
} from 'lucide-react';
import { athleteAvatar } from '../lib/avatar';

const FLAME_C = '#ff5a2d';
const INK = '#0a0a0a';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const DISP = "'Barlow Condensed', sans-serif";

type Reel = {
  id: number;
  playerName: string;
  playerSchool: string;
  playerPos: string;
  caption: string;
  videoUrl: string | null;
  thumbUrl: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isSaved: boolean;
  tag: string;
};

const SEED: Reel[] = [
  { id: 1, playerName: 'Sarah Watkins', playerSchool: 'Westlake HS, TX', playerPos: 'QB', caption: 'Dropping dimes in the red zone 🏈 #FlagFootball #HERS365', videoUrl: null, thumbUrl: '', likes: 1240, comments: 84, isLiked: false, isSaved: false, tag: 'Highlight' },
  { id: 2, playerName: 'Maya Johnson', playerSchool: "St. Mary's Academy, FL", playerPos: 'WR', caption: 'Route running clinic — 4.71 speed after practice. Every rep counts.', videoUrl: null, thumbUrl: '', likes: 987, comments: 62, isLiked: true, isSaved: false, tag: 'Training' },
  { id: 3, playerName: 'Isabella Reyes', playerSchool: 'Centennial HS, CA', playerPos: 'DB', caption: 'Shutdown corner. Ranked #3 nationally. Come get it 💯', videoUrl: null, thumbUrl: '', likes: 2103, comments: 147, isLiked: false, isSaved: true, tag: 'Game Day' },
  { id: 4, playerName: 'Aaliyah Thompson', playerSchool: 'Oak Park HS, TX', playerPos: 'RB', caption: "Speed work with the squad before Friday's game 🔥", videoUrl: null, thumbUrl: '', likes: 756, comments: 39, isLiked: false, isSaved: false, tag: 'Training' },
  { id: 5, playerName: 'Kira Okonkwo', playerSchool: 'Lincoln HS, GA', playerPos: 'LB', caption: 'Film never lies. Three picks on the season. Started from the bottom 🎯', videoUrl: null, thumbUrl: '', likes: 1580, comments: 93, isLiked: false, isSaved: false, tag: 'Highlight' },
];

function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function ActionBtn({
  icon, count, active, color, onClick,
}: {
  icon: React.ReactNode; count?: number | string; active?: boolean; color?: string; onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? (color || FLAME_C) : 'rgba(255,255,255,0.75)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: active ? `${color || FLAME_C}22` : 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.18s',
      }}>
        {icon}
      </div>
      {count !== undefined && (
        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>
          {count}
        </span>
      )}
    </motion.button>
  );
}

function ReelCard({
  reel, isActive, onLike, onSave,
}: {
  reel: Reel; isActive: boolean; onLike: () => void; onSave: () => void;
}) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(isActive);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!reel.isLiked) onLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    }
    lastTap.current = now;
  }, [reel.isLiked, onLike]);

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'radial-gradient(120% 80% at 50% 0%, #1c130b 0%, #0a0a0a 60%)',
        overflow: 'hidden', borderRadius: 0,
        userSelect: 'none',
      }}
      onClick={handleDoubleTap}
    >
      {/* Background — real thumb/video poster when available */}
      {reel.thumbUrl && (
        <img
          src={reel.thumbUrl}
          alt={reel.playerName}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'brightness(0.55)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.25) 100%)',
      }} />

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 1 }}
            exit={{ scale: 2.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              color: FLAME_C, pointerEvents: 'none', zIndex: 10,
            }}
          >
            <Heart size={80} fill={FLAME_C} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag pill */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: `${FLAME_C}cc`,
        backdropFilter: 'blur(8px)',
        padding: '3px 10px', borderRadius: 99,
        fontSize: '0.65rem', fontWeight: 800,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff',
        zIndex: 3,
      }}>
        <Flame size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        {reel.tag}
      </div>

      {/* Mute / play toggle */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 3, display: 'flex', gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
          style={{
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer', color: '#fff',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }}
          style={{
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer', color: '#fff',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </motion.button>
      </div>

      {/* Right action sidebar */}
      <div style={{
        position: 'absolute', right: 14, bottom: 96,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
        zIndex: 5,
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <img
            src={athleteAvatar(reel.playerName)}
            alt={reel.playerName}
            style={{
              width: 46, height: 46, borderRadius: '50%',
              border: `2px solid ${FLAME_C}`,
              boxShadow: `0 0 16px ${FLAME_C}44`,
              objectFit: 'cover',
            }}
          />
          <div style={{
            position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
            background: FLAME_C, borderRadius: '50%', width: 18, height: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #000',
          }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>+</span>
          </div>
        </div>

        <ActionBtn
          icon={<Heart size={22} fill={reel.isLiked ? FLAME_C : 'none'} />}
          count={fmtCount(reel.likes)}
          active={reel.isLiked}
          onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); onLike(); }}
        />
        <ActionBtn
          icon={<MessageCircle size={22} />}
          count={fmtCount(reel.comments)}
          onClick={(e?: React.MouseEvent) => e?.stopPropagation()}
        />
        <ActionBtn
          icon={<Bookmark size={22} fill={reel.isSaved ? '#fff' : 'none'} />}
          active={reel.isSaved}
          color="#fff"
          onClick={(e?: React.MouseEvent) => { e?.stopPropagation(); onSave(); }}
        />
        <ActionBtn
          icon={<Share2 size={22} />}
          onClick={(e?: React.MouseEvent) => e?.stopPropagation()}
        />
      </div>

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 70,
        padding: '16px 16px 28px',
        zIndex: 4,
      }}>
        {/* Player */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            fontFamily: DISP, fontSize: '1.15rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#fff',
          }}>
            {reel.playerName}
          </span>
          <span style={{
            background: `${FLAME_C}22`, color: FLAME_C,
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em',
            textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5,
            border: `1px solid ${FLAME_C}33`,
          }}>
            {reel.playerPos}
          </span>
        </div>
        <div style={{ fontSize: '0.72rem', color: MUTED, marginBottom: 8, letterSpacing: '0.02em' }}>
          {reel.playerSchool}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45, margin: 0 }}>
          {reel.caption}
        </p>
      </div>
    </div>
  );
}

export const Reels = () => {
  const [reels, setReels] = useState<Reel[]>(SEED);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/posts?mediaType=video', { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data: any[] | null) => {
        if (!data || data.length === 0) return;
        setReels(data.map((p) => ({
          id: p.id,
          playerName: p.playerName || 'Athlete',
          playerSchool: p.playerSchool || 'HERS365',
          playerPos: p.playerPosition || 'ATH',
          caption: p.content || '',
          videoUrl: p.mediaUrl,
          thumbUrl: p.mediaUrl || '',
          likes: p.likes || 0,
          comments: p.comments || 0,
          isLiked: false,
          isSaved: false,
          tag: p.category || 'Highlight',
        })));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= reels.length) return;
    setActive(idx);
    const container = containerRef.current;
    if (container) {
      const child = container.children[idx] as HTMLElement;
      if (child) child.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [reels.length]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (isScrolling.current) return;
    isScrolling.current = true;
    if (e.deltaY > 40) goTo(active + 1);
    else if (e.deltaY < -40) goTo(active - 1);
    setTimeout(() => { isScrolling.current = false; }, 600);
  }, [active, goTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const toggleLike = (idx: number) => {
    setReels((prev) => prev.map((r, i) =>
      i === idx ? { ...r, isLiked: !r.isLiked, likes: r.likes + (r.isLiked ? -1 : 1) } : r
    ));
  };

  const toggleSave = (idx: number) => {
    setReels((prev) => prev.map((r, i) =>
      i === idx ? { ...r, isSaved: !r.isSaved } : r
    ));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: INK, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily: DISP, fontSize: '1.2rem', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fff',
        }}>
          REELS
        </span>
      </div>

      {/* Scroll container */}
      <div
        ref={containerRef}
        style={{
          flex: 1, overflowY: 'scroll', scrollSnapType: 'y mandatory',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        {reels.map((reel, idx) => (
          <div
            key={reel.id}
            style={{
              width: '100%', height: '100vh',
              scrollSnapAlign: 'start', scrollSnapStop: 'always',
              flexShrink: 0,
            }}
            onFocus={() => setActive(idx)}
          >
            <ReelCard
              reel={reel}
              isActive={active === idx}
              onLike={() => toggleLike(idx)}
              onSave={() => toggleSave(idx)}
            />
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 20, pointerEvents: 'none',
      }}>
        {reels.map((_, idx) => (
          <motion.div
            key={idx}
            animate={{ height: active === idx ? 20 : 6, background: active === idx ? FLAME_C : 'rgba(255,255,255,0.3)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{ width: 3, borderRadius: 99 }}
          />
        ))}
      </div>

      {/* Nav arrows — desktop only */}
      <div style={{
        position: 'absolute', right: 28, bottom: '50%', transform: 'translateY(50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 20,
      }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          style={{
            background: active === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.55)',
            border: `1px solid ${LINE}`, borderRadius: '50%',
            width: 38, height: 38, cursor: active === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: active === 0 ? '#333' : '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ChevronUp size={18} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => goTo(active + 1)}
          disabled={active === reels.length - 1}
          style={{
            background: active === reels.length - 1 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.55)',
            border: `1px solid ${LINE}`, borderRadius: '50%',
            width: 38, height: 38, cursor: active === reels.length - 1 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: active === reels.length - 1 ? '#333' : '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ChevronDown size={18} />
        </motion.button>
      </div>

      {/* Reel count */}
      <div style={{
        position: 'absolute', top: 56, left: 0, right: 0, zIndex: 20,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>
          {active + 1} / {reels.length}
        </span>
      </div>
    </div>
  );
};
