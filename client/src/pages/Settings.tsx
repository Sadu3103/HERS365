import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Lock,
  Save,
  Eye,
  EyeOff,
  Camera,
  Trash2,
  Loader2
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

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

  const { showNotification } = useNotifications();
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [appearanceTheme, setAppearanceTheme] = useState<string>('Dark');

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    position: 'Quarterback',
    gradYear: '2026',
    height: "5'8\"",
    weight: '145 lbs',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            const names = (data.name || '').split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';
            
            setProfileForm({
              firstName,
              lastName,
              email: data.email || '',
              phone: data.phone || '',
              bio: data.bio || '',
              position: data.position || 'Quarterback',
              gradYear: data.gradYear?.toString() || '2026',
              height: data.height || "5'8\"",
              weight: data.weight || '145 lbs',
            });
          }
        }
      } catch {
        console.error('Failed to load profile settings');
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: `${profileForm.firstName} ${profileForm.lastName}`.trim(),
          email: profileForm.email,
          phone: profileForm.phone,
          bio: profileForm.bio,
          position: profileForm.position,
          gradYear: parseInt(profileForm.gradYear),
          height: profileForm.height,
          weight: profileForm.weight
        }),
      });
      if (res.ok) {
        showNotification('success', 'Profile Updated', 'Your profile details have been saved successfully.');
      } else {
        const errData = await res.json();
        showNotification('error', 'Update Failed', errData.error || 'Failed to update profile.');
      }
    } catch {
      showNotification('error', 'Update Failed', 'An error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(false);
    try {
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await res.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const token = localStorage.getItem('token');
      await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      window.location.reload();
    } catch {
      showNotification('error', 'Upload Failed', 'Could not upload profile photo.');
    } finally {
      setUploading(false);
    }
  };

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

  const saveNotificationPrefs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ category: 'notifications', preferences: notifications }),
      });
      if (res.ok) {
        showNotification('success', 'Saved', 'Notification preferences saved.');
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not save notification preferences.');
    }
  };

  const savePrivacySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ category: 'privacy', preferences: {} }),
      });
      if (res.ok) {
        showNotification('success', 'Saved', 'Privacy settings saved.');
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not save privacy settings.');
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        showNotification('success', 'Account Deletion', 'Account deletion initiated.');
      }
    } catch {
      showNotification('error', 'Failed', 'Could not delete account.');
    }
  };

  const exportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/export', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        showNotification('success', 'Export Ready', 'Your data export is ready.');
      }
    } catch {
      showNotification('error', 'Failed', 'Could not export data.');
    }
  };

  const saveAppearanceSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ category: 'appearance', preferences: { theme: appearanceTheme } }),
      });
      if (res.ok) {
        showNotification('success', 'Saved', `Theme changed to ${appearanceTheme}.`);
      }
    } catch {
      showNotification('error', 'Save Failed', 'Could not save appearance settings.');
    }
  };

  const renderProfileTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile Picture */}
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Profile Picture</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#ff5a2d', padding: 2 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#111', overflow: 'hidden' }}>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <label style={{ position: 'absolute', bottom: 0, right: 0, padding: 8, background: '#ff5a2d', borderRadius: 8, cursor: 'pointer' }}>
              <Camera size={18} color="#fff" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handlePhotoUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div>
            <button
              onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'))}
              disabled={uploading}
              className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-lg font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : uploadSuccess ? 'Uploaded!' : 'Change Picture'}
            </button>
            <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>JPG, PNG, GIF or WebP. Max size 2MB.</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Personal Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">First Name</label>
            <input
              type="text"
              value={profileForm.firstName}
              onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Last Name</label>
            <input
              type="text"
              value={profileForm.lastName}
              onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Phone</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Bio</label>
            <textarea
              rows={4}
              value={profileForm.bio}
              onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Athletic Information */}
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Athletic Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Position</label>
            <select 
              value={profileForm.position}
              onChange={e => setProfileForm({ ...profileForm, position: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            >
              <option value="Quarterback">Quarterback</option>
              <option value="Running Back">Running Back</option>
              <option value="Wide Receiver">Wide Receiver</option>
              <option value="Tight End">Tight End</option>
              <option value="QB">QB</option>
              <option value="WR">WR</option>
              <option value="Center">Center</option>
              <option value="Rusher">Rusher</option>
              <option value="Safety">Safety</option>
              <option value="Corner">Corner</option>
              <option value="Linebacker">Linebacker</option>
              <option value="Kicker">Kicker</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Graduation Year</label>
            <select 
              value={profileForm.gradYear}
              onChange={e => setProfileForm({ ...profileForm, gradYear: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
              <option value="2030">2030</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Height</label>
            <input
              type="text"
              value={profileForm.height}
              onChange={e => setProfileForm({ ...profileForm, height: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Weight</label>
            <input
              type="text"
              value={profileForm.weight}
              onChange={e => setProfileForm({ ...profileForm, weight: e.target.value })}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', description: 'Receive notifications via email' },
            { key: 'push', label: 'Push Notifications', description: 'Receive push notifications in your browser' },
            { key: 'scoutMessages', label: 'Scout Messages', description: 'Get notified when coaches or recruiters message you' },
            { key: 'teamUpdates', label: 'Team Updates', description: 'Receive updates about your team and events' },
            { key: 'marketing', label: 'Marketing Communications', description: 'Receive promotional emails and updates' }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">{item.label}</h4>
                <p className="text-sm text-ink-muted">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof typeof notifications]}
                  onChange={(e) => handleNotificationChange(item.key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coral-500/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral-500" />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Notification Schedule</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Quiet Hours Start</label>
            <input type="time" defaultValue="22:00" className="bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Quiet Hours End</label>
            <input type="time" defaultValue="08:00" className="bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={saveNotificationPrefs} className="flex items-center gap-2 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} /> Save Preferences
        </button>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Privacy Settings</h3>
        <div className="space-y-4">
          {[
            { label: 'Profile Visibility', description: 'Control who can see your profile', value: 'Public' },
            { label: 'Contact Information', description: 'Who can see your email and phone', value: 'Verified Users Only' },
            { label: 'Performance Stats', description: 'Who can view your athletic statistics', value: 'Everyone' },
            { label: 'Activity Status', description: 'Show when you\'re online', value: 'Friends Only' }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">{item.label}</h4>
                <p className="text-sm text-ink-muted">{item.description}</p>
              </div>
              <select className="bg-surface-hover border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-coral-500">
                <option>{item.value}</option>
                <option>Public</option>
                <option>Friends Only</option>
                <option>Private</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Security</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter current password"
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 pr-12 text-white placeholder:text-ink-faint focus:outline-none focus:border-coral-500"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">New Password</label>
            <input type="password" placeholder="Enter new password" className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-ink-faint focus:outline-none focus:border-coral-500" />
          </div>

          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Confirm New Password</label>
            <input type="password" placeholder="Confirm new password" className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-ink-faint focus:outline-none focus:border-coral-500" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button onClick={deleteAccount} className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Trash2 size={18} /> Delete Account
        </button>
        <button onClick={savePrivacySettings} className="flex items-center gap-2 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} /> Save Changes
        </button>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Theme</h3>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {[
             { name: 'Dark', description: 'Classic dark theme' },
             { name: 'Light', description: 'Light theme for better readability' },
             { name: 'Auto', description: 'Follow system preference' }
           ].map((theme) => (
             <div
               key={theme.name}
               onClick={() => setAppearanceTheme(theme.name)}
               className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                 theme.name === appearanceTheme ? 'border-coral-500 bg-coral-500/10' : 'border-white/10 hover:border-white/20'
               }`}
             >
               <h4 className="text-white font-bold mb-2">{theme.name}</h4>
               <p className="text-sm text-ink-muted">{theme.description}</p>
             </div>
           ))}
         </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Language & Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Language</label>
            <select className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500">
              <option>English (US)</option>
              <option>English (UK)</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Timezone</label>
            <select className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500">
              <option>Pacific Time (PT)</option>
              <option>Eastern Time (ET)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={saveAppearanceSettings} className="flex items-center gap-2 px-8 py-4 bg-coral-500 hover:bg-coral-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Save size={18} /> Save Preferences
        </button>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Account Information</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
            <div>
              <h4 className="text-white font-bold">Account Status</h4>
              <p className="text-sm text-ink-muted">Your account is active and verified</p>
            </div>
            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold">Verified</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
            <div>
              <h4 className="text-white font-bold">Member Since</h4>
              <p className="text-sm text-ink-muted">January 15, 2023</p>
            </div>
            <span className="text-ink-muted">1 year ago</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
            <div>
              <h4 className="text-white font-bold">Account Type</h4>
              <p className="text-sm text-ink-muted">Premium Athlete Account</p>
            </div>
            <span className="px-3 py-1 bg-coral-500 text-white rounded-full text-sm font-bold">Premium</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Data Management</h3>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 bg-surface-card/50 hover:bg-surface-card/70 rounded-lg transition-colors">
            <div>
              <h4 className="text-white font-bold">Download My Data</h4>
              <p className="text-sm text-ink-muted">Get a copy of all your data</p>
            </div>
            <Globe size={20} className="text-ink-muted" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-surface-card/50 hover:bg-surface-card/70 rounded-lg transition-colors">
            <div>
              <h4 className="text-white font-bold">Privacy Settings</h4>
              <p className="text-sm text-ink-muted">Manage how your data is used</p>
            </div>
            <Shield size={20} className="text-ink-muted" />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button onClick={deleteAccount} className="flex items-center gap-2 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
          <Trash2 size={18} /> Delete Account
        </button>
        <button onClick={exportData} className="flex items-center gap-2 px-8 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold uppercase tracking-widest transition-colors">
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
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Settings</h1>
        <p className="text-ink-muted text-lg">Manage your account preferences and privacy settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-80 space-y-2">
          {settingSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                  activeTab === section.id ? 'bg-coral-500 text-white' : 'text-ink-muted hover:text-white hover:bg-white/5'
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

        <div className="flex-1">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
};