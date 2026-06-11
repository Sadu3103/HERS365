import { Flame, Shield, Users, Trophy, TrendingUp, Heart } from 'lucide-react';

const FLAME_C = '#ff5a2d';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const DISP = "'Barlow Condensed', sans-serif";

export const About = () => (
  <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 40, textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: FLAME_C }}>
        <Flame size={13} /> OUR STORY
      </div>
      <h1 style={{ fontFamily: DISP, fontSize: 'clamp(2.2rem, 6vw, 3.2rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1 }}>
        Built for the Girls Who Run.
      </h1>
      <p style={{ color: MUTED, fontSize: '0.92rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
        HERS365 is the first digital platform built exclusively for girls in flag football. We exist to give young athletes the tools, visibility, and community they deserve — and to connect them with the opportunities that were never built for them before.
      </p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 48 }}>
      {[
        { icon: <Users size={22} />, stat: '12,000+', label: 'Athletes on Platform' },
        { icon: <Trophy size={22} />, stat: '47', label: 'College Programs' },
        { icon: <TrendingUp size={22} />, stat: '3,200+', label: 'Rankings Tracked' },
        { icon: <Shield size={22} />, stat: '100%', label: 'Safe & COPPA Compliant' },
      ].map((s) => (
        <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '22px 20px', textAlign: 'center' }}>
          <div style={{ color: FLAME_C, marginBottom: 10, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
          <div style={{ fontFamily: DISP, fontSize: '2rem', fontWeight: 900, color: '#f4f4f2', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.stat}</div>
          <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{s.label}</div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {[
        { icon: <Heart size={18} />, title: 'Why We Built This', body: "Girls flag football is the fastest-growing sport in the country. Yet for years, female athletes had no platform built for them — no rankings, no recruiting tools, no community. We built HERS365 to change that." },
        { icon: <Shield size={18} />, title: 'Safety First, Always', body: "Every feature we build passes a safeguarding review. Coach-to-athlete communication is gated through parents. Your data is yours. We comply with COPPA and FERPA and we'll never compromise on the safety of our athletes." },
        { icon: <TrendingUp size={18} />, title: "What's Next", body: "We're expanding to all 50 states. We're adding real-time GameDay scoring. We're partnering with college programs to bring verified recruiting pipelines to every athlete — regardless of their school or zip code." },
      ].map((s) => (
        <div key={s.title} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: FLAME_C }}>
            {s.icon}
            <span style={{ fontFamily: DISP, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#f4f4f2' }}>{s.title}</span>
          </div>
          <p style={{ color: MUTED, fontSize: '0.88rem', margin: 0, lineHeight: 1.65 }}>{s.body}</p>
        </div>
      ))}
    </div>
  </div>
);
