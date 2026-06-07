import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Trophy, User, Dumbbell, Search,
  Settings, Bell, MessageSquare, Menu, X, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

const nav: NavItem[] = [
  { icon: LayoutGrid,    label: 'THE GRID',   path: '/feed' },
  { icon: Trophy,        label: 'RANKINGS',   path: '/rankings' },
  { icon: User,          label: 'MY PROFILE', path: '/profile' },
  { icon: Dumbbell,      label: 'TRAINING',   path: '/training' },
  { icon: Search,        label: 'RECRUITING', path: '/recruiting' },
  { icon: MessageSquare, label: 'MESSAGES',   path: '/messages', badge: 3 },
];

export const Layout = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [mode,       setMode]       = useState<'athlete' | 'coach'>('athlete');
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const notifications = [
    { id: 1, msg: 'Coach Johnson viewed your profile',  time: '2m ago',  unread: true  },
    { id: 2, msg: 'Agility session starts in 30 minutes', time: '15m ago', unread: true  },
    { id: 3, msg: 'You moved up to #42 in rankings',   time: '1h ago',  unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>

      {/* ─── Sidebar ─── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 16px',
        background: '#0a0a0a',
      }} className="hidden md:flex">

        {/* Logo — plain text, no icon */}
        <div style={{ marginBottom: 20, paddingLeft: 4 }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: '1.6rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#fff',
          }}>HERS 365</span>
        </div>

        {/* ATHLETE / COACH toggle */}
        <div style={{
          display: 'flex',
          background: '#161616',
          borderRadius: 9999,
          padding: 3,
          marginBottom: 32,
        }}>
          {(['athlete', 'coach'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 9999,
                background: mode === m ? '#ff5a2d' : 'transparent',
                color: mode === m ? '#fff' : '#555',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {m === 'athlete' ? 'ATHLETE' : 'COACH'}
            </button>
          ))}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(({ icon: Icon, label, path, badge }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`nav-item${active ? ' nav-active' : ''}`}
                style={{ justifyContent: 'space-between', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon size={17} color={active ? '#ff5a2d' : undefined} />
                  {label}
                </div>
                {badge && (
                  <div style={{
                    minWidth: 18, height: 18, borderRadius: 9999,
                    background: '#ff5a2d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>{badge}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings + profile card */}
        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link
            to="/settings"
            className={`nav-item${location.pathname === '/settings' ? ' nav-active' : ''}`}
            style={{ fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em' }}
          >
            <Settings size={17} />
            SETTINGS
          </Link>

          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer', marginTop: 10,
              width: '100%', textAlign: 'left',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,90,45,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src="https://randomuser.me/api/portraits/women/44.jpg"
                alt="Sarah Watkins"
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#1c1c1c', border: '1.5px solid rgba(255,90,45,0.4)', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80', border: '1.5px solid #0a0a0a',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Sarah Watkins</div>
              <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 1 }}>QB | 2026</div>
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#ff5a2d', flexShrink: 0 }}>95</div>
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          height: 64,
          display: 'flex', alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#0a0a0a',
          flexShrink: 0,
          zIndex: 10,
          gap: 16,
        }}>
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen(true)}
            style={{ display: 'none', color: '#666', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            className="md-hidden-mobile-btn"
          >
            <Menu size={22} />
          </button>

          {/* Search — centered and wide */}
          <div style={{ flex: 1, position: 'relative', maxWidth: 540 }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search athletes, drills, schools..."
              style={{
                width: '100%',
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9999,
                padding: '8px 18px 8px 38px',
                fontSize: '0.8rem',
                color: '#fff',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(255,90,45,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)} className="k-icon-btn">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#ff5a2d',
                  }} />
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    style={{
                      position: 'absolute', top: '100%', right: 0, marginTop: 8,
                      width: 300, background: '#111',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Notifications</span>
                    </div>
                    {notifications.map(n => (
                      <div key={n.id} style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                          background: n.unread ? '#ff5a2d' : '#333',
                        }} />
                        <div>
                          <div style={{ fontSize: '0.82rem', color: '#ddd' }}>{n.msg}</div>
                          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 3 }}>{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* POST HIGHLIGHT — full pill */}
            <button
              onClick={() => navigate('/training')}
              className="k-btn k-btn-primary"
              style={{ padding: '8px 18px', borderRadius: 9999 }}
            >
              <Plus size={14} />
              POST HIGHLIGHT
            </button>

            {/* Avatar */}
            <button
              onClick={() => navigate('/profile')}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff5a2d, #ff8c66)',
                border: '2px solid rgba(255,90,45,0.5)',
                cursor: 'pointer', flexShrink: 0, padding: 0,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                boxShadow: '0 0 0 0 rgba(255,90,45,0)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff5a2d';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(255,90,45,0.2)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,90,45,0.5)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(255,90,45,0)';
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 30 }}
            />
            <motion.nav
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              style={{
                position: 'fixed', inset: '0 auto 0 0', width: 260,
                background: '#111', zIndex: 40, padding: 24,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.04em' }}>HERS 365</span>
                <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              {nav.map(({ icon: Icon, label, path }) => (
                <Link key={path} to={path} onClick={() => setMobileOpen(false)} className="nav-item"
                  style={location.pathname === path ? { color: '#ff5a2d', background: 'rgba(255,90,45,0.1)', fontWeight: 700, fontSize: '0.78rem' } : { fontWeight: 700, fontSize: '0.78rem' }}>
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
