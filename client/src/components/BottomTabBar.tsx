import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Trophy, User, Dumbbell, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const FLAME = '#ff5a2d';

const tabs = [
  { icon: LayoutGrid,    label: 'Grid',     path: '/feed' },
  { icon: Trophy,        label: 'Rankings', path: '/rankings' },
  { icon: User,          label: 'Profile',  path: '/profile' },
  { icon: Dumbbell,      label: 'Train',    path: '/training' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
];

interface BottomTabBarProps {
  unreadMessages?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ unreadMessages = 0 }) => {
  const location = useLocation();

  return (
    <nav
      className="flex md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(10,10,10,0.88)',
        backdropFilter: 'blur(24px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path || (path === '/feed' && location.pathname === '/');
        const hasBadge = path === '/messages' && unreadMessages > 0;

        return (
          <Link
            key={path}
            to={path}
            style={{ flex: 1, textDecoration: 'none' }}
          >
            <motion.div
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 600, damping: 22 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingTop: 10,
                paddingBottom: 8,
                position: 'relative',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Icon
                  size={22}
                  color={active ? FLAME : 'rgba(255,255,255,0.38)'}
                  strokeWidth={active ? 2.2 : 1.8}
                  style={{ transition: 'color 0.18s, stroke 0.18s' }}
                />
                {hasBadge && (
                  <div style={{
                    position: 'absolute',
                    top: -3,
                    right: -5,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 9999,
                    background: FLAME,
                    border: '1.5px solid #0a0a0a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                  }}>
                    <span style={{ fontSize: '0.52rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  </div>
                )}
              </div>

              <span style={{
                fontSize: '0.6rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
                color: active ? FLAME : 'rgba(255,255,255,0.35)',
                transition: 'color 0.18s',
                lineHeight: 1,
              }}>
                {label}
              </span>

              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 32,
                    height: 2,
                    borderRadius: 9999,
                    background: FLAME,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
};
