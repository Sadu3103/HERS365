import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, School, Award, Bell, LogOut, Shield, Megaphone, Calendar } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

interface CoachUser {
  name?: string;
  email?: string;
  school?: string;
  division?: string;
  role?: string;
}

interface NotifPrefs {
  playerApplications: boolean;
  scoutingReports: boolean;
  teamMeetings: boolean;
  systemUpdates: boolean;
}

export function CoachSettings() {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();

  const coachUser: CoachUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('coachUser') || '{}');
    } catch {
      return {};
    }
  })();

  const [prefs, setPrefs] = useState<NotifPrefs>({
    playerApplications: true,
    scoutingReports: true,
    teamMeetings: false,
    systemUpdates: true,
  });

  const togglePref = (key: keyof NotifPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      showNotification('success', 'Preference Saved', `${key.replace(/([A-Z])/g, ' $1').trim()} notifications ${next[key] ? 'enabled' : 'disabled'}.`);
      return next;
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('coachToken');
    localStorage.removeItem('coachUser');
    showNotification('info', 'Signed Out', 'You have been signed out of the Coach Portal.');
    navigate('/coach/login');
  };

  const accountFields = [
    { icon: User, label: 'Full Name', value: coachUser.name || 'Not set' },
    { icon: Mail, label: 'Email', value: coachUser.email || 'Not set' },
    { icon: School, label: 'School', value: coachUser.school || 'Not set' },
    { icon: Award, label: 'Division', value: coachUser.division || 'Not set' },
  ];

  const notifOptions: { key: keyof NotifPrefs; label: string; desc: string; icon: typeof Bell }[] = [
    { key: 'playerApplications', label: 'Player Applications', desc: 'When an athlete applies to your program', icon: User },
    { key: 'scoutingReports', label: 'Scouting Reports', desc: 'When new analysis is ready for review', icon: Megaphone },
    { key: 'teamMeetings', label: 'Team Meetings', desc: 'Scheduled meeting reminders', icon: Calendar },
    { key: 'systemUpdates', label: 'System Updates', desc: 'Platform news and feature announcements', icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-card border border-white/5 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Account Information</h2>
          <p className="text-xs text-ink-muted mt-1">Your coach profile details from this session.</p>
        </div>
        <div className="divide-y divide-white/5">
          {accountFields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink-muted">{label}</p>
                <p className="text-sm font-semibold text-white mt-0.5 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface-card border border-white/5 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Notification Preferences</h2>
          <p className="text-xs text-ink-muted mt-1">Choose which alerts appear in your portal.</p>
        </div>
        <div className="divide-y divide-white/5">
          {notifOptions.map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-surface-hover border border-white/5 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-ink-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-ink-muted mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => togglePref(key)}
                aria-checked={prefs[key]}
                role="switch"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500/50 ${
                  prefs[key] ? 'bg-green-500' : 'bg-surface-hover border border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    prefs[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface-card border border-white/5 rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Session</h2>
          <p className="text-xs text-ink-muted mt-1">End your current Coach Portal session.</p>
        </div>
        <div className="px-6 py-5">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-5 py-3 bg-coral-500/10 border border-coral-500/20 text-coral-400 rounded-xl font-semibold text-sm hover:bg-coral-500/20 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
}
