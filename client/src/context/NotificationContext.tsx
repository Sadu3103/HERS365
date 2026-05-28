import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (type: NotificationType, title: string, message: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => removeNotification(id), 5000);
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      
      {/* Notification Portal */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-4 w-96 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto"
            >
              <div className="glass-premium p-5 rounded-2xl border border-white/10 shadow-2xl flex gap-4 items-start relative overflow-hidden group">
                {/* Glow Effect */}
                <div className={`absolute inset-0 opacity-10 blur-2xl -z-10 ${
                  n.type === 'success' ? 'bg-accent' :
                  n.type === 'error' ? 'bg-red-500' :
                  'bg-brand-500'
                }`} />

                <div className={`p-2 rounded-xl flex-shrink-0 ${
                  n.type === 'success' ? 'bg-accent/20 text-accent' :
                  n.type === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-brand-500/20 text-brand-400'
                }`}>
                  {n.type === 'success' && <CheckCircle size={20} />}
                  {n.type === 'error' && <AlertCircle size={20} />}
                  {n.type === 'info' && <Info size={20} />}
                  {n.type === 'warning' && <Bell size={20} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black uppercase tracking-widest text-white mb-1">{n.title}</h4>
                  <p className="text-xs text-dark-300 font-medium leading-relaxed">{n.message}</p>
                </div>

                <button 
                  onClick={() => removeNotification(n.id)}
                  className="p-1 text-dark-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Progress bar */}
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${
                    n.type === 'success' ? 'bg-accent' :
                    n.type === 'error' ? 'bg-red-500' :
                    'bg-brand-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
