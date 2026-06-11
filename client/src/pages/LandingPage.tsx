import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Play, ArrowRight, Crosshair, Megaphone, Share2 } from 'lucide-react';

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
  .lp-grain::before{content:'';position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.04;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  .lp-btn{font-family:${DISP};font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:.92rem;
    padding:13px 24px;border-radius:9999px;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:9px;
    transition:transform .15s,box-shadow .2s,border-color .2s,color .2s;text-decoration:none}
  .lp-btn-primary{background:${FLAME};color:#fff;box-shadow:0 6px 22px rgba(255,90,45,.32)}
  .lp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(255,90,45,.5)}
  .lp-btn-ghost{background:transparent;color:#f4f4f2;border:1px solid ${LINE_2}}
  .lp-btn-ghost:hover{border-color:${FLAME};color:${FLAME}}
  .lp-card{transition:transform .3s,border-color .3s}
  .lp-card:hover{transform:translateY(-6px);border-color:rgba(255,90,45,.35)}
  .lp-nav-link{color:${MUTED};font-weight:600;font-size:.84rem;text-decoration:none;transition:color .2s}
  .lp-nav-link:hover{color:#f4f4f2}
  .lp-pulse{animation:lpPulse 2s infinite}
  @keyframes lpPulse{0%{box-shadow:0 0 0 0 rgba(255,90,45,.6)}70%{box-shadow:0 0 0 9px rgba(255,90,45,0)}100%{box-shadow:0 0 0 0 rgba(255,90,45,0)}}
  .lp-hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
  .lp-band-grid{display:grid;grid-template-columns:repeat(4,1fr)}
  .lp-triad{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .lp-split{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
  @media(max-width:900px){
    .lp-hero-grid,.lp-split{grid-template-columns:1fr;gap:40px}
    .lp-band-grid{grid-template-columns:repeat(2,1fr)}
    .lp-triad{grid-template-columns:1fr}
    .lp-nav-links{display:none !important}
  }
`;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] as const },
};

const wrap: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 28px' };
const disp: React.CSSProperties = { fontFamily: DISP, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: '.01em' };
const kicker: React.CSSProperties = { ...disp, fontWeight: 700, letterSpacing: '.2em', fontSize: '.84rem', color: FLAME, marginBottom: 16, lineHeight: 1.2 };

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
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px',
        background: scrolled ? 'rgba(10,10,10,.82)' : 'rgba(10,10,10,.55)', backdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${scrolled ? LINE : 'transparent'}`, transition: 'border-color .3s, background .3s',
      }}>
        <div style={{ ...disp, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '.04em' }}>HERS<b style={{ color: FLAME }}>365</b></div>
        <div className="lp-nav-links" style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
          <a className="lp-nav-link" href="#how">The Grid</a>
          <a className="lp-nav-link" href="#features">Features</a>
          <Link className="lp-nav-link" to="/rankings">Rankings</Link>
          <Link className="lp-nav-link" to="/coach/login">For Coaches</Link>
        </div>
        <Link to="/auth" className="lp-btn lp-btn-primary">Get Recruited <ArrowRight size={15} /></Link>
      </nav>

      {/* HERO */}
      <header style={{ position: 'relative', padding: '160px 0 90px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.5, top: -180, right: -120, background: 'radial-gradient(circle,rgba(255,90,45,.55),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 480, height: 480, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.5, bottom: -220, left: -160, background: 'radial-gradient(circle,rgba(255,90,45,.22),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(circle at 70% 20%,#000 0%,transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 70% 20%,#000 0%,transparent 70%)',
        }} />
        <div className="lp-hero-grid" style={{ ...wrap, position: 'relative' }}>
          <div>
            <motion.span {...reveal} style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, ...disp, fontWeight: 700, letterSpacing: '.18em',
              fontSize: '.8rem', color: FLAME, marginBottom: 24, border: '1px solid rgba(255,90,45,.3)',
              padding: '7px 14px', borderRadius: 9999, background: 'rgba(255,90,45,.06)', lineHeight: 1.2,
            }}>
              <span className="lp-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: FLAME }} />
              Girls Flag Football · Class of 2026
            </motion.span>
            <motion.h1 {...reveal} transition={{ ...reveal.transition, delay: 0.08 }} style={{ ...disp, fontWeight: 900, fontSize: 'clamp(3.4rem,8vw,6.6rem)', lineHeight: 0.86, margin: 0 }}>
              Get Seen.<br />Get Ranked.<br />Get <em style={{ color: FLAME }}>Recruited.</em>
            </motion.h1>
            <motion.p {...reveal} transition={{ ...reveal.transition, delay: 0.16 }} style={{ color: MUTED, fontSize: '1.18rem', maxWidth: 480, margin: '28px 0 36px' }}>
              The recruiting platform built for girls flag football. Post your film, climb the rankings, and put your game in front of every coach that matters — 365 days a year.
            </motion.p>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.24 }} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link to="/auth" className="lp-btn lp-btn-primary">Claim Your Profile</Link>
              <a href="#how" className="lp-btn lp-btn-ghost"><Play size={14} /> See How It Works</a>
            </motion.div>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.32 }} style={{ marginTop: 30, display: 'flex', alignItems: 'center', gap: 14, color: MUTED_2, fontSize: '.86rem' }}>
              <div style={{ display: 'flex' }}>
                {[44, 68, 12, 90].map((n, i) => (
                  <span key={n} style={{
                    width: 34, height: 34, borderRadius: '50%', border: `2px solid ${INK}`, marginLeft: i ? -10 : 0,
                    backgroundImage: `url('https://randomuser.me/api/portraits/women/${n}.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                ))}
              </div>
              <span>Join <b style={{ color: '#f4f4f2' }}>4,200+</b> athletes already on the grid</span>
            </motion.div>
          </div>

          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.2 }} style={{
            position: 'relative', background: `linear-gradient(160deg,${INK_3},${INK_2})`,
            border: `1px solid ${LINE}`, borderRadius: 22, padding: 24, boxShadow: '0 30px 80px rgba(0,0,0,.6)',
          }}>
            <div style={{
              position: 'absolute', top: -14, right: 24, background: FLAME, color: '#fff', ...disp, fontWeight: 800,
              fontSize: '.74rem', letterSpacing: '.1em', padding: '6px 13px', borderRadius: 9999, boxShadow: '0 8px 20px rgba(255,90,45,.4)', lineHeight: 1.2,
            }}>Top 5%</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ ...disp, fontWeight: 800, fontSize: '1.35rem', letterSpacing: '.02em' }}>Sarah Watkins</div>
                <div style={{ color: MUTED, fontSize: '.8rem', fontWeight: 600 }}>QB · Class of 2026</div>
              </div>
              <div style={{ ...disp, fontWeight: 900, fontSize: '2.6rem', color: FLAME, lineHeight: 1, textAlign: 'right' }}>
                95
                <small style={{ display: 'block', fontSize: '.62rem', letterSpacing: '.16em', color: MUTED_2, fontWeight: 700 }}>HERS RATING</small>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {heroStats.map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '13px 12px' }}>
                  <div style={{ ...disp, fontWeight: 800, fontSize: '1.5rem' }}>{s.v}</div>
                  <div style={{ fontSize: '.64rem', letterSpacing: '.1em', color: MUTED_2, textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginBottom: 8 }}>
              <i style={{ display: 'block', height: '100%', borderRadius: 9999, background: `linear-gradient(90deg,${FLAME},${FLAME_SOFT})`, width: barWidth, transition: 'width 1.4s cubic-bezier(.2,.8,.2,1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.74rem', color: MUTED, fontWeight: 600 }}>
              <span>Recruiting Visibility</span><span style={{ color: FLAME }}>92%</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* STAT BAND */}
      <div style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: INK_2 }}>
        <div className="lp-band-grid" style={wrap}>
          {bandStats.map((s, i) => (
            <motion.div key={s.c} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} style={{ padding: '38px 24px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${LINE}` : 'none' }}>
              <div style={{ ...disp, fontWeight: 900, fontSize: '3.1rem', lineHeight: 1 }}>
                <span style={{ color: FLAME }}>{s.n}</span>{s.suffix}
              </div>
              <div style={{ fontSize: '.78rem', letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED, fontWeight: 600, marginTop: 8 }}>{s.c}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TRIAD */}
      <section id="how" style={{ padding: '110px 0' }}>
        <div style={wrap}>
          <motion.div {...reveal} style={{ maxWidth: 640, marginBottom: 60 }}>
            <div style={kicker}>Three Ways To Win</div>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', margin: 0 }}>Your highlight reel<br />shouldn't sit in a folder.</h2>
            <p style={{ color: MUTED, fontSize: '1.1rem', marginTop: 20 }}>Stop hoping a coach finds your film. HERS 365 turns every rep into ranking — and every ranking into a reason to get recruited.</p>
          </motion.div>
          <div className="lp-triad">
            {triad.map((c, i) => (
              <motion.div key={c.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="lp-card" style={{
                position: 'relative', background: INK_2, border: `1px solid ${LINE}`, borderRadius: 20, padding: 32, overflow: 'hidden',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, background: 'rgba(255,90,45,.12)', border: '1px solid rgba(255,90,45,.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, color: FLAME,
                }}><c.icon size={24} /></div>
                <h3 style={{ ...disp, fontWeight: 800, fontSize: '1.6rem', letterSpacing: '.01em', marginBottom: 12 }}>{c.title}</h3>
                <p style={{ color: MUTED, fontSize: '1rem', margin: 0 }}>{c.body}</p>
                <div style={{ position: 'absolute', bottom: 18, right: 24, ...disp, fontWeight: 900, fontSize: '3.4rem', color: 'rgba(255,255,255,.04)' }}>0{i + 1}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SPLIT FEATURE */}
      <section id="features" style={{ padding: '110px 0', background: INK_2, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
        <div className="lp-split" style={wrap}>
          <motion.div {...reveal}>
            <div style={kicker}>The Grid</div>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', margin: 0 }}>Every athlete.<br />One leaderboard.</h2>
            <p style={{ color: MUTED, fontSize: '1.1rem', marginTop: 20 }}>A living ranking of girls flag football talent — updated daily, visible to every coach, impossible to ignore.</p>
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {gridFeatures.map(f => (
                <div key={f.h} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,90,45,.12)',
                    border: '1px solid rgba(255,90,45,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME, marginTop: 3,
                  }}><Check size={13} strokeWidth={3} /></div>
                  <div>
                    <h4 style={{ ...disp, fontWeight: 800, fontSize: '1.15rem', letterSpacing: '.02em', margin: 0 }}>{f.h}</h4>
                    <p style={{ color: MUTED, fontSize: '.96rem', margin: 0 }}>{f.p}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.12 }} style={{
            background: `linear-gradient(160deg,${INK_3},${INK})`, border: `1px solid ${LINE_2}`, borderRadius: 30, padding: 18, boxShadow: '0 40px 90px rgba(0,0,0,.6)',
          }}>
            <div style={{ background: INK, borderRadius: 20, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
              <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ ...disp, fontWeight: 900, fontSize: '1.3rem', letterSpacing: '.04em' }}>THE <b style={{ color: FLAME }}>GRID</b> · TOP RATED</div>
              </div>
              {leaderboard.map((r, i) => (
                <div key={r.name} style={{ display: 'flex', gap: 12, padding: '16px 18px', borderBottom: i < leaderboard.length - 1 ? `1px solid ${LINE}` : 'none', alignItems: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: r.av,
                    backgroundImage: r.avatarUrl ? `url('${r.avatarUrl}')` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{r.name}</div>
                    <div style={{ color: MUTED_2, fontSize: '.76rem' }}>{r.meta}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', ...disp, fontWeight: 900, fontSize: '1.3rem', color: FLAME }}>
                    {r.up && <span style={{ fontSize: '.6rem', color: FLAME_SOFT }}>▲ </span>}{r.rank}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section id="join" style={{ padding: '110px 0' }}>
        <div style={wrap}>
          <motion.div {...reveal} style={{
            position: 'relative', borderRadius: 28, overflow: 'hidden', background: 'linear-gradient(135deg,#1a0f0a,#0a0a0a)',
            border: '1px solid rgba(255,90,45,.25)', padding: '80px 40px', textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', filter: 'blur(90px)', opacity: 0.6, top: -260, right: '30%', background: 'radial-gradient(circle,rgba(255,90,45,.55),transparent 65%)', pointerEvents: 'none' }} />
            <div style={{ ...kicker, position: 'relative' }}>Finally — recruiting built for her</div>
            <h2 style={{ ...disp, fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', margin: 0, position: 'relative' }}>Your tape is ready.<br />Are the coaches?</h2>
            <p style={{ position: 'relative', color: MUTED, fontSize: '1.15rem', maxWidth: 520, margin: '20px auto 36px' }}>
              Claim your profile and put your film in front of the coaches who are already scouting the grid. Free to start. Built for the class of 2026 and beyond.
            </p>
            <div style={{ position: 'relative', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="lp-btn lp-btn-primary" onClick={() => navigate('/auth')}>Claim Your Profile <ArrowRight size={15} /></button>
              <button className="lp-btn lp-btn-ghost" onClick={() => navigate('/coach/login')}>I'm A Coach</button>
            </div>
            <div style={{ position: 'relative', marginTop: 18, color: MUTED_2, fontSize: '.84rem' }}>No spam. No pressure. Just your shot in front of the right coaches.</div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${LINE}`, padding: '48px 0 38px' }}>
        <div style={{ ...wrap, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ ...disp, fontWeight: 900, fontSize: '1.5rem', letterSpacing: '.04em' }}>HERS<b style={{ color: FLAME }}>365</b></div>
          <div style={{ display: 'flex', gap: 26 }}>
            <a className="lp-nav-link" href="#how">The Grid</a>
            <a className="lp-nav-link" href="#features">Features</a>
            <Link className="lp-nav-link" to="/about">About</Link>
            <Link className="lp-nav-link" to="/privacy">Privacy</Link>
          </div>
          <div style={{ color: MUTED_2, fontSize: '.82rem' }}>© 2026 HERS 365 · Girls Flag Football Recruiting</div>
        </div>
      </footer>
    </div>
  );
};
