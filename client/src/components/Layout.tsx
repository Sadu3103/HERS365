import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Trophy, User, Dumbbell, Search,
  Settings, MessageSquare, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BottomTabBar } from './BottomTabBar';
import { NotificationBell } from './NotificationBell';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { athleteAvatar } from '../lib/avatar';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const nav: NavItem[] = [
  { icon: LayoutGrid,    label: 'THE GRID',   path: '/feed' },
  { icon: Trophy,        label: 'RANKINGS',   path: '/rankings' },
  { icon: User,          label: 'MY PROFILE', path: '/profile' },
  { icon: Dumbbell,      label: 'TRAINING',   path: '/training' },
  { icon: Search,        label: 'RECRUITING', path: '/recruiting' },
  { icon: MessageSquare, label: 'MESSAGES',   path: '/messages' },
];

const pageTransition = {
  initial: { opacity: 0, y: 10, scale: 0.992 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit:    { opacity: 0, y: -4, scale: 1.004 },
  transition: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 34,
    mass: 0.8,
  },
};

export const Layout = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mode, setMode] = useState<'athlete' | 'coach'>('athlete');

  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<{ success: boolean; data: { position?: string; gradYear?: number; g5Rating?: number } }>('/api/users/profile'),
    enabled: !!user,
  });

  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => apiFetch<{ success: boolean; data: { totalUnread: number } }>('/api/messages/unread-count'),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadMessages = unread?.data?.totalUnread ?? 0;
  const p = profile?.data ?? {};

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>

      {/* ─── Desktop Sidebar ─── */}
      <aside
        className="hidden md:flex"
        style={{
          width: 240,
          flexShrink: 0,
          flexDirection: 'column',
          padding: '28px 16px',
          background: '#0a0a0a',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 20, paddingLeft: 4 }}>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900,
            fontSize: '1.6rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#fff',
          }}>
            HERS<span style={{ color: '#ff5a2d' }}>365</span>
          </span>
        </div>

        {/* ATHLETE / COACH switch */}
        <div style={{
          display: 'flex',
          background: '#161616',
          borderRadius: 9999,
          padding: 3,
          marginBottom: 32,
        }}>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMode('athlete')}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 9999,
              background: mode === 'athlete' ? '#ff5a2d' : 'transparent',
              color: mode === 'athlete' ? '#fff' : '#555',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            ATHLETE
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const hasCoach = localStorage.getItem('coachToken');
              navigate(hasCoach ? '/coach/dashboard' : '/coach/login');
            }}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 9999,
              background: 'transparent', color: '#555',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            COACH
          </motion.button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            const badge = path === '/messages' && unreadMessages > 0 ? unreadMessages : undefined;
            return (
              <motion.div key={path} whileTap={{ scale: 0.97 }} style={{ borderRadius: 9 }}>
                <Link
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
              </motion.div>
            );
          })}
        </nav>

        {/* Bottom: settings + profile card */}
        <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <motion.div whileTap={{ scale: 0.97 }} style={{ borderRadius: 9 }}>
            <Link
              to="/settings"
              className={`nav-item${location.pathname === '/settings' ? ' nav-active' : ''}`}
              style={{ fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.04em' }}
            >
              <Settings size={17} />
              SETTINGS
            </Link>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              cursor: 'pointer', marginTop: 10,
              width: '100%', textAlign: 'left',
              transition: 'border-color 0.2s ease, background 0.2s ease',
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
                src={athleteAvatar(user?.name ?? 'You')}
                alt={user?.name ?? 'Profile'}
                style={{ width: 32, height: 32, borderRadius: '50%', background: '#1c1c1c', border: '1.5px solid rgba(255,90,45,0.4)', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: '#4ade80', border: '1.5px solid #0a0a0a',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name ?? 'Your Profile'}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#555', marginTop: 1 }}>
                {[p.position, p.gradYear].filter(Boolean).join(' | ') || 'Complete your profile'}
              </div>
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#ff5a2d', flexShrink: 0 }}>
              {p.g5Rating ?? '—'}
            </div>
          </motion.button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Header — frosted glass */}
        <header style={{
          height: 56,
          display: 'flex', alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,10,10,0.84)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          flexShrink: 0,
          zIndex: 30,
          gap: 14,
        }}>
          {/* Mobile logo */}
          <div className="flex md:hidden" style={{ flexShrink: 0 }}>
            <span style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 900,
              fontSize: '1.35rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#fff',
            }}>
              HERS<span style={{ color: '#ff5a2d' }}>365</span>
            </span>
          </div>

          {/* Search — desktop only */}
          <div className="hidden md:block" style={{ flex: 1, position: 'relative', maxWidth: 500 }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search athletes, drills, schools..."
              style={{
                width: '100%',
                background: '#161616',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9999,
                padding: '7px 18px 7px 38px',
                fontSize: '0.8rem',
                color: '#fff',
                outline: 'none',
                transition: 'border-color 0.18s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(255,90,45,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <NotificationBell />

            {/* POST HIGHLIGHT — desktop only */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate('/training')}
              className="k-btn k-btn-primary hidden md:flex"
              style={{ padding: '7px 16px', borderRadius: 9999 }}
            >
              <Plus size={14} />
              POST HIGHLIGHT
            </motion.button>

            {/* Avatar */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/profile')}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff5a2d, #ff8c66)',
                border: '2px solid rgba(255,90,45,0.5)',
                cursor: 'pointer', flexShrink: 0, padding: 0,
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
              whileHover={{
                boxShadow: '0 0 0 3px rgba(255,90,45,0.2)',
                borderColor: '#ff5a2d',
              }}
            />
          </div>
        </header>

        <ProfileCompletionBanner />
        {/* Page Content */}
        <main
          className="main-scroll"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        >
          <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                {...pageTransition}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomTabBar unreadMessages={unreadMessages} />
    </div>
  );
};
