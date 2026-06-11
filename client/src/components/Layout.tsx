import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Trophy, User, Dumbbell, Search,
  Settings, MessageSquare, Menu, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { MobileNav } from './MobileNav';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

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

export const Layout = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode,       setMode]       = useState<'athlete' | 'coach'>('athlete');

  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiFetch<{ success: boolean; data: any }>('/api/users/profile'),
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

        {/* ATHLETE / COACH switch */}
        <div style={{
          display: 'flex',
          background: '#161616',
          borderRadius: 9999,
          padding: 3,
          marginBottom: 32,
        }}>
          <button
            onClick={() => setMode('athlete')}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 9999,
              background: mode === 'athlete' ? '#ff5a2d' : 'transparent',
              color: mode === 'athlete' ? '#fff' : '#555',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            ATHLETE
          </button>
          <button
            onClick={() => {
              const hasCoach = localStorage.getItem('coachToken');
              navigate(hasCoach ? '/coach/dashboard' : '/coach/login');
            }}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 9999,
              background: 'transparent', color: '#555',
              fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em',
              textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            COACH
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path;
            const badge = path === '/messages' && unreadMessages > 0 ? unreadMessages : undefined;
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
            style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            className="flex md:hidden"
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
            <NotificationBell />

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

      <MobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={nav}
      />
    </div>
  );
};
