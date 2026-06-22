import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, MessageSquare, Bell, UserCheck, Lock, ChevronRight, AlertCircle } from 'lucide-react';

const FLAME = '#ff5a2d';
const INK = '#0a0a0a';
const INK_2 = '#111111';
const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const MUTED_2 = '#5a5a56';
const DISP = "'Barlow Condensed', sans-serif";

const css = `
  *,*::before,*::after{box-sizing:border-box}
  .hub-card{transition:border-color .24s,box-shadow .24s,background .24s}
  .hub-card:hover{border-color:rgba(255,90,45,.28);box-shadow:0 8px 30px rgba(0,0,0,.4)}
  .hub-action{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;
    border:1px solid rgba(255,255,255,.07);background:transparent;cursor:pointer;
    transition:background .2s,border-color .2s;text-align:left;width:100%}
  .hub-action:hover{background:rgba(255,90,45,.06);border-color:rgba(255,90,45,.24)}
  .toggle-track{width:44px;height:24px;border-radius:9999px;cursor:pointer;border:none;
    transition:background .22s;position:relative;flex-shrink:0}
  .toggle-thumb{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;
    background:#fff;transition:transform .22s cubic-bezier(.25,1,.5,1)}
`;

const FEATURES = [
  { icon: Eye, title: 'Profile Visibility Control', desc: 'Set exactly which coaches can view your athlete\'s profile and contact info.' },
  { icon: MessageSquare, title: 'All Coach Communications', desc: 'Every coach message goes through your dashboard first. Nothing reaches your athlete without your approval.' },
  { icon: Bell, title: 'Real-time Alerts', desc: 'Get notified the moment a coach views your athlete\'s profile or sends a request.' },
  { icon: UserCheck, title: 'Contact Approval', desc: 'Review and approve any coach before they can contact your athlete.' },
  { icon: Lock, title: 'Data Privacy', desc: 'Request data deletion, export your athlete\'s data, or pause visibility at any time.' },
  { icon: Shield, title: 'Safe Messaging Gateway', desc: 'All coach-athlete messages are read-only for coaches until you grant full access.' },
];

// Read-only preview toggle. The controls on this page are not yet wired to
// the persistence layer (see the Preview banner below). Rendering interactive
// toggles here would mislead parents into thinking their preferences are
// being saved server-side — they are not. The working parent controls live
// in ParentDashboard, which persists via /api/parent/settings.
interface ToggleProps {
  on: boolean;
  label: string;
}
const Toggle = ({ on, label }: ToggleProps) => (
  <span
    className="toggle-track"
    role="img"
    aria-label={`${label}: preview only, not saved`}
    aria-disabled="true"
    style={{
      background: on ? 'rgba(255,90,45,.35)' : 'rgba(255,255,255,.08)',
      cursor: 'not-allowed', opacity: 0.55, display: 'inline-block',
    }}
  >
    <span className="toggle-thumb" style={{ transform: on ? 'translateX(20px)' : 'translateX(0px)' }} />
  </span>
);

export const ParentHub = () => {
  // Display-only defaults. Preserved so the existing screenshots/marketing
  // tour stay coherent, but no setter is exposed — the toggles are visual.
  const settings = {
    profilePublic: true,
    coachSearch: true,
    directContact: false,
    emailAlerts: true,
    smsAlerts: false,
    filmPublic: true,
  } as const;

  const reveal = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
  };

  return (
    <div style={{ background: INK, minHeight: '100vh', color: '#f4f4f2', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{css}</style>

      {/* Hero band */}
      <div style={{
        background: `linear-gradient(135deg, #0f0a08, ${INK_2})`,
        borderBottom: `1px solid ${LINE}`,
        padding: '48px 28px 40px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          filter: 'blur(80px)', opacity: 0.25, top: -200, right: -100,
          background: `radial-gradient(circle,rgba(255,90,45,.5),transparent 65%)`, pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(255,90,45,.14)',
              border: `1px solid rgba(255,90,45,.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME,
            }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ fontFamily: DISP, fontWeight: 700, letterSpacing: '.18em', fontSize: '.78rem', color: FLAME, textTransform: 'uppercase' }}>
                HERS365 · Parent Safety Center
              </div>
            </div>
          </div>
          <h1 style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: 'clamp(2.4rem,5vw,3.6rem)', lineHeight: 0.9, margin: '0 0 16px' }}>
            You're In Control.<br /><em style={{ color: FLAME, fontStyle: 'normal' }}>Always.</em>
          </h1>
          <p style={{ color: MUTED, fontSize: '1.06rem', maxWidth: 560, lineHeight: 1.65, margin: 0 }}>
            HERS365 is built around parent oversight. Every coach interaction with your athlete flows through this dashboard — nothing happens without your approval.
          </p>

          {/* Status bar */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 24,
            background: 'rgba(255,90,45,.08)', border: '1px solid rgba(255,90,45,.24)',
            borderRadius: 9999, padding: '8px 16px',
          }}>
            <AlertCircle size={14} color={FLAME} />
            <span style={{ fontFamily: DISP, fontWeight: 700, letterSpacing: '.1em', fontSize: '.78rem', textTransform: 'uppercase', color: FLAME }}>
              Preview · Coming Soon
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 28px 60px' }}>
        {/* Honesty banner: these toggles are visual previews. Until they are
            wired to the persistence layer, parents would otherwise click and
            assume their preferences are saved server-side — they are not. */}
        <div role="status" aria-live="polite" style={{
          background: 'rgba(255,90,45,.06)', border: '1px solid rgba(255,90,45,.28)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 28,
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <AlertCircle size={20} color={FLAME} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: '.84rem', color: '#f4f4f2', marginBottom: 4 }}>
              These controls aren't live yet
            </div>
            <p style={{ margin: 0, fontSize: '.86rem', color: MUTED, lineHeight: 1.55 }}>
              This page is a preview of the parental control surface and toggles here are not saved. Your working parental controls (approve messages, link children, manage alerts) live in the{' '}
              <Link to="/parent" style={{ color: FLAME, fontWeight: 700, textDecoration: 'underline' }}>Parent Dashboard</Link>.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
          {/* Privacy Settings Card */}
          <motion.div {...reveal} className="hub-card" style={{
            background: INK_2, border: `1px solid ${LINE}`, borderRadius: 18, padding: 24,
          }}>
            <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.25rem', letterSpacing: '.04em', marginBottom: 6 }}>
              Privacy Settings
            </div>
            <div style={{ color: MUTED, fontSize: '.84rem', marginBottom: 20 }}>Control who can see your athlete's profile and film.</div>

            {[
              { key: 'profilePublic' as const, label: 'Profile visible to coaches', sub: 'Coaches can find and view her profile' },
              { key: 'coachSearch' as const, label: 'Appear in coach searches', sub: 'Show in filtered search results' },
              { key: 'filmPublic' as const, label: 'Film visible to coaches', sub: 'Coaches can view uploaded game film' },
              { key: 'directContact' as const, label: 'Allow direct coach messages', sub: 'Coaches can send DMs (Pro/Elite)' },
            ].map(({ key, label, sub }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{label}</div>
                  <div style={{ color: MUTED_2, fontSize: '.75rem', marginTop: 2 }}>{sub}</div>
                </div>
                <Toggle on={settings[key]} label={label} />
              </div>
            ))}
          </motion.div>

          {/* Alert Settings Card */}
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }} className="hub-card" style={{
            background: INK_2, border: `1px solid ${LINE}`, borderRadius: 18, padding: 24,
          }}>
            <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.25rem', letterSpacing: '.04em', marginBottom: 6 }}>
              Alert Preferences
            </div>
            <div style={{ color: MUTED, fontSize: '.84rem', marginBottom: 20 }}>Get notified of any coach activity on your athlete's account.</div>

            {[
              { key: 'emailAlerts' as const, label: 'Email notifications', sub: 'Coach views, messages, and requests' },
              { key: 'smsAlerts' as const, label: 'SMS alerts', sub: 'Text message for coach contact requests' },
            ].map(({ key, label, sub }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{label}</div>
                  <div style={{ color: MUTED_2, fontSize: '.75rem', marginTop: 2 }}>{sub}</div>
                </div>
                <Toggle on={settings[key]} label={label} />
              </div>
            ))}

            {/* COPPA notice */}
            <div style={{
              marginTop: 20, padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,90,45,.06)', border: '1px solid rgba(255,90,45,.18)',
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={14} color={FLAME} style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '.78rem', color: MUTED, lineHeight: 1.55 }}>
                  <b style={{ color: '#f4f4f2' }}>COPPA Notice:</b> Athletes under 13 require verified parental consent. All data collection for minors is subject to your approval. You may request deletion of your child's data at any time.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.12 }} style={{ marginBottom: 40 }}>
          <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.4rem', letterSpacing: '.04em', marginBottom: 4 }}>
            Quick Actions
          </div>
          <div style={{ color: MUTED, fontSize: '.86rem', marginBottom: 18 }}>Manage your athlete's account and safety settings.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            {[
              { icon: Eye, label: 'Review Coach Activity', sub: 'See who has viewed her profile', href: '/messages' },
              { icon: MessageSquare, label: 'Pending Coach Requests', sub: 'Approve or decline contacts', href: '/messages' },
              { icon: UserCheck, label: 'Approved Contacts', sub: 'Manage your approved coach list', href: '/messages' },
              { icon: Lock, label: 'Request Data Export', sub: 'Download all stored data', href: '/settings' },
            ].map(({ icon: Icon, label, sub, href }) => (
              <Link key={label} to={href} style={{ textDecoration: 'none' }}>
                <button className="hub-action">
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: 'rgba(255,90,45,.1)',
                    border: '1px solid rgba(255,90,45,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME, flexShrink: 0,
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{label}</div>
                    <div style={{ color: MUTED_2, fontSize: '.76rem' }}>{sub}</div>
                  </div>
                  <ChevronRight size={15} color={MUTED_2} style={{ flexShrink: 0 }} />
                </button>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Platform Safety Features */}
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.16 }}>
          <div style={{ fontFamily: DISP, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.4rem', letterSpacing: '.04em', marginBottom: 4 }}>
            Platform Safety
          </div>
          <div style={{ color: MUTED, fontSize: '.86rem', marginBottom: 18 }}>Every safety feature HERS365 has built in for your athlete.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                style={{
                  background: INK_2, border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 18px 18px',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: 'rgba(255,90,45,.1)',
                  border: '1px solid rgba(255,90,45,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FLAME, flexShrink: 0,
                }}>
                  <f.icon size={17} />
                </div>
                <div>
                  <div style={{ fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '.02em', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ color: MUTED, fontSize: '.82rem', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.2 }} style={{
          marginTop: 36, padding: '24px 28px', background: INK_2, border: `1px solid ${LINE}`,
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '.04em', marginBottom: 4 }}>
              Need Help or Have a Safety Concern?
            </div>
            <div style={{ color: MUTED, fontSize: '.86rem' }}>
              Contact our Parent Safety Team — we respond within 24 hours.
            </div>
          </div>
          <a
            href="mailto:parents@hers365.com"
            style={{
              fontFamily: DISP, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em',
              fontSize: '.88rem', padding: '11px 22px', borderRadius: 9999,
              background: FLAME, color: '#fff', textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(255,90,45,.3)',
              whiteSpace: 'nowrap',
            }}
          >
            Contact Safety Team
          </a>
        </motion.div>
      </div>
    </div>
  );
};
