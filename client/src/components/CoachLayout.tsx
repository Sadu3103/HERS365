import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CircleGauge,
  Users,
  Search,
  MessageSquare,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  Settings,
  Bell,
  UserCircle,
  Menu,
  Inbox,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileNav } from './MobileNav';

export const CoachLayout = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const coachUser: { name?: string; email?: string; school?: string; division?: string; subscriptionTier?: string; role?: string } = (() => {
    try { return JSON.parse(localStorage.getItem('coachUser') || '{}'); } catch { return {}; }
  })();
  const coachName = coachUser.name || 'Coach';
  const coachInitials = coachName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const tierLabel = coachUser.subscriptionTier
    ? `${coachUser.subscriptionTier.charAt(0).toUpperCase()}${coachUser.subscriptionTier.slice(1)} Plan`
    : null;
  const coachSubtitle = coachUser.school || coachUser.division || tierLabel || 'Coach';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const coachNotifications = [
    { id: 1, title: 'New Player Application', message: 'Sarah Johnson applied to your program', time: '5m ago', unread: true, action: '/coach/search' },
    { id: 2, title: 'Scouting Report Ready', message: 'Analysis for upcoming tournament completed', time: '1h ago', unread: true, action: '/coach/board' },
    { id: 3, title: 'Team Meeting', message: 'Scheduled for tomorrow at 3 PM', time: '2h ago', unread: false, action: '/coach/messages' },
  ];

  const unreadCount = coachNotifications.filter(n => n.unread).length;

  // Pending-applications badge on the Inbox link. Fire-and-forget; a fetch
  // failure leaves the badge at 0, which is the right default — the link
  // still works and the inbox page will show the real error if any.
  const [pendingApps, setPendingApps] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('coachToken');
        if (!token) return;
        const res = await fetch('/api/coach/applications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const count = Array.isArray(json.data)
          ? (json.data as { status?: string }[]).filter((a) => a.status === 'pending').length
          : 0;
        setPendingApps(count);
      } catch {
        // ignore — badge stays at 0
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  const menuItems: { icon: typeof CircleGauge; label: string; path: string; badge?: number }[] = [
    { icon: CircleGauge, label: 'Dashboard', path: '/coach/dashboard' },
    { icon: Search, label: 'Player Search', path: '/coach/search' },
    { icon: ClipboardList, label: 'Scouting Board', path: '/coach/board' },
    { icon: Inbox, label: 'Inbox', path: '/coach/applications', badge: pendingApps },
    { icon: BarChart3, label: 'Analytics', path: '/coach/analytics' },
    { icon: Users, label: 'My Roster', path: '/coach/roster' },
    { icon: MessageSquare, label: 'Messages', path: '/coach/messages' },
  ];

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-surface-card border-r border-white/5 flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10 px-2 transition-transform hover:scale-105">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <ShieldCheck className="text-white fill-current" size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tighter uppercase text-white">Coach Portal</h2>
            <p className="text-[10px] text-ink-muted font-bold uppercase tracking-[0.2em]">Recruiting Suite</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 5 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-green-500/10 border border-green-500/30 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                      : 'text-ink-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'animate-pulse' : ''} />
                  <span className="font-semibold tracking-wide flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-label={`${item.badge} pending`}
                      className="tnum"
                      style={{
                        background: '#ff5a2d',
                        color: '#0a0a0c',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 9999,
                        minWidth: 20,
                        textAlign: 'center',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 pt-6 border-t border-white/5">
          <Link to="/coach/settings" className="flex items-center gap-3 px-4 py-3 text-ink-muted hover:text-white transition-colors">
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center border border-white/10 shrink-0">
              {coachInitials
                ? <span className="text-xs font-black text-white tracking-wide">{coachInitials}</span>
                : <UserCircle className="text-ink-muted" size={24} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-white">{coachName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider truncate">{coachSubtitle}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-coral-500/5 rounded-full blur-[120px] pointer-events-none -ml-48 -mb-48" />

        <header className="h-20 flex items-center justify-between px-8 z-10 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex md:hidden text-ink-muted hover:text-white transition-colors"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">
              {menuItems.find(i => i.path === location.pathname)?.label || 'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            {unreadCount > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-coral-500/10 border border-coral-500/20 rounded-full">
                <div className="w-2 h-2 bg-coral-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black text-coral-500 uppercase tracking-widest">{unreadCount} New</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">All caught up</span>
              </div>
            )}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                aria-haspopup="menu"
                aria-expanded={notificationsOpen}
                className="relative text-ink-muted hover:text-white transition-colors"
              >
                <Bell size={20} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-coral-500 rounded-full shadow-[0_0_10px_rgba(255,90,45,0.8)]" />
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50"
                  >
                    <div className="p-4 border-b border-white/5">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Coach Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {coachNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate(notification.action);
                          }}
                          className="w-full p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${notification.unread ? 'bg-green-500' : 'bg-surface-hover'}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white">{notification.title}</h4>
                              <p className="text-xs text-ink-muted mt-1">{notification.message}</p>
                              <p className="text-[10px] text-ink-muted font-bold uppercase tracking-widest mt-2">{notification.time}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-4">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/coach/settings'); // Navigate to coach settings
                        }}
                        className="w-full text-center text-xs font-black uppercase tracking-widest text-green-500 hover:text-green-500/80 transition-colors"
                      >
                        View All
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative z-0 scroll-smooth">
          <Outlet />
        </main>
      </div>

      <MobileNav
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={menuItems}
        accent={{ color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' }}
        title="Coach Portal"
      />
    </div>
  );
};
