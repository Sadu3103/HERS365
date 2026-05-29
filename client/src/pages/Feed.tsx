import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreHorizontal, CheckCircle2, Play } from 'lucide-react';

interface Post {
  id: number;
  name: string;
  role: string;
  school: string;
  time: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  image?: string;
  isLiked: boolean;
  verified: boolean;
  isVideo?: boolean;
}

const posts: Post[] = [
  {
    id: 1,
    name: 'Sarah Watkins',
    role: 'QB',
    school: 'Westlake HS',
    time: '2h ago',
    content: 'Just clocked a 4.72 in the 40 at the Dallas Combine! Hard work paying off. Next stop: Elite 11 Finals.',
    tags: ['#Combine', '#40YardDash', '#Grind'],
    likes: 234, comments: 18, shares: 7,
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=800',
    isLiked: false, verified: true, isVideo: true,
  },
  {
    id: 2,
    name: 'Coach Martinez',
    role: 'Head Coach',
    school: 'Summit Prep',
    time: '4h ago',
    content: 'Proud of our girls for finishing top 3 at the State 7v7 Tournament. The future of flag football is bright!',
    tags: ['#Tournament', '#StateChamps'],
    likes: 456, comments: 32, shares: 12,
    isLiked: false, verified: true,
  },
  {
    id: 3,
    name: 'Maya Johnson',
    role: 'WR',
    school: "St. Mary's Academy",
    time: '5h ago',
    content: 'New highlight reel dropping tomorrow! 18 TDs this season. Thank you to my coaches and teammates for believing in me.',
    tags: ['#Highlights', '#Recruiting'],
    likes: 189, comments: 24, shares: 5,
    image: 'https://images.unsplash.com/photo-1541252260730-0412e3e2108e?auto=format&fit=crop&q=80&w=800',
    isLiked: true, verified: true, isVideo: true,
  },
  {
    id: 4,
    name: 'Isabella Reyes',
    role: 'DB',
    school: 'Centennial HS',
    time: '8h ago',
    content: 'Committed to Stanford for flag football! Dream come true. Go Cardinal! 🌲',
    tags: ['#Committed', '#Stanford', '#DreamSchool'],
    likes: 892, comments: 67, shares: 45,
    isLiked: false, verified: true,
  },
  {
    id: 5,
    name: 'NFL Flag',
    role: 'Official Account',
    school: '',
    time: '12h ago',
    content: 'The 2026 NFL Flag National Championships registration is now open! Register your team before spots fill up.',
    tags: ['#NFLFlag', '#Nationals', '#Register'],
    likes: 1203, comments: 89, shares: 234,
    isLiked: false, verified: true,
  },
];

const ranked = [
  { rank: 1, name: 'Sarah Watkins',  pos: 'QB', school: 'Westlake HS, TX',        score: 95 },
  { rank: 2, name: 'Maya Johnson',   pos: 'WR', school: "St. Mary's Academy, FL", score: 92 },
  { rank: 3, name: 'Isabella Reyes', pos: 'DB', school: 'Centennial HS, CA',       score: 91 },
  { rank: 4, name: 'Chloe Zhang',    pos: 'RB', school: 'Northwood HS, GA',        score: 90 },
  { rank: 5, name: "Emma O'Connor",  pos: 'QB', school: 'Summit Prep, CO',         score: 89 },
];

const inProgress = [
  { name: 'Elite QB Development',    done: 18, total: 24 },
  { name: 'Speed & Agility Mastery', done: 12, total: 18 },
];

const drills = [
  { id: 1, name: '3-Step Drop Progression', cat: 'QB',       dur: '15 min' },
  { id: 2, name: 'L-Drill Cone Work',        cat: 'Agility',  dur: '10 min' },
  { id: 3, name: 'Single-Leg RDL Series',    cat: 'Strength', dur: '12 min' },
  { id: 4, name: 'Hand Fighting Drills',     cat: 'DB',       dur: '8 min'  },
];

function formatNum(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <img
      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0 }}
    />
  );
}

export const Feed = () => {
  const navigate = useNavigate();
  const [feedPosts, setFeedPosts] = useState<Post[]>(posts);
  const [tab, setTab] = useState<'recent' | 'trending'>('recent');

  const toggleLike = (id: number) => {
    setFeedPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const sorted = tab === 'trending'
    ? [...feedPosts].sort((a, b) => b.likes - a.likes)
    : feedPosts;

  return (
    <div>

      {/* ── Hero Banner — full bleed ── */}
      <div style={{ position: 'relative', height: 380, overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=85&w=1600"
          alt="hero"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.25) 100%)',
        }} />
        {/* Subtle coral accent bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #ff5a2d 0%, transparent 60%)',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 52px',
        }}>
          <div style={{
            fontSize: '0.68rem', fontWeight: 800,
            letterSpacing: '0.35em', textTransform: 'uppercase',
            color: '#ff5a2d', marginBottom: 14,
          }}>
            NATIONAL RANKINGS 2025
          </div>

          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(2.8rem, 5vw, 4.2rem)',
            textTransform: 'uppercase',
            color: '#fff',
            lineHeight: 0.92,
            marginBottom: 20,
            letterSpacing: '-0.01em',
          }}>
            THE FUTURE<br />OF THE GAME.
          </h1>

          <p style={{
            fontSize: '0.88rem',
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 30,
            maxWidth: 400,
            lineHeight: 1.6,
          }}>
            Top female high school flag football athletes competing for D1 scholarships and national recognition.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => navigate('/rankings')}
              style={{
                background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.75)',
                borderRadius: 9999,
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                padding: '10px 24px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ff5a2d';
                e.currentTarget.style.borderColor = '#ff5a2d';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.75)';
              }}
            >
              VIEW RANKINGS →
            </button>
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 9999,
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '10px 20px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
            >
              MY PROFILE
            </button>
          </div>
        </div>
      </div>

      {/* ── Feed body ── */}
      <div style={{ display: 'flex', padding: '24px', gap: 24, maxWidth: 1200, margin: '0 auto' }}>

        {/* Main feed */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'STREAK', value: '12 Days', sub: 'Training streak',  path: '/training'  },
              { label: 'RANK',   value: 'Top 5%',  sub: 'Platform ranking', path: '/rankings'  },
              { label: 'NEXT',   value: '3 Days',  sub: 'Dallas Combine',   path: '/recruiting' },
            ].map(({ label, value, sub, path }) => (
              <button key={label} onClick={() => navigate(path)} style={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '18px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
              >
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.75rem', color: '#fff', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: '#666', marginTop: 4 }}>{sub}</div>
              </button>
            ))}
          </div>

          {/* Feed header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>The Grid</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['recent', 'trending'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: tab === t ? '#ff5a2d' : 'transparent',
                  color: tab === t ? '#fff' : '#666',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sorted.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="k-card-hover"
                style={{ overflow: 'hidden' }}
              >
                {post.image && (
                  <div style={{ position: 'relative', aspectRatio: '16/7', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                    <img src={post.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                    {post.isVideo && (
                      <button style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'rgba(255,90,45,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                        </div>
                      </button>
                    )}
                  </div>
                )}

                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={post.name} size={36} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: '0.87rem', fontWeight: 600, color: '#fff' }}>{post.name}</span>
                          {post.verified && <CheckCircle2 size={13} color="#ff5a2d" fill="#ff5a2d" />}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#666' }}>
                          {post.role}{post.school ? ` | ${post.school}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', color: '#555' }}>{post.time}</span>
                      <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 4 }}>
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.87rem', color: '#ccc', lineHeight: 1.55, marginBottom: 10 }}>{post.content}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {post.tags.map(t => (
                      <span key={t} style={{ fontSize: '0.75rem', color: '#ff5a2d', fontWeight: 500 }}>{t}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                    <button
                      onClick={() => toggleLike(post.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: post.isLiked ? '#ff5a2d' : '#555',
                        fontSize: '0.78rem', fontWeight: 600,
                        transition: 'color 0.15s',
                      }}
                    >
                      <Heart size={15} fill={post.isLiked ? '#ff5a2d' : 'none'} />
                      {formatNum(post.likes)}
                    </button>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#555', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      <MessageCircle size={15} />
                      {post.comments}
                    </button>
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#555', fontSize: '0.78rem', fontWeight: 600,
                      marginLeft: 'auto',
                    }}>
                      <Share2 size={15} />
                      {post.shares}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top Ranked */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Top Ranked</span>
              <button onClick={() => navigate('/rankings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#ff5a2d', fontWeight: 600 }}>View All</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ranked.map(({ rank, name, pos, school, score }) => (
                <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444', width: 14, textAlign: 'right', flexShrink: 0 }}>{rank}</span>
                  <Avatar name={name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#555' }}>{pos} | {school}</div>
                  </div>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#ff5a2d', flexShrink: 0 }}>{score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>In Progress</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {inProgress.map(({ name, done, total }) => {
                const pct = Math.round((done / total) * 100);
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 500 }}>{name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#555' }}>{done}/{total} sessions</span>
                    </div>
                    <div className="k-progress-track">
                      <div className="k-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Drills */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Recommended Drills</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {drills.map(({ id, name, cat, dur }) => (
                <button
                  key={id}
                  onClick={() => navigate('/training')}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    textAlign: 'left', width: '100%',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#ccc', fontWeight: 500 }}>{name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 2 }}>{cat} · {dur}</div>
                  </div>
                  <Play size={13} color="#ff5a2d" style={{ flexShrink: 0, marginLeft: 8 }} />
                </button>
              ))}
            </div>
          </div>

          {/* NIL Compliance */}
          <div className="k-card" style={{ padding: '18px 16px', borderColor: 'rgba(255,90,45,0.15)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ff5a2d', marginBottom: 10 }}>NIL Compliance</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', color: '#fff' }}>94%</span>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#ccc', fontWeight: 500 }}>Profile Complete</div>
                <div style={{ fontSize: '0.7rem', color: '#ff5a2d', marginTop: 2 }}>2 items pending</div>
              </div>
            </div>
            <div className="k-progress-track">
              <div className="k-progress-fill" style={{ width: '94%' }} />
            </div>
            <button
              onClick={() => navigate('/audit')}
              style={{
                marginTop: 12, width: '100%', background: 'none',
                border: '1px solid rgba(255,90,45,0.3)', borderRadius: 6,
                color: '#ff5a2d', fontSize: '0.72rem', fontWeight: 700,
                padding: '7px', cursor: 'pointer', letterSpacing: '0.06em',
              }}
            >
              VIEW DETAILS →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
