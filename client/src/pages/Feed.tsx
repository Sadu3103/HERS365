import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { athleteAvatar } from '../lib/avatar';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Play,
  BadgeCheck,
  Flame,
  Flag,
  EyeOff,
  UserX,
  TrendingUp,
  Clock,
  Trophy,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import {
  FLAME,
  FLAME_SOFT,
  INK,
  INK_2,
  INK_3,
  LINE,
  LINE_2,
  MUTED,
  MUTED_2,
  DISP,
  BODY,
  reveal,
  glowBlob,
  kicker,
  disp,
} from '../lib/theme';

interface PostData {
  id: number;
  user: { name: string; avatar: string | null };
  time: string;
  content: string;
  image?: string;
  likes: string;
  comments: string;
  highlights: boolean;
  isLiked?: boolean;
}

// ── Fictional seed athletes (story rail) — no real PII ──
const STORY_ATHLETES = [
  { name: 'Sarah W.', rating: 92, live: true },
  { name: 'Maya J.', rating: 89, live: false },
  { name: 'Zoe R.', rating: 87, live: true },
  { name: 'Aaliyah B.', rating: 85, live: false },
  { name: 'Nina T.', rating: 84, live: false },
  { name: 'Riley C.', rating: 82, live: true },
  { name: 'Jade M.', rating: 80, live: false },
  { name: 'Tia H.', rating: 79, live: false },
];

// Deterministic rating per post author (so the chip is stable across renders).
function ratingFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 78 + (h % 18); // 78–95
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Animated counter chip used in the action bar ──
function CountPulse({ value, active }: { value: string; active?: boolean }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value + String(active)}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        style={{
          fontFamily: DISP,
          fontWeight: 800,
          fontSize: '.82rem',
          letterSpacing: '.1em',
          display: 'inline-block',
        }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

const PostCard = ({
  post,
  index,
  onLike,
  onComment,
  onShare,
  onUserClick,
  onMenuClick,
  onHighlightClick,
  onPostClick
}: {
  post: PostData;
  index: number;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
  onShare: (postId: number) => void;
  onUserClick: (userId: string) => void;
  onMenuClick: (postId: number) => void;
  onHighlightClick: (postId: number) => void;
  onPostClick: (postId: number) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotifications();

  const rating = ratingFor(post.user.name);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.06, 0.3), ease: [0.2, 0.8, 0.2, 1] }}
      onClick={() => onPostClick(post.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: `linear-gradient(165deg, ${INK_3}, ${INK_2})`,
        border: `1px solid ${hovered ? 'rgba(255,90,45,0.34)' : LINE}`,
        borderRadius: 22,
        marginBottom: 22,
        cursor: 'pointer',
        overflow: 'hidden',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 22px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,90,45,0.12)'
          : '0 12px 34px rgba(0,0,0,0.4)',
        transition: 'transform .3s cubic-bezier(0.2,0.8,0.2,1), border-color .3s, box-shadow .3s',
      }}
    >
      {/* top flame hairline that lights on hover */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${FLAME}, ${FLAME_SOFT}, transparent)`,
          opacity: hovered ? 0.9 : 0,
          transition: 'opacity .3s',
          pointerEvents: 'none',
        }}
      />

      <div style={{ padding: 22 }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserClick(post.user.name);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              minWidth: 0,
            }}
          >
            {/* Avatar with flame ring */}
            <span
              style={{
                position: 'relative',
                width: 48,
                height: 48,
                borderRadius: '50%',
                flexShrink: 0,
                padding: 2,
                background: `conic-gradient(from 140deg, ${FLAME}, ${FLAME_SOFT}, ${FLAME})`,
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: INK,
                  border: `2px solid ${INK}`,
                  fontFamily: DISP,
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: FLAME_SOFT,
                  letterSpacing: '.02em',
                }}
              >
                {post.user.avatar ? (
                  <img
                    src={post.user.avatar}
                    alt={post.user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials(post.user.name)
                )}
              </span>
            </span>

            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    ...disp,
                    fontWeight: 800,
                    fontSize: '1.02rem',
                    color: '#f4f4f2',
                    letterSpacing: '.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {post.user.name}
                </span>
                <BadgeCheck size={15} style={{ color: FLAME, flexShrink: 0 }} fill="rgba(255,90,45,0.16)" />
                {/* rating chip */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '2px 7px',
                    borderRadius: 9999,
                    background: 'rgba(255,90,45,0.12)',
                    border: '1px solid rgba(255,90,45,0.28)',
                    fontFamily: DISP,
                    fontWeight: 900,
                    fontSize: '.64rem',
                    letterSpacing: '.08em',
                    color: FLAME_SOFT,
                    flexShrink: 0,
                  }}
                >
                  <Flame size={10} style={{ color: FLAME }} fill={FLAME} />
                  {rating}
                </span>
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '.68rem',
                  fontWeight: 700,
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: MUTED_2,
                  marginTop: 3,
                  fontFamily: DISP,
                }}
              >
                <Clock size={11} style={{ color: MUTED_2 }} />
                {post.time}
              </span>
            </span>
          </button>

          <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              aria-label="Post options"
              style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: menuOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                color: menuOpen ? '#f4f4f2' : MUTED,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f4f4f2'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = 'transparent'; } }}
            >
              <MoreHorizontal size={20} />
            </button>

            {/* Post Menu Dropdown */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 196,
                    background: 'rgba(17,17,17,0.96)',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    border: `1px solid ${LINE_2}`,
                    borderRadius: 16,
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                    zIndex: 50,
                    overflow: 'hidden',
                    padding: 6,
                  }}
                >
                  {[
                    {
                      Icon: Flag,
                      label: 'Report Post',
                      danger: true,
                      run: () => {
                        onMenuClick(post.id);
                        showNotification('success', 'Post Reported', 'Thank you for keeping the community safe!');
                      },
                    },
                    {
                      Icon: EyeOff,
                      label: 'Hide Post',
                      danger: false,
                      run: () => showNotification('info', 'Post Hidden', 'This post has been hidden from your feed.'),
                    },
                    {
                      Icon: UserX,
                      label: 'Block User',
                      danger: false,
                      run: () => showNotification('info', 'User Blocked', 'You will no longer see content from this user.'),
                    },
                  ].map(({ Icon, label, danger, run }) => (
                    <button
                      key={label}
                      onClick={(e) => {
                        e.stopPropagation();
                        run();
                        setMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 11,
                        padding: '11px 12px',
                        borderRadius: 11,
                        border: 'none',
                        background: 'transparent',
                        color: danger ? '#f87171' : MUTED,
                        fontSize: '.86rem',
                        fontWeight: 600,
                        fontFamily: BODY,
                        cursor: 'pointer',
                        transition: 'background .15s, color .15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = danger ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.color = danger ? '#fca5a5' : '#f4f4f2';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = danger ? '#f87171' : MUTED;
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Post text ── */}
        <p
          style={{
            color: '#d8d8d4',
            margin: '0 0 16px',
            fontSize: '1rem',
            lineHeight: 1.62,
            fontFamily: BODY,
          }}
        >
          {post.content}
        </p>

        {/* ── Highlight thumbnail (placeholder + Play overlay — never real media) ── */}
        {post.image && (
          <div
            style={{
              position: 'relative',
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${hovered ? 'rgba(255,90,45,0.3)' : LINE}`,
              marginBottom: 16,
              aspectRatio: '16 / 9',
              background: `radial-gradient(120% 120% at 30% 10%, ${INK_3}, ${INK} 70%)`,
              transition: 'border-color .4s',
            }}
          >
            {/* texture/grain inside the frame */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.5,
                backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(circle at 50% 50%,#000,transparent 75%)',
                WebkitMaskImage: 'radial-gradient(circle at 50% 50%,#000,transparent 75%)',
                pointerEvents: 'none',
              }}
            />
            {/* flame glow */}
            <span style={glowBlob({ size: 280, top: -90, right: -60, opacity: 0.3, strength: 0.45 })} />

            {/* HIGHLIGHT tag */}
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 9px',
                borderRadius: 9999,
                background: 'rgba(10,10,10,0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: `1px solid ${LINE_2}`,
                fontFamily: DISP,
                fontWeight: 800,
                fontSize: '.6rem',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: '#f4f4f2',
              }}
            >
              <Flame size={11} style={{ color: FLAME }} fill={FLAME} />
              Highlight Reel
            </span>

            {/* Center Play button overlay (scales on hover) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHighlightClick(post.id);
              }}
              aria-label="Play highlight"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `radial-gradient(circle, ${FLAME}, #cc3a12)`,
                  boxShadow: hovered
                    ? '0 0 0 10px rgba(255,90,45,0.12), 0 14px 34px rgba(255,90,45,0.5)'
                    : '0 10px 26px rgba(255,90,45,0.4)',
                  transform: hovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform .3s cubic-bezier(0.2,0.8,0.2,1), box-shadow .3s',
                }}
              >
                <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
              </span>
            </button>

            {/* runtime chip bottom-right */}
            <span
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                padding: '3px 8px',
                borderRadius: 7,
                background: 'rgba(10,10,10,0.7)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                fontFamily: DISP,
                fontWeight: 700,
                fontSize: '.66rem',
                letterSpacing: '.06em',
                color: MUTED,
              }}
            >
              0:42
            </span>
          </div>
        )}

        {/* ── Inline stat row (shown on posts with a highlight reel) ── */}
        {post.highlights && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              { k: '40 DASH', v: '5.1s' },
              { k: 'VERTICAL', v: '24"' },
              { k: 'CATCHES', v: '7' },
            ].map(s => (
              <div
                key={s.k}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${LINE}`,
                }}
              >
                <div style={{ fontFamily: DISP, fontWeight: 900, fontSize: '1.25rem', color: '#f4f4f2', lineHeight: 1 }}>
                  {s.v}
                </div>
                <div
                  style={{
                    fontFamily: DISP,
                    fontWeight: 700,
                    fontSize: '.58rem',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: MUTED_2,
                    marginTop: 5,
                  }}
                >
                  {s.k}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Action bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingTop: 14,
            borderTop: `1px solid ${LINE}`,
          }}
        >
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id);
            }}
            aria-label="Like"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 40,
              padding: '0 12px',
              borderRadius: 11,
              border: 'none',
              background: post.isLiked ? 'rgba(255,90,45,0.12)' : 'transparent',
              color: post.isLiked ? FLAME : MUTED,
              cursor: 'pointer',
              transition: 'background .2s, color .2s',
            }}
            onMouseEnter={e => { if (!post.isLiked) e.currentTarget.style.color = FLAME_SOFT; }}
            onMouseLeave={e => { if (!post.isLiked) e.currentTarget.style.color = MUTED; }}
          >
            <motion.span
              key={String(post.isLiked)}
              initial={{ scale: 0.6 }}
              animate={{ scale: post.isLiked ? [1, 1.35, 1] : 1 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ display: 'flex' }}
            >
              <Heart size={18} fill={post.isLiked ? FLAME : 'transparent'} />
            </motion.span>
            <CountPulse value={post.likes} active={post.isLiked} />
          </button>

          {/* Comment */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment(post.id);
            }}
            aria-label="Comment"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 40,
              padding: '0 12px',
              borderRadius: 11,
              border: 'none',
              background: 'transparent',
              color: MUTED,
              cursor: 'pointer',
              transition: 'color .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f4f4f2'; }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED; }}
          >
            <MessageCircle size={18} />
            <CountPulse value={post.comments} />
          </button>

          {/* Share (pushed right) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(post.id);
            }}
            aria-label="Share"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 40,
              padding: '0 12px',
              borderRadius: 11,
              border: 'none',
              background: 'transparent',
              color: MUTED,
              cursor: 'pointer',
              marginLeft: 'auto',
              transition: 'color .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f4f4f2'; }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED; }}
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </motion.article>
  );
};

interface RankedAthlete {
  id: number;
  name: string;
  position?: string;
  school?: string;
  rating?: number;
  score?: number;
}

interface PostApiRow {
  id: number;
  playerName?: string;
  createdAt?: string;
  content?: string;
  mediaType?: string;
  mediaUrl?: string;
  likes?: number;
  comments?: number;
  category?: string;
}

interface AthletesResponse {
  data?: unknown[];
}

interface RankingsResponse {
  data?: RankedAthlete[];
}

function parseLikeCount(s: string): number {
  if (s.endsWith('K')) return parseFloat(s) * 1000;
  return parseInt(s, 10) || 0;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export const Feed = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [feedType, setFeedType] = useState<'recent' | 'trending'>('recent');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // [#260] Cursor pagination + surfaced error state for the feed.
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [athleteCount, setAthleteCount] = useState<number | null>(null);
  const [topAthletes, setTopAthletes] = useState<RankedAthlete[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  const POSTS_PER_PAGE = 20;

  const mapPostRows = (rows: PostApiRow[]): PostData[] => rows.map((p) => ({
    id: p.id,
    user: { name: p.playerName || 'Athlete', avatar: null },
    time: p.createdAt ? timeAgo(p.createdAt) : '',
    content: p.content || '',
    image: p.mediaType === 'image' ? p.mediaUrl : undefined,
    likes: fmtCount(p.likes ?? 0),
    comments: fmtCount(p.comments ?? 0),
    highlights: p.mediaType === 'video' || p.category === 'game',
    isLiked: false,
  }));

  // [#260] Load a page of posts. `before` (a post id) loads the next page and
  // appends; omitting it (re)loads the first page. Errors are surfaced, not
  // swallowed, so the UI can show a retry affordance.
  const loadPosts = useCallback(async (opts?: { before?: number; signal?: AbortSignal }) => {
    const append = opts?.before != null;
    if (append) setLoadingMore(true); else setIsLoading(true);
    setPostsError(null);
    try {
      const qs = new URLSearchParams({ limit: String(POSTS_PER_PAGE) });
      if (opts?.before != null) qs.set('before', String(opts.before));
      const res = await fetch(`/api/posts?${qs.toString()}`, { signal: opts?.signal });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const rows: PostApiRow[] = Array.isArray(data) ? data : [];
      const mapped = mapPostRows(rows);
      setPosts((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore(rows.length === POSTS_PER_PAGE);
      if (rows.length > 0) setCursor(rows[rows.length - 1].id);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setPostsError('Could not load the feed. Check your connection and try again.');
    } finally {
      if (append) setLoadingMore(false); else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    loadPosts({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [loadPosts]);

  useEffect(() => {
    fetch('/api/athletes')
      .then(r => r.json())
      .then((res: AthletesResponse) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setAthleteCount(list.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/rankings?limit=4')
      .then(r => r.json())
      .then((data: RankedAthlete[] | RankingsResponse | null) => {
        const rows = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        setTopAthletes(rows.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setTopLoading(false));
  }, []);

  const displayedPosts = feedType === 'trending'
    ? [...posts].sort((a, b) => parseLikeCount(b.likes) - parseLikeCount(a.likes))
    : posts;

  const handleLike = (postId: number) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked }
          : post
      )
    );
  };

  const handleComment = (_postId: number) => {
    showNotification('info', 'Coming Soon', 'Comments are on the way — stay tuned!');
  };

  const handleShare = (postId: number) => {
    const postUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      showNotification('success', 'Link Copied', 'Post link copied to clipboard!');
    }).catch(() => {
      showNotification('error', 'Copy Failed', `Share this link: ${postUrl}`);
    });
  };

  const handleUserClick = (userName: string) => {
    // Navigate to user profile
    navigate(`/profile/${encodeURIComponent(userName)}`);
  };

  const handleMenuClick = (_postId: number) => {
    // Handle menu actions (report, hide, block)
    // This is handled in the individual menu buttons
  };

  const handleHighlightClick = (postId: number) => {
    // Navigate to highlight video or open video player
    navigate(`/highlights/${postId}`);
  };

  const handlePostClick = (postId: number) => {
    // Navigate to detailed post view
    navigate(`/post/${postId}`);
  };

  const tabs: { key: 'recent' | 'trending'; label: string; Icon: React.ElementType }[] = [
    { key: 'recent', label: 'Recent', Icon: Clock },
    { key: 'trending', label: 'Trending', Icon: TrendingUp },
  ];

  return (
    <div
      className="feed-page-wrap"
      style={{
        position: 'relative',
        maxWidth: 1060,
        margin: '0 auto',
        padding: '24px 24px 64px',
        color: '#f4f4f2',
        fontFamily: BODY,
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start',
      }}
    >
      {/* ── Main feed column ── */}
      <div
        className="feed-root"
        style={{
          position: 'relative',
          flex: '1 1 0',
          minWidth: 0,
        }}
      >
      {/* Flame glow blobs (absolute, inside relative wrapper) */}
      <div style={glowBlob({ size: 520, top: -160, left: '50%', opacity: 0.16, strength: 0.5 })} />
      <div style={glowBlob({ size: 360, top: 520, right: -120, opacity: 0.1, strength: 0.4 })} />

      {/* ── Page header ── */}
      <motion.header {...reveal} style={{ position: 'relative', zIndex: 1, marginBottom: 22 }}>
        <div style={kicker}>The Feed · Live</div>
        <h1
          style={{
            ...disp,
            fontWeight: 900,
            fontSize: 'clamp(2.4rem, 7vw, 3.4rem)',
            margin: 0,
          }}
        >
          THE <span style={{ color: FLAME }}>GRID</span>
        </h1>
        <p style={{ color: MUTED, fontSize: '.98rem', margin: '10px 0 0', maxWidth: 460, lineHeight: 1.5 }}>
          Every rep, every offer, every breakout moment — straight from the athletes on the rise.
        </p>
        {athleteCount !== null && (
          <p style={{
            color: FLAME_SOFT,
            fontSize: '.78rem',
            fontFamily: DISP,
            fontWeight: 700,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            margin: '8px 0 0',
          }}>
            {athleteCount} {athleteCount === 1 ? 'athlete' : 'athletes'} on the grid
          </p>
        )}
      </motion.header>

      {/* ── Story rail (top-ranked athletes) ── */}
      <motion.section
        {...reveal}
        transition={{ ...reveal.transition, delay: 0.05 }}
        style={{ position: 'relative', zIndex: 1, marginBottom: 26 }}
      >
        <div
          className="story-rail"
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 10,
            margin: '0 -24px',
            paddingLeft: 24,
            paddingRight: 24,
            scrollSnapType: 'x proximity',
          }}
        >
          {/* "Your story" add tile */}
          <button
            onClick={() => navigate('/profile')}
            aria-label="Add to your story"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              flexShrink: 0,
              scrollSnapAlign: 'start',
            }}
          >
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: `2px dashed ${LINE_2}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: FLAME,
                fontSize: '1.6rem',
                fontFamily: DISP,
                fontWeight: 400,
                lineHeight: 1,
                transition: 'border-color .2s, color .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = FLAME; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = LINE_2; }}
            >
              +
            </span>
            <span
              style={{
                fontFamily: DISP,
                fontWeight: 700,
                fontSize: '.66rem',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: MUTED,
              }}
            >
              You
            </span>
          </button>

          {STORY_ATHLETES.map((a, i) => (
            <motion.button
              key={a.name}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.04, 0.25), ease: [0.2, 0.8, 0.2, 1] }}
              onClick={() => handleUserClick(a.name)}
              aria-label={`View ${a.name}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                width: 72,
                scrollSnapAlign: 'start',
              }}
            >
              <span style={{ position: 'relative' }}>
                {/* flame ring */}
                <span
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    padding: 2.5,
                    background: `conic-gradient(from 120deg, ${FLAME}, ${FLAME_SOFT}, ${FLAME})`,
                    display: 'block',
                    boxShadow: '0 6px 18px rgba(255,90,45,0.28)',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `2px solid ${INK}`,
                      background: INK_3,
                    }}
                  >
                    <img
                      src={athleteAvatar(a.name)}
                      alt={a.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </span>
                </span>

                {/* rating badge */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    minWidth: 22,
                    height: 22,
                    padding: '0 4px',
                    borderRadius: 9999,
                    background: INK,
                    border: `1.5px solid ${FLAME}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: DISP,
                    fontWeight: 900,
                    fontSize: '.62rem',
                    color: FLAME_SOFT,
                    letterSpacing: '.02em',
                  }}
                >
                  {a.rating}
                </span>

                {a.live && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#4ade80',
                      border: `2px solid ${INK}`,
                    }}
                  />
                )}
              </span>
              <span
                style={{
                  fontFamily: DISP,
                  fontWeight: 700,
                  fontSize: '.66rem',
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: MUTED,
                  whiteSpace: 'nowrap',
                  maxWidth: 72,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {a.name}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── Feed tabs ── */}
      <motion.div
        {...reveal}
        transition={{ ...reveal.transition, delay: 0.1 }}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <h2 style={{ ...disp, fontWeight: 900, fontSize: '1.3rem', color: '#f4f4f2', margin: 0 }}>
          Latest Drops
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 9999,
            background: INK_3,
            border: `1px solid ${LINE}`,
          }}
        >
          {tabs.map(({ key, label, Icon }) => {
            const active = feedType === key;
            return (
              <button
                key={key}
                onClick={() => setFeedType(key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 36,
                  padding: '0 14px',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: active ? '#fff' : MUTED,
                  fontFamily: DISP,
                  fontWeight: 800,
                  fontSize: '.72rem',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  transition: 'color .2s',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="feed-tab-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 9999,
                      background: FLAME,
                      boxShadow: '0 4px 14px rgba(255,90,45,0.34)',
                      zIndex: 0,
                    }}
                  />
                )}
                <Icon size={13} style={{ position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Post column ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                  <div>
                    <div style={{ width: 120, height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
                    <div style={{ width: 60, height: 9, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
                <div style={{ width: '90%', height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
                <div style={{ width: '70%', height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
              </div>
            ))}
          </div>
        )}
        {!isLoading && displayedPosts.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            index={i}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onUserClick={handleUserClick}
            onMenuClick={handleMenuClick}
            onHighlightClick={handleHighlightClick}
            onPostClick={handlePostClick}
          />
        ))}

        {/* [#260] Error state — initial load failed, with retry */}
        {!isLoading && postsError && posts.length === 0 && (
          <motion.div
            {...reveal}
            style={{ textAlign: 'center', padding: '64px 20px 40px' }}
          >
            <div style={{
              fontFamily: DISP, fontWeight: 800, fontSize: '1.4rem',
              textTransform: 'uppercase', letterSpacing: '.02em',
              color: '#f4f4f2', marginBottom: 10,
            }}>
              Couldn't load the feed
            </div>
            <div style={{ fontSize: '.88rem', color: MUTED, maxWidth: 360, margin: '0 auto 18px', lineHeight: 1.5 }}>
              {postsError}
            </div>
            <button
              onClick={() => loadPosts()}
              style={{
                fontFamily: DISP, fontWeight: 700, fontSize: '.72rem', letterSpacing: '.16em',
                textTransform: 'uppercase', color: '#0a0a0a', background: FLAME,
                border: 'none', borderRadius: 999, padding: '10px 22px', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </motion.div>
        )}

        {!isLoading && !postsError && posts.length === 0 && (
          <motion.div
            {...reveal}
            style={{ textAlign: 'center', padding: '72px 20px 40px' }}
          >
            <div style={{
              fontFamily: DISP, fontWeight: 800, fontSize: '1.5rem',
              textTransform: 'uppercase', letterSpacing: '.02em',
              color: '#f4f4f2', marginBottom: 10,
            }}>
              The grid is quiet
            </div>
            <div style={{ fontSize: '.88rem', color: MUTED, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
              No highlights have dropped yet. Post your first rep and get on the board.
            </div>
          </motion.div>
        )}

        {/* [#260] Load more — keyset pagination */}
        {!isLoading && posts.length > 0 && hasMore && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '20px 0 0' }}>
            {postsError && (
              <div style={{ color: '#f87171', fontSize: '.82rem', textAlign: 'center' }}>{postsError}</div>
            )}
            <button
              onClick={() => { if (cursor != null) loadPosts({ before: cursor }); }}
              disabled={loadingMore}
              style={{
                fontFamily: DISP, fontWeight: 700, fontSize: '.72rem', letterSpacing: '.16em',
                textTransform: 'uppercase', color: '#f4f4f2', background: 'transparent',
                border: `1px solid ${LINE}`, borderRadius: 999, padding: '11px 26px',
                cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        {/* end-of-feed marker */}
        {!isLoading && posts.length > 0 && !hasMore && (
        <motion.div
          {...reveal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            margin: '8px 0 0',
            color: MUTED_2,
          }}
        >
          <span style={{ flex: 1, height: 1, background: LINE }} />
          <span
            style={{
              fontFamily: DISP,
              fontWeight: 700,
              fontSize: '.66rem',
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            You're all caught up
          </span>
          <span style={{ flex: 1, height: 1, background: LINE }} />
        </motion.div>
        )}
      </div>

      <style>{`
        .story-rail::-webkit-scrollbar { height: 0; }
        .story-rail { scrollbar-width: none; }
        @media (max-width: 900px) {
          .feed-root { padding: 0; }
          .feed-sidebar { display: none !important; }
          .feed-page-wrap { padding: 20px 18px 56px; }
        }
        @media (max-width: 600px) {
          .feed-page-wrap { padding: 16px 14px 48px; }
        }
      `}</style>
      </div>

      {/* ── Right sidebar ── */}
      <aside
        className="feed-sidebar"
        style={{
          width: 260,
          flexShrink: 0,
          position: 'sticky',
          top: 24,
        }}
      >
        {/* Top Athletes widget */}
        <motion.div
          {...reveal}
          style={{
            background: `linear-gradient(165deg, ${INK_3}, ${INK_2})`,
            border: `1px solid ${LINE}`,
            borderRadius: 18,
            padding: 20,
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <Trophy size={15} style={{ color: FLAME }} />
            <span style={{
              fontFamily: DISP,
              fontWeight: 900,
              fontSize: '.72rem',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: FLAME_SOFT,
            }}>
              Top Athletes
            </span>
          </div>

          {topLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '60%', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.07)', marginBottom: 5 }} />
                    <div style={{ width: '40%', height: 8, borderRadius: 5, background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!topLoading && topAthletes.length === 0 && (
            <p style={{ fontSize: '.8rem', color: MUTED, margin: 0, lineHeight: 1.5 }}>
              Rankings coming soon — check back once athletes are rated.
            </p>
          )}

          {!topLoading && topAthletes.map((a, i) => (
            <button
              key={a.id}
              onClick={() => navigate(`/profile/${a.id}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '8px 0',
                cursor: 'pointer',
                borderBottom: i < topAthletes.length - 1 ? `1px solid ${LINE}` : 'none',
                textAlign: 'left',
              }}
            >
              <span style={{
                fontFamily: DISP,
                fontWeight: 900,
                fontSize: '.72rem',
                color: i === 0 ? FLAME : MUTED_2,
                width: 18,
                flexShrink: 0,
                letterSpacing: '.04em',
              }}>
                #{i + 1}
              </span>
              <span style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `conic-gradient(from 120deg, ${FLAME}, ${FLAME_SOFT}, ${FLAME})`,
                padding: 2,
                flexShrink: 0,
                display: 'block',
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: INK,
                  overflow: 'hidden',
                  fontFamily: DISP,
                  fontWeight: 900,
                  fontSize: '.6rem',
                  color: FLAME_SOFT,
                }}>
                  {initials(a.name ?? '')}
                </span>
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  display: 'block',
                  fontFamily: DISP,
                  fontWeight: 800,
                  fontSize: '.82rem',
                  color: '#f4f4f2',
                  letterSpacing: '.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {a.name ?? '—'}
                </span>
                {(a.position || a.school) && (
                  <span style={{
                    display: 'block',
                    fontSize: '.66rem',
                    color: MUTED_2,
                    fontFamily: DISP,
                    fontWeight: 700,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {[a.position, a.school].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
              {(a.rating ?? a.score) !== undefined && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 9999,
                  background: 'rgba(255,90,45,0.12)',
                  border: '1px solid rgba(255,90,45,0.28)',
                  fontFamily: DISP,
                  fontWeight: 900,
                  fontSize: '.62rem',
                  letterSpacing: '.06em',
                  color: FLAME_SOFT,
                  flexShrink: 0,
                }}>
                  <Flame size={9} style={{ color: FLAME }} fill={FLAME} />
                  {a.rating ?? a.score}
                </span>
              )}
            </button>
          ))}
        </motion.div>
      </aside>
    </div>
  );
};
