
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Lock,
  Mail,
  Phone,
  MapPin,
  Save,
  Eye,
  EyeOff,
  Camera,
  Trash2
} from 'lucide-react';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
}

export const Settings = () => {
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    scoutMessages: true,
    teamUpdates: false,
    marketing: false
  });

  const settingSections: SettingSection[] = [
    { id: 'profile', title: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Control your notification preferences' },
    { id: 'privacy', title: 'Privacy & Security', icon: Shield, description: 'Manage privacy and security settings' },
    { id: 'appearance', title: 'Appearance', icon: Palette, description: 'Customize your interface' },
    { id: 'account', title: 'Account', icon: Lock, description: 'Account management and preferences' }
  ];

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const renderProfileTab = () => (
    <div className="space-y-8">
      {/* Profile Picture */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Profile Picture</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-500 to-accent p-1">
              <div className="w-full h-full rounded-[14px] bg-dark-800 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Profile" />
              </div>
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors">
              <Camera size={16} />
            </button>
          </div>
          <div>
            <button className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-bold uppercase tracking-widest transition-colors mb-2">
              Change Picture
            </button>
            <p className="text-sm text-dark-400">JPG, PNG or GIF. Max size 2MB.</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">First Name</label>
            <input
              type="text"
              defaultValue="Sarah"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Last Name</label>
            <input
              type="text"
              defaultValue="Johnson"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              defaultValue="sarah.johnson@email.com"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Phone</label>
            <input
              type="tel"
              defaultValue="+1 (555) 123-4567"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Bio</label>
            <textarea
              rows={4}
              defaultValue="Passionate quarterback with a love for the game and academics. Leading my team to victory while maintaining straight A's."
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Athletic Information */}
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Athletic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Position</label>
            <select className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500">
              <option>Quarterback</option>
              <option>Running Back</option>
              <option>Wide Receiver</option>
              <option>Tight End</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Graduation Year</label>
            <select className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500">
              <option>2026</option>
              <option>2027</option>
              <option>2028</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Height</label>
              <input
                type="text"
                defaultValue="5'8&quot;"
                className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
              />
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Weight</label>
            <input
              type="text"
              defaultValue="145 lbs"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Notification Preferences</h3>

        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
            { key: 'push', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
            { key: 'scoutMessages', label: 'Scout Messages', description: 'Get notified when coaches or recruiters message you' },
            { key: 'teamUpdates', label: 'Team Updates', description: 'Receive updates about your team and events' },
            { key: 'marketing', label: 'Marketing Communications', description: 'Receive promotional emails and updates' }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">{item.label}</h4>
                <p className="text-sm text-dark-400">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof typeof notifications]}
                  onChange={(e) => handleNotificationChange(item.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-500/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Notification Schedule</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Quiet Hours Start</label>
            <input
              type="time"
              defaultValue="22:00"
              className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Quiet Hours End</label>
            <input
              type="time"
              defaultValue="08:00"
              className="bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} />
          Save Preferences
        </button>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Privacy Settings</h3>

        <div className="space-y-4">
          {[
            { label: 'Profile Visibility', description: 'Control who can see your profile', value: 'Public' },
            { label: 'Contact Information', description: 'Who can see your email and phone', value: 'Verified Users Only' },
            { label: 'Performance Stats', description: 'Who can view your athletic statistics', value: 'Everyone' },
            { label: 'Activity Status', description: 'Show when you\'re online', value: 'Friends Only' }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">{item.label}</h4>
                <p className="text-sm text-dark-400">{item.description}</p>
              </div>
              <select className="bg-dark-700 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-brand-500">
                <option>{item.value}</option>
                <option>Public</option>
                <option>Friends Only</option>
                <option>Private</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Security</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 pr-12 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Trash2 size={18} />
          Delete Account
        </button>
        <button className="flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} />
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Theme</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Dark', description: 'Classic dark theme', active: true },
            { name: 'Light', description: 'Light theme for better readability', active: false },
            { name: 'Auto', description: 'Follow system preference', active: false }
          ].map((theme) => (
            <div
              key={theme.name}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                theme.active
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <h4 className="text-white font-bold mb-2">{theme.name}</h4>
              <p className="text-sm text-dark-400">{theme.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Language & Region</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Language</label>
            <select className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500">
              <option>English (US)</option>
              <option>English (UK)</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-dark-400 uppercase tracking-widest mb-2">Timezone</label>
            <select className="w-full bg-dark-800 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-brand-500">
              <option>Pacific Time (PT)</option>
              <option>Eastern Time (ET)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} />
          Save Preferences
        </button>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Account Information</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
            <div>
              <h4 className="text-white font-bold">Account Status</h4>
              <p className="text-sm text-dark-400">Your account is active and verified</p>
            </div>
            <span className="px-3 py-1 bg-accent text-white rounded-full text-sm font-bold">Verified</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
            <div>
              <h4 className="text-white font-bold">Member Since</h4>
              <p className="text-sm text-dark-400">January 15, 2023</p>
            </div>
            <span className="text-dark-400">1 year ago</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
            <div>
              <h4 className="text-white font-bold">Account Type</h4>
              <p className="text-sm text-dark-400">Premium Athlete Account</p>
            </div>
            <span className="px-3 py-1 bg-brand-500 text-white rounded-full text-sm font-bold">Premium</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Data Management</h3>

        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800/70 rounded-lg transition-colors">
            <div>
              <h4 className="text-white font-bold">Download My Data</h4>
              <p className="text-sm text-dark-400">Get a copy of all your data</p>
            </div>
            <Globe size={20} className="text-dark-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800/70 rounded-lg transition-colors">
            <div>
              <h4 className="text-white font-bold">Privacy Settings</h4>
              <p className="text-sm text-dark-400">Manage how your data is used</p>
            </div>
            <Shield size={20} className="text-dark-400" />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Trash2 size={18} />
          Delete Account
        </button>
        <button className="flex items-center gap-2 px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          Export Data
        </button>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'notifications': return renderNotificationsTab();
      case 'privacy': return renderPrivacyTab();
      case 'appearance': return renderAppearanceTab();
      case 'account': return renderAccountTab();
      default: return renderProfileTab();
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Settings
        </h1>
        <p className="text-dark-300 text-lg">
          Manage your account preferences and privacy settings
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-80 space-y-2">
          {settingSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                  activeTab === section.id
                    ? 'bg-brand-500 text-white'
                    : 'text-dark-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
                <div>
                  <h3 className="font-bold uppercase tracking-widest">{section.title}</h3>
                  <p className="text-sm opacity-75">{section.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};
