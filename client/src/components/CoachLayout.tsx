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
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CoachLayout = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

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

  const menuItems = [
    { icon: CircleGauge, label: 'Dashboard', path: '/coach/dashboard' },
    { icon: Search, label: 'Player Search', path: '/coach/search' },
    { icon: ClipboardList, label: 'Scouting Board', path: '/coach/board' },
    { icon: BarChart3, label: 'Analytics', path: '/coach/analytics' },
    { icon: Users, label: 'My Roster', path: '/coach/roster' },
    { icon: MessageSquare, label: 'Messages', path: '/coach/messages' },
  ];

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-surface-card border-r border-white/5 flex flex-col p-6 shadow-2xl">
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
                  <span className="font-semibold tracking-wide">{item.label}</span>
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
            <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center border border-white/10">
              <UserCircle className="text-ink-muted" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-white">Coach Anderson</p>
              <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Premium Access</p>
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
          <h1 className="text-2xl font-bold tracking-tight text-white leading-none">
            {menuItems.find(i => i.path === location.pathname)?.label || 'Overview'}
          </h1>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">System Active</span>
            </div>
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative text-ink-muted hover:text-white transition-colors"
              >
                <Bell size={20} />
                {coachNotifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
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
    </div>
  );
};
