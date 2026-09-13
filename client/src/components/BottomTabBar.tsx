import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Trophy, User, Search, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const FLAME = '#8B3BFF';

const tabs = [
  { icon: LayoutGrid, label: 'Grid',    path: '/feed' },
  { icon: Trophy,     label: 'Ranking', path: '/rankings' },
  { icon: User,       label: 'Profile', path: '/profile', isMiddle: true },
  { icon: Zap,        label: 'Pro',     path: '/subscribe' },
  { icon: Search,     label: 'Recruit', path: '/recruiting' },
];

interface BottomTabBarProps {
  unreadMessages?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = () => {
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
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 64,
      }}
    >
      {tabs.map(({ icon: Icon, label, path, isMiddle }) => {
        const active = location.pathname === path || (path === '/feed' && location.pathname === '/');

        if (isMiddle) {
          return (
            <Link
              key={path}
              to={path}
              style={{ flex: 1, textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  position: 'relative',
                  top: -6,
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: active
                    ? 'linear-gradient(135deg, #8B3BFF, #FF2E93)'
                    : 'rgba(139, 59, 255, 0.18)',
                  border: active
                    ? '2px solid #fff'
                    : '1.5px solid rgba(139, 59, 255, 0.45)',
                  boxShadow: active
                    ? '0 4px 18px rgba(139, 59, 255, 0.55)'
                    : '0 2px 10px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}>
                  <Icon
                    size={22}
                    color={active ? '#fff' : '#c4b5fd'}
                    strokeWidth={2.3}
                  />
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: active ? 800 : 600,
                  letterSpacing: '0.03em',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  lineHeight: 1,
                  marginTop: 1,
                }}>
                  {label}
                </span>
              </motion.div>
            </Link>
          );
        }

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
                gap: 4,
                paddingTop: 8,
                paddingBottom: 6,
                minHeight: 48,
                position: 'relative',
              }}
            >
              <Icon
                size={22}
                color={active ? FLAME : 'rgba(255,255,255,0.42)'}
                strokeWidth={active ? 2.3 : 1.8}
                style={{ transition: 'color 0.18s, stroke 0.18s' }}
              />

              <span style={{
                fontSize: '0.62rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
                color: active ? FLAME : 'rgba(255,255,255,0.4)',
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
                    width: 28,
                    height: 2.5,
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

