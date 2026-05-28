import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Trophy, 
  User, 
  Dumbbell, 
  Search, 
  Users, 
  Bell, 
  Settings, 
  MessageSquare,
  Shield,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarItemProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  path: string;
  active: boolean;
  collapsed: boolean;
}

const SidebarItem = ({ icon: Icon, label, path, active, collapsed }: SidebarItemProps) => (
  <Link to={path} className="block">
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
          : 'text-dark-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon size={22} className={active ? 'animate-pulse' : ''} />
      {!collapsed && (
        <span className="font-medium tracking-wide">{label}</span>
      )}
    </motion.div>
  </Link>
);

export const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, title: 'New Scout Interest', message: 'Coach Johnson viewed your profile', time: '2m ago', unread: true, action: '/messages' },
    { id: 2, title: 'Training Reminder', message: 'Agility session starts in 30 minutes', time: '15m ago', unread: true, action: '/training' },
    { id: 3, title: 'Rank Updated', message: 'You moved up to #42 in rankings', time: '1h ago', unread: false, action: '/rankings' },
  ];

  const menuItems = [
    { icon: Home, label: 'Feed', path: '/' },
    { icon: Trophy, label: 'Rankings', path: '/rankings' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Dumbbell, label: 'Training', path: '/training' },
    { icon: Search, label: 'Recruiting', path: '/recruiting' },
    { icon: Users, label: 'Teams', path: '/teams' },
    { icon: Shield, label: 'Compliance', path: '/audit' },
  ];

  return (
    <div className="flex h-screen bg-dark-900 text-white overflow-hidden cyber-grid">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className="hidden md:flex flex-col bg-dark-800/50 backdrop-blur-xl border-r border-white/5 p-4 relative z-20"
      >
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/40">
            <Zap className="text-white fill-current" size={24} />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold tracking-tighter text-gradient-glow uppercase">HERS365</span>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              {...item}
              active={location.pathname === item.path}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="mt-auto space-y-2 pt-4 border-t border-white/5">
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            path="/settings" 
            active={location.pathname === '/settings'}
            collapsed={collapsed}
          />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center gap-3 px-4 py-3 text-dark-400 hover:text-white transition-colors"
          >
            {collapsed ? <Menu size={22} /> : <X size={22} />}
            {!collapsed && <span className="font-medium">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-dark-900/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-dark-300"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold tracking-tight">
              {menuItems.find(i => i.path === location.pathname)?.label || 'Platform'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search athletes, drills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/recruiting?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="hidden lg:block w-64 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-500/50 transition-all"
              />
            </div>
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-dark-300 hover:text-white transition-colors relative"
              >
                <Bell size={20} />
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50"
                  >
                    <div className="p-4 border-b border-white/5">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate(notification.action);
                          }}
                          className="w-full p-4 border-b border-white/5 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${notification.unread ? 'bg-accent' : 'bg-dark-600'}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white">{notification.title}</h4>
                              <p className="text-xs text-dark-300 mt-1">{notification.message}</p>
                              <p className="text-[10px] text-dark-500 font-bold uppercase tracking-widest mt-2">{notification.time}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="p-4">
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/settings'); // Navigate to settings where notifications can be managed
                        }}
                        className="w-full text-center text-xs font-black uppercase tracking-widest text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        View All
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="p-2 text-dark-300 hover:text-white transition-colors relative"
            >
              <MessageSquare size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full"></span>
            </button>
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccountOpen(!accountOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent shadow-lg shadow-brand-500/20 cursor-pointer"
              />
              {/* Account Dropdown */}
              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50"
                  >
                    <div className="p-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent shadow-lg shadow-brand-500/20" />
                        <div>
                          <p className="text-sm font-bold text-white">Sarah Johnson</p>
                          <p className="text-xs text-accent font-bold uppercase tracking-widest">Premium Athlete</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => navigate('/profile')}
                        className="w-full text-left px-4 py-3 text-sm text-dark-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full text-left px-4 py-3 text-sm text-dark-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          // Clear local storage and redirect to auth
                          localStorage.removeItem('user');
                          localStorage.removeItem('token');
                          navigate('/auth');
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 scroll-smooth">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-dark-800 z-40 p-6 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <span className="text-xl font-bold tracking-tighter uppercase text-gradient">HERS365</span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                {menuItems.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 text-lg font-medium text-dark-300 hover:text-white"
                  >
                    <item.icon size={24} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
