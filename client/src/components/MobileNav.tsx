import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

interface AccentTheme {
  color: string;
  bg: string;
  border: string;
}

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItem[];
  accent?: AccentTheme;
  title?: string;
}

const defaultAccent: AccentTheme = {
  color: '#ff5a2d',
  bg: 'rgba(255,90,45,0.1)',
  border: 'rgba(255,90,45,0.3)',
};

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  items,
  accent = defaultAccent,
  title = 'HERS 365',
}) => {
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              zIndex: 40,
            }}
          />
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              maxWidth: '85vw',
              background: '#111',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 20px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900,
                fontSize: '1.4rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#fff',
              }}>
                {title}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{
              flex: 1,
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {items.map(({ icon: Icon, label, path, badge }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: active ? accent.color : '#aaa',
                      background: active ? accent.bg : 'transparent',
                      border: `1px solid ${active ? accent.border : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Icon size={18} color={active ? accent.color : undefined} />
                      {label}
                    </div>
                    {badge && (
                      <div style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9999,
                        background: accent.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 5px',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>{badge}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};
