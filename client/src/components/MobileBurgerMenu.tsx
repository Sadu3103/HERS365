import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, MessageSquare, Dumbbell, Film, DollarSign,
  Calculator, Settings, Award, LogOut, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { athleteAvatar } from '../lib/avatar';

const FLAME = '#8B3BFF';

interface MobileBurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  unreadMessages?: number;
}

export const MobileBurgerMenu: React.FC<MobileBurgerMenuProps> = ({
  isOpen,
  onClose,
  unreadMessages = 0,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = () => {
    onClose();
    logout();
    navigate('/auth');
  };

  const menuItems = [
    {
      label: 'Messages',
      path: '/messages',
      icon: MessageSquare,
      badge: unreadMessages > 0 ? unreadMessages : null,
      color: '#a78bfa',
    },
    {
      label: 'Training & Drills',
      path: '/training',
      icon: Dumbbell,
      color: '#38bdf8',
    },
    {
      label: 'MaxPreps Stat Verification',
      path: '/maxpreps',
      icon: Award,
      color: '#facc15',
    },
    {
      label: 'Highlight Video Studio',
      path: '/studio',
      icon: Film,
      color: '#f43f5e',
    },
    {
      label: 'NIL Marketplace',
      path: '/nil',
      icon: DollarSign,
      color: '#4ade80',
    },
    {
      label: 'College Fit Calculator',
      path: '/fit-calculator',
      icon: Calculator,
      color: '#e879f9',
    },
    {
      label: 'Account Settings',
      path: '/settings',
      icon: Settings,
      color: '#94a3b8',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 998,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '84%',
              maxWidth: 340,
              background: '#0e0e0e',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.8)',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  letterSpacing: '0.04em',
                  color: '#fff',
                  textTransform: 'uppercase',
                }}>
                  HERS<span style={{ color: FLAME }}>365</span>
                  <span style={{ fontSize: '0.65rem', color: '#888', marginLeft: 6, fontWeight: 600 }}>HUB</span>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Athlete profile preview card */}
            {user && (
              <div
                onClick={() => handleNavigate('/profile')}
                style={{
                  margin: '16px 16px 8px',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, rgba(139,59,255,0.18), rgba(20,20,20,0.9))',
                  border: '1px solid rgba(139, 59, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}
              >
                <img
                  src={user.avatar || athleteAvatar(user.name || 'Athlete')}
                  alt={user.name}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #8B3BFF',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Sparkles size={11} />
                    {(user.subscriptionTier || user.tier || 'Free Member').toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            {/* Menu List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#666',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 8px',
              }}>
                Athlete Tools & Communications
              </div>

              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigate(item.path)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      color: '#fff',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                      }}>
                        <Icon size={18} />
                      </div>
                      <span>{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span style={{
                        background: FLAME,
                        color: '#fff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 9999,
                      }}>
                        {item.badge}
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>

            {/* Sign Out Button */}
            {user && (
              <div style={{
                padding: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px',
                    borderRadius: 12,
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.28)',
                    color: '#f87171',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={16} />
                  SIGN OUT
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
