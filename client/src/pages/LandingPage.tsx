import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Play, ArrowRight, Crosshair, Megaphone, Share2 } from 'lucide-react';
import { athleteAvatar } from '../lib/avatar';

const FLAME = '#ff5a2d';
const FLAME_SOFT = '#ff8c66';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const INK_3 = '#161616';
const LINE = 'rgba(255,255,255,0.07)';
const LINE_2 = 'rgba(255,255,255,0.12)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

const css = `
  *,*::before,*::after{box-sizing:border-box}

  .lp-grain::before{content:'';position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.04;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}

  /* Buttons */
  .lp-btn{font-family:${DISP};font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:.92rem;
    padding:13px 26px;border-radius:9999px;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:9px;
    transition:transform .18s cubic-bezier(.25,1,.5,1),box-shadow .22s,border-color .22s,color .22s;
    text-decoration:none;position:relative;overflow:hidden;white-space:nowrap}
  .lp-btn-primary{background:${FLAME};color:#fff;box-shadow:0 6px 22px rgba(255,90,45,.32)}
  .lp-btn-primary::after{content:'';position:absolute;inset:0;
    background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.22) 50%,transparent 100%);
    transform:translateX(-110%);transition:transform .6s cubic-bezier(.25,1,.5,1);pointer-events:none}
  .lp-btn-primary:hover{transform:translateY(-2px) scale(1.015);box-shadow:0 14px 36px rgba(255,90,45,.54)}
  .lp-btn-primary:hover::after{transform:translateX(110%)}
  .lp-btn-ghost{background:transparent;color:#f4f4f2;border:1px solid ${LINE_2}}
  .lp-btn-ghost::after{content:'';position:absolute;inset:0;background:rgba(255,90,45,.06);
    transform:scaleX(0);transform-origin:left;transition:transform .3s cubic-bezier(.25,1,.5,1);pointer-events:none}
  .lp-btn-ghost:hover{border-color:${FLAME};color:${FLAME}}
  .lp-btn-ghost:hover::after{transform:scaleX(1)}

  /* Nav */
  .lp-nav-link{color:${MUTED};font-weight:600;font-size:.84rem;text-decoration:none;
    transition:color .22s;position:relative;display:inline-block;padding-bottom:2px}
  .lp-nav-link::after{content:'';position:absolute;bottom:-1px;left:0;width:0;height:1.5px;
    background:${FLAME};border-radius:9999px;transition:width .35s cubic-bezier(.25,1,.5,1)}
  .lp-nav-link:hover{color:#f4f4f2}
  .lp-nav-link:hover::after{width:100%}

  /* Cards */
  .lp-card{transition:transform .28s cubic-bezier(.25,1,.5,1),border-color .28s,box-shadow .28s}
  .lp-card:hover{transform:translateY(-5px);border-color:rgba(255,90,45,.38);
    box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 0 1px rgba(255,90,45,.14),0 6px 28px rgba(255,90,45,.1)}

  /* Clip-text hover reveal */
  .clip-wrap{position:relative;display:inline-block}
  .clip-fg{position:absolute;top:0;left:0;width:100%;height:100%;
    color:${FLAME};clip-path:inset(0 100% 0 0);transition:clip-path .5s cubic-bezier(.25,1,.5,1);pointer-events:none;
    white-space:inherit}
  .clip-trigger{display:inline-block;cursor:default}
  .clip-trigger:hover .clip-fg{clip-path:inset(0 0% 0 0)}

  /* Pulse */
  .lp-pulse{animation:lpPulse 2s infinite}
  @keyframes lpPulse{0%{box-shadow:0 0 0 0 rgba(255,90,45,.6)}70%{box-shadow:0 0 0 9px rgba(255,90,45,0)}100%{box-shadow:0 0 0 0 rgba(255,90,45,0)}}

  /* Live badge */
  .lp-live{display:inline-flex;align-items:center;gap:5px;font-size:.67rem;font-weight:700;
    letter-spacing:.1em;text-transform:uppercase;color:#4ade80;padding:4px 10px;border-radius:9999px;
    background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);font-family:${DISP}}
  .lp-live-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:livePulse 2s infinite;flex-shrink:0}
  @keyframes livePulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%{box-shadow:0 0 0 6px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}

  /* Ticker */
  .lp-ticker{overflow:hidden;border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};background:${INK_2};padding:11px 0}
  .lp-ticker-track{display:flex;width:max-content;animation:tickerScroll 32s linear infinite}
  .lp-ticker-track:hover{animation-play-state:paused}
  @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  .lp-ticker-item{white-space:nowrap;font-family:${DISP};font-weight:700;font-size:.8rem;letter-spacing:.13em;
    text-transform:uppercase;color:${MUTED};padding:0 28px;display:inline-flex;align-items:center;gap:14px}
  .lp-ticker-sep{color:${MUTED_2};opacity:.45}

  /* Stat band */
  .stat-cell{transition:background .22s}
  .stat-cell:hover{background:rgba(255,90,45,.03)}

  /* Leaderboard row */
  .lb-row{transition:background .18s}
  .lb-row:hover{background:rgba(255,90,45,.05)}

  /* Layouts */
  .lp-hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:52px;align-items:center}
  .lp-band-grid{display:grid;grid-template-columns:repeat(4,1fr)}
  .lp-triad{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .lp-split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
  /* Hamburger (desktop: hidden) */
  .lp-hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;padding:6px;
    background:none;border:none;cursor:pointer;z-index:101;-webkit-tap-highlight-color:transparent}
  .lp-hamburger span{display:block;width:22px;height:2px;background:#f4f4f2;border-radius:2px;
    transition:transform .28s cubic-bezier(.25,1,.5,1),opacity .22s}
  .lp-hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .lp-hamburger.open span:nth-child(2){opacity:0}
  .lp-hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}

  /* Mobile drawer */
  .lp-mobile-drawer{position:fixed;inset:0;z-index:99;background:rgba(10,10,10,.97);
    backdrop-filter:blur(20px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:36px;opacity:0;pointer-events:none;
    transition:opacity .28s cubic-bezier(.25,1,.5,1)}
  .lp-mobile-drawer.open{opacity:1;pointer-events:auto}
  .lp-mobile-drawer a{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:2.2rem;
    text-transform:uppercase;letter-spacing:.06em;color:#f4f4f2;text-decoration:none;
    transition:color .2s}
  .lp-mobile-drawer a:active{color:#ff5a2d}

  @media(max-width:900px){
    .lp-hero-grid,.lp-split{grid-template-columns:1fr;gap:36px}
    .lp-band-grid{grid-template-columns:repeat(2,1fr)}
    .lp-triad{grid-template-columns:1fr}
    .lp-nav-links{display:none !important}
    .lp-hamburger{display:flex}
    .lp-hero-header{padding-top:100px !important;padding-bottom:48px !important}
    .lp-hero-card{display:none}
    #how,#features,#join{padding-top:56px !important;padding-bottom:56px !important}
    .stat-cell{padding:22px 16px !important}
  }
  @media(max-width:480px){
    .lp-band-grid{grid-template-columns:1fr 1fr}
    .lp-hero-header{padding-top:88px !important;padding-bottom:40px !important}
    .lp-hero-title{font-size:clamp(2.6rem,10vw,3.4rem) !important}
    #how,#features,#join{padding-top:44px !important;padding-bottom:44px !important}
    .stat-cell{padding:18px 12px !important}
    .lp-cta-box{padding:48px 24px !important}
  }
`;

const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.65, ease: [0.2, 0.8, 0.2, 1] as const },
};

const wrap: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 28px' };
const disp: React.CSSProperties = { fontFamily: DISP, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '.01em' };
const kicker: React.CSSProperties = { ...disp, fontWeight: 700, letterSpacing: '.2em', fontSize: '.84rem', color: FLAME, marginBottom: 16, lineHeight: 1.2 };

const ClipText = ({ children }: { children: string }) => (
  <span className="clip-trigger">
    <span className="clip-wrap">
      {children}
      <span className="clip-fg" aria-hidden="true">{children}</span>
    </span>
  </span>
);

const heroStats = [
  { v: '4.6s', l: '40 Dash' },
  { v: '28', l: 'TDs' },
  { v: '12', l: 'Offers' },
];

const bandStats = [
  { n: '4.2', suffix: 'K', c: 'Athletes Ranked' },
  { n: '380', suffix: '+', c: 'Coaches Scouting' },
  { n: '1.1', suffix: 'K', c: 'Offers Made' },
  { n: '365', suffix: '', c: 'Days A Year' },
];

const triad = [
  { icon: Crosshair, title: 'Achieve Your Goals', body: 'Log combines, drills and game film. Our HERS Rating turns your work into a verified score coaches trust.' },
  { icon: Megaphone, title: 'Challenge Your Friends', body: 'Climb the live leaderboard. Go head-to-head on the grid and watch your rank rise every single week.' },
  { icon: Share2, title: 'Share Your Journey', body: 'Post highlights to your profile, get discovered by 380+ scouting coaches, and let your tape do the talking.' },
];

const gridFeatures = [
  { h: 'Verified HERS Rating', p: 'A single, trusted score built from real performance data — not hype.' },
  { h: 'Real-time rankings', p: 'Climb position by position. Your rank moves the moment you do.' },
  { h: 'Coach-facing profiles', p: 'Film, stats and contact in one place — built for how coaches actually scout.' },
];

const tickerItems = [
  { label: 'Sarah Watkins', meta: 'QB · #1 Nationally' },
  { label: '380+ Coaches', meta: 'Now Scouting' },
  { label: 'Maya Johnson', meta: 'WR · 93 HERS Rating' },
  { label: '4,200+ Athletes', meta: 'On The Grid' },
  { label: 'Jordan Reyes', meta: 'S · 91 HERS Rating' },
  { label: '1,100+ Offers', meta: 'Made This Season' },
  { label: 'Taylor Brooks', meta: 'QB · 88 HERS Rating' },
  { label: '365 Days', meta: 'A Year Of Visibility' },
];

interface GridRow {
  name: string;
  meta: string;
  rank: number;
  up: boolean;
  av: string;
  avatarUrl?: string;
}

const fallbackLeaderboard: GridRow[] = [
  { name: 'Sarah Watkins', meta: 'QB · 2026 · 12 offers', rank: 95, up: true, av: `linear-gradient(135deg,${FLAME},${FLAME_SOFT})` },
  { name: 'Maya Johnson', meta: 'QB · 2026 · 8 offers', rank: 93, up: true, av: 'linear-gradient(135deg,#3a3a3a,#1c1c1c)' },
  { name: 'Jordan Reyes', meta: 'QB · 2027 · 5 offers', rank: 91, up: false, av: 'linear-gradient(135deg,#2a2a2a,#161616)' },
  { name: 'Taylor Brooks', meta: 'QB · 2026 · 4 offers', rank: 88, up: true, av: 'linear-gradient(135deg,#222,#111)' },
];

interface ApiRanking {
  name: string;
  school?: string;
  position?: string;
  rating: number;
  change?: number;
  avatar?: string;
}

export const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [barWidth, setBarWidth] = useState('0%');
  const [leaderboard, setLeaderboard] = useState<GridRow[]>(fallbackLeaderboard);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    const t = setTimeout(() => setBarWidth('92%'), 700);

    const fades = ['linear-gradient(135deg,#3a3a3a,#1c1c1c)', 'linear-gradient(135deg,#2a2a2a,#161616)', 'linear-gradient(135deg,#222,#111)'];
    fetch('/api/rankings?limit=4&sortBy=rating')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const rows: ApiRanking[] = j?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        setLeaderboard(rows.slice(0, 4).map((r, i) => ({
          name: r.name,
          meta: [r.position, r.school].filter(Boolean).join(' · '),
          rank: Math.round(r.rating),
          up: (r.change ?? 0) > 0,
          av: i === 0 ? `linear-gradient(135deg,${FLAME},${FLAME_SOFT})` : fades[i - 1],
          avatarUrl: r.avatar,
        })));
      })
      .catch(() => {});

    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); };
  }, []);

  return (
    <div className="lp-grain" style={{ background: INK, color: '#f4f4f2', fontFamily: "'DM Sans', sans-serif", fontSize: 17, lineHeight: 1.6, overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{css}</style>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px',
        background: scrolled ? 'rgba(10,10,10,.88)' : 'rgba(10,10,10,.5)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? LINE : 'transparent'}`, transition: 'border-color .3s, background .3s',
      }}>
        <div style={{ ...disp, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '.04em' }}>
          HERS<b style={{ color: FLAME }}>365</b>
        </div>
        <div className="lp-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a className="lp-nav-link" href="#how">The Grid</a>
          <a className="lp-nav-link" href="#features">Features</a>
          <Link className="lp-nav-link" to="/rankings">Rankings</Link>
          <Link className="lp-nav-link" to="/coach/login">For Coaches</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className={`lp-hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <Link to="/auth?tab=signup" className="lp-btn lp-btn-primary" style={{ fontSize: '.85rem', padding: '11px 22px' }}>
            Get Recruited <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      <div className={`lp-mobile-drawer${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)}>
        <a href="#how" onClick={() => setMenuOpen(false)}>The Grid</a>
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <Link to="/rankings" onClick={() => setMenuOpen(false)}>Rankings</Link>
        <Link to="/coach/login" onClick={() => setMenuOpen(false)}>For Coaches</Link>
        <Link to="/auth?tab=signup" className="lp-btn lp-btn-primary" style={{ fontSize: '1rem', padding: '13px 28px', marginTop: 8 }} onClick={() => setMenuOpen(false)}>
          Get Recruited <ArrowRight size={16} />
        </Link>
      </div>

      {/* HERO */}
      <header className="lp-hero-header" style={{ position: 'relative', padding: '152px 0 80px', overflow: 'hidden' }}>
        {/* BG glows */}
        <div style={{ position: 'absolute', width: 680, height: 680, borderRadius: '50%', filter: 'blur(100px)', opacity: 0.45, top: -200, right: -140, background: 'radial-gradient(circle,rgba(255,90,45,.5),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.35, bottom: -200, left: -140, background: 'radial-gradient(circle,rgba(255,90,45,.22),transparent 65%)', pointerEvents: 'none' }} />
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 80% at 80% 10%,#000 0%,transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 80% 10%,#000 0%,transparent 80%)',
        }} />

        <div className="lp-hero-grid" style={{ ...wrap, position: 'relative' }}>
          {/* LEFT */}
          <div style={{ borderLeft: `3px solid ${FLAME}`, paddingLeft: 28 }}>
            <motion.span {...reveal} style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, ...disp, fontWeight: 700, letterSpacing: '.18em',
              fontSize: '.79rem', color: FLAME, marginBottom: 22, border: '1px solid rgba(255,90,45,.28)',
              padding: '7px 14px', borderRadius: 9999, background: 'rgba(255,90,45,.06)', lineHeight: 1.2,
            }}>
              <span className="lp-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: FLAME, flexShrink: 0 }} />
              Girls Flag Football · Class of 2026
            </motion.span>

            <motion.h1
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.08 }}
              className="lp-hero-title"
              style={{ ...disp, fontWeight: 900, fontSize: 'clamp(3.8rem,9vw,7.4rem)', lineHeight: 0.88, margin: 0 }}
            >
              Get Seen.<br />
              Get Ranked.<br />
              Get <em style={{ color: FLAME, fontStyle: 'normal' }}>Recruited.</em>
            </motion.h1>

            <motion.p
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.16 }}
              style={{ color: MUTED, fontSize: '1.1rem', maxWidth: 460, margin: '24px 0 0', lineHeight: 1.65 }}
            >
              The recruiting platform built for girls flag football. Post your film, climb the rankings, and put your game in front of every coach that matters — 365 days a year.
            </motion.p>

            {/* Social proof */}
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.2 }} style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, color: MUTED_2, fontSize: '.85rem' }}>
              <div style={{ display: 'flex' }}>
                {['Ava King', 'Maya Cruz', 'Zoe Bell', 'Tia Ford'].map((name, i) => (
                  <span key={name} style={{
                    width: 32, height: 32, borderRadius: '50%', border: `2px solid ${INK}`, marginLeft: i ? -9 : 0,
                    backgroundImage: `url("${athleteAvatar(name)}")`,
                    backgroundSize: 'cover', backgroundPosition: 'center', display: 'inline-block', flexShrink: 0,
                  }} />
                ))}
              </div>
              <span>Join <b style={{ color: '#f4f4f2' }}>4,200+</b> athletes already on the grid</span>
            </motion.div>

            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.28 }} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 26 }}>
              <Link to="/auth?tab=signup" className="lp-btn lp-btn-primary">Claim Your Profile <ArrowRight size={15} /></Link>
              <a href="#how" className="lp-btn lp-btn-ghost"><Play size={14} fill="currentColor" /> See How It Works</a>
            </motion.div>
          </div>

          {/* RIGHT: Profile card */}
          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.18 }}
            className="lp-hero-card"
            style={{
              position: 'relative',
              background: `linear-gradient(160deg,${INK_3},${INK_2})`,
              border: `1px solid ${LINE_2}`,
              borderRadius: 22,
              padding: 24,
              boxShadow: '0 32px 84px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.03)',
            }}
          >
            {/* Top 5% badge */}
            <div style={{
              position: 'absolute', top: -14, right: 22,
              background: FLAME, color: '#fff', ...disp, fontWeight: 800,
              fontSize: '.73rem', letterSpacing: '.1em', padding: '5px 13px', borderRadius: 9999,
              boxShadow: '0 8px 22px rgba(255,90,45,.45)', lineHeight: 1.2,
            }}>Top 5%</div>

            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <div style={{ ...disp, fontWeight: 800, fontSize: '1.3rem', letterSpacing: '.02em' }}>Sarah Watkins</div>
                  <span className="lp-live"><span className="lp-live-dot" />Live</span>
                </div>
                <div style={{ color: MUTED, fontSize: '.79rem', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: DISP }}>QB · Class of 2026</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...disp, fontWeight: 900, fontSize: '2.8rem', color: FLAME, lineHeight: 1 }}>95</div>
                <div style={{ fontSize: '.6rem', letterSpacing: '.14em', color: MUTED_2, fontWeight: 700, fontFamily: DISP, textTransform: 'uppercase', marginTop: 2 }}>HERS Rating</div>
              </div>
            </div>

            {/* Stat chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {heroStats.map(s => (
                <div
                  key={s.l}
                  style={{
                    background: 'rgba(255,255,255,.03)', border: `1px solid ${LINE}`,
                    borderRadius: 12, padding: '12px 10px',
                    transition: 'border-color .22s, background .22s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,90,45,.28)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,90,45,.04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = LINE;
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)';
                  }}
                >
                  <div style={{ ...disp, fontWeight: 800, fontSize: '1.5rem' }}>{s.v}</div>
                  <div style={{ fontSize: '.63rem', letterSpacing: '.1em', color: MUTED_2, textTransform: 'uppercase', fontWeight: 700, marginTop: 2, fontFamily: DISP }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Visibility bar */}
            <div style={{ height: 7, borderRadius: 9999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginBottom: 7 }}>
              <i style={{
                display: 'block', height: '100%', borderRadius: 9999,
                background: `linear-gradient(90deg,${FLAME},${FLAME_SOFT})`,
                width: barWidth, transition: 'width 1.4s cubic-bezier(.2,.8,.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.73rem', color: MUTED, fontWeight: 600 }}>
              <span>Recruiting Visibility</span><span style={{ color: FLAME, fontWeight: 700 }}>92%</span>
            </div>

            {/* Footer row */}
            <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 18, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '.74rem', color: MUTED_2 }}>
                <span style={{ color: '#4ade80', marginRight: 4 }}>▲ 3</span> positions this week
              </div>
              <div style={{ fontSize: '.74rem', color: MUTED_2 }}>
                <b style={{ color: '#f4f4f2' }}>14</b> coach views today
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      {/* LIVE TICKER */}
      <div className="lp-ticker">
        <div className="lp-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="lp-ticker-item">
              <b style={{ color: FLAME }}>{item.label}</b>
              <span style={{ color: MUTED_2 }}>·</span>
              {item.meta}
              <span className="lp-ticker-sep">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* STAT BAND */}
      <div style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: INK_2 }}>
        <div className="lp-band-grid" style={wrap}>
          {bandStats.map((s, i) => (
            <motion.div
              key={s.c}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.08 }}
              className="stat-cell"
              style={{ padding: '36px 24px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${LINE}` : 'none' }}
            >
              <div style={{ ...disp, fontWeight: 900, fontSize: '3.2rem', lineHeight: 1 }}>
                <span style={{ color: FLAME }}>{s.n}</span>{s.suffix}
              </div>
              <div style={{ fontSize: '.77rem', letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED, fontWeight: 600, marginTop: 8, fontFamily: DISP }}>{s.c}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TRIAD */}
      <section id="how" style={{ padding: '100px 0' }}>
        <div style={wrap}>
          <motion.div {...reveal} style={{ maxWidth: 600, marginBottom: 52 }}>
            <div style={kicker}>Three Ways To Win</div>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', margin: 0 }}>
              Your highlight reel<br />shouldn't sit in a folder.
            </h2>
            <p style={{ color: MUTED, fontSize: '1.08rem', marginTop: 18 }}>Stop hoping a coach finds your film. HERS 365 turns every rep into ranking — and every ranking into a reason to get recruited.</p>
          </motion.div>
          <div className="lp-triad">
            {triad.map((c, i) => (
              <motion.div key={c.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="lp-card" style={{
                position: 'relative', background: INK_2, border: `1px solid ${LINE}`, borderRadius: 20, padding: 30, overflow: 'hidden',
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 13, background: 'rgba(255,90,45,.1)', border: '1px solid rgba(255,90,45,.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: FLAME,
                }}><c.icon size={22} /></div>
                <h3 style={{ ...disp, fontWeight: 800, fontSize: '1.55rem', letterSpacing: '.01em', marginBottom: 10 }}>
                  <ClipText>{c.title}</ClipText>
                </h3>
                <p style={{ color: MUTED, fontSize: '.98rem', margin: 0, lineHeight: 1.65 }}>{c.body}</p>
                <div style={{ position: 'absolute', bottom: 16, right: 22, ...disp, fontWeight: 900, fontSize: '3.6rem', color: 'rgba(255,255,255,.04)', lineHeight: 1, userSelect: 'none' }}>0{i + 1}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SPLIT FEATURE */}
      <section id="features" style={{ padding: '100px 0', background: INK_2, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
        <div className="lp-split" style={wrap}>
          <motion.div {...reveal}>
            <div style={kicker}>The Grid</div>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', margin: 0 }}>Every athlete.<br />One leaderboard.</h2>
            <p style={{ color: MUTED, fontSize: '1.08rem', marginTop: 18 }}>A living ranking of girls flag football talent — updated daily, visible to every coach, impossible to ignore.</p>
            <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {gridFeatures.map(f => (
                <div key={f.h} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,90,45,.1)',
                    border: '1px solid rgba(255,90,45,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME, marginTop: 3,
                  }}><Check size={12} strokeWidth={3} /></div>
                  <div>
                    <h4 style={{ ...disp, fontWeight: 800, fontSize: '1.14rem', letterSpacing: '.02em', margin: 0 }}>
                      <ClipText>{f.h}</ClipText>
                    </h4>
                    <p style={{ color: MUTED, fontSize: '.95rem', margin: 0, lineHeight: 1.6 }}>{f.p}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.12 }} style={{
            background: `linear-gradient(160deg,${INK_3},${INK})`, border: `1px solid ${LINE_2}`, borderRadius: 28,
            padding: 16, boxShadow: '0 40px 90px rgba(0,0,0,.6)',
          }}>
            <div style={{ background: INK, borderRadius: 18, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
              <div style={{ padding: '15px 18px 11px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...disp, fontWeight: 900, fontSize: '1.28rem', letterSpacing: '.04em' }}>THE <b style={{ color: FLAME }}>GRID</b> · TOP RATED</div>
                <span className="lp-live"><span className="lp-live-dot" />Live</span>
              </div>
              {leaderboard.map((r, i) => (
                <div key={r.name} className="lb-row" onClick={() => navigate('/rankings')} style={{
                  display: 'flex', gap: 12, padding: '14px 18px',
                  borderBottom: i < leaderboard.length - 1 ? `1px solid ${LINE}` : 'none',
                  alignItems: 'center', cursor: 'pointer',
                }}>
                  <div style={{ width: 16, ...disp, fontWeight: 900, fontSize: '.8rem', color: MUTED_2, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: r.av,
                    backgroundImage: `url("${athleteAvatar(r.name)}")`, backgroundSize: 'cover', backgroundPosition: 'center',
                    border: i === 0 ? `2px solid ${FLAME}` : `2px solid ${LINE}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ color: MUTED_2, fontSize: '.73rem' }}>{r.meta}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', ...disp, fontWeight: 900, fontSize: '1.28rem', color: i === 0 ? FLAME : '#f4f4f2', flexShrink: 0 }}>
                    {r.up && <span style={{ fontSize: '.58rem', color: '#4ade80', marginRight: 2 }}>▲</span>}{r.rank}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section id="join" style={{ padding: '100px 0' }}>
        <div style={wrap}>
          <motion.div {...reveal} className="lp-cta-box" style={{
            position: 'relative', borderRadius: 26, overflow: 'hidden',
            background: 'linear-gradient(135deg,#1a0f0a,#0a0a0a)',
            border: '1px solid rgba(255,90,45,.22)', padding: '76px 40px', textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', filter: 'blur(96px)', opacity: 0.55, top: -260, right: '25%', background: 'radial-gradient(circle,rgba(255,90,45,.5),transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ ...kicker, position: 'relative' }}>Finally — recruiting built for her</div>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', margin: 0, position: 'relative' }}>
              <ClipText>Your tape is ready.</ClipText><br />
              <ClipText>Are the coaches?</ClipText>
            </h2>
            <p style={{ position: 'relative', color: MUTED, fontSize: '1.1rem', maxWidth: 500, margin: '18px auto 34px', lineHeight: 1.65 }}>
              Claim your profile and put your film in front of the coaches who are already scouting the grid. Free to start. Built for the class of 2026 and beyond.
            </p>
            <div style={{ position: 'relative', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="lp-btn lp-btn-primary" onClick={() => navigate('/auth?tab=signup')}>Claim Your Profile <ArrowRight size={15} /></button>
              <button className="lp-btn lp-btn-ghost" onClick={() => navigate('/coach/login')}>I'm A Coach</button>
            </div>
            <div style={{ position: 'relative', marginTop: 16, color: MUTED_2, fontSize: '.82rem' }}>No spam. No pressure. Just your shot in front of the right coaches.</div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${LINE}`, padding: '44px 0 36px' }}>
        <div style={{ ...wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ ...disp, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '.04em' }}>HERS<b style={{ color: FLAME }}>365</b></div>
          <div style={{ display: 'flex', gap: 26 }}>
            <a className="lp-nav-link" href="#how">The Grid</a>
            <a className="lp-nav-link" href="#features">Features</a>
            <Link className="lp-nav-link" to="/about">About</Link>
            <Link className="lp-nav-link" to="/privacy">Privacy</Link>
          </div>
          <div style={{ color: MUTED_2, fontSize: '.8rem' }}>© 2026 HERS 365 · Girls Flag Football Recruiting</div>
        </div>
      </footer>
    </div>
  );
};
