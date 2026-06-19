
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Lock,
  Save,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  LogOut
} from 'lucide-react';
import { apiFetch, errorMessage } from '../lib/api';
import { athleteAvatar } from '../lib/avatar';
import { useAuth } from '../context/AuthContext';

// Click-to-upload profile photo. Presigns via /api/upload/presign, PUTs the
// file to S3, then PATCHes the user profile with the resulting publicUrl.
function PhotoUploadCard({
  profile,
  setProfile,
}: {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Please pick an image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB.'); return; }
    setUploading(true);
    try {
      const presign = await apiFetch<{ uploadUrl: string; publicUrl: string }>('/api/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const putRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Upload failed.');
      const res = await apiFetch<{ success: boolean; data: UserProfile }>('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ profileImage: presign.publicUrl }),
      });
      if (res.data) setProfile(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  const currentSrc = profile?.profileImage || athleteAvatar(profile?.name || '');

  return (
    <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Profile Picture</h3>
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-coral-500 to-green-500 p-1">
          <div className="w-full h-full rounded-[14px] bg-surface-card overflow-hidden">
            <img
              src={currentSrc}
              alt="Profile"
              className="w-full h-full object-cover"
              style={{ opacity: uploading ? 0.5 : 1, transition: 'opacity .2s' }}
            />
          </div>
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : profile?.profileImage ? 'Change Photo' : 'Upload Photo'}
          </button>
          <p className="text-xs text-ink-muted mt-2">JPEG, PNG, WebP, or GIF. 5MB max.</p>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  position?: string;
  school?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  gradYear?: number;
  gpa?: string;
  sport?: string;
  bio?: string;
  achievements?: string;
  archetype?: string;
  privacySetting?: string;
  subscriptionTier?: string;
  verificationStatus?: string;
  createdAt?: string;
  role?: string;
  profileImage?: string | null;
  heightIn?: number | null;
  weightLbs?: number | null;
  phone?: string | null;
}

interface SettingSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
}

function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem('hers365_notif_prefs');
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // corrupted localStorage — fall through to defaults
  }
  return { email: true, push: true, scoutMessages: true, teamUpdates: false, marketing: false, quietStart: '22:00', quietEnd: '08:00' };
}

function loadAppearancePrefs() {
  try {
    const raw = localStorage.getItem('hers365_appearance_prefs');
    if (raw) return JSON.parse(raw);
  } catch (_e) {
    // corrupted localStorage — fall through to defaults
  }
  return { theme: 'Dark', language: 'English (US)', timezone: 'Eastern Time (ET)' };
}

export const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('profile');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    position: '',
    school: '',
    state: '',
    city: '',
    zipCode: '',
    gradYear: '',
    gpa: '',
    sport: '',
    bio: '',
    achievements: '',
    heightIn: '',
    weightLbs: '',
    phone: '',
  });

  const [privacySetting, setPrivacySetting] = useState('public');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [privacySaveStatus, setPrivacySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [notifications, setNotifications] = useState(loadNotifPrefs());
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [appearance, setAppearance] = useState(loadAppearancePrefs());
  const [appearanceSaved, setAppearanceSaved] = useState(false);

  const settingSections: SettingSection[] = [
    { id: 'profile', title: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Control your notification preferences' },
    { id: 'privacy', title: 'Privacy & Security', icon: Shield, description: 'Manage privacy and security settings' },
    { id: 'appearance', title: 'Appearance', icon: Palette, description: 'Customize your interface' },
    { id: 'account', title: 'Account', icon: Lock, description: 'Account management and preferences' }
  ];

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: UserProfile }>('/api/users/profile');
      const data = res?.data ?? ({} as UserProfile);
      setProfile(data);
      setForm({
        name: data?.name || '',
        position: data?.position || '',
        school: data?.school || '',
        state: data?.state || '',
        city: data?.city || '',
        zipCode: data?.zipCode || '',
        gradYear: data?.gradYear ? String(data.gradYear) : '',
        gpa: data?.gpa || '',
        sport: data?.sport || '',
        bio: data?.bio || '',
        achievements: data?.achievements || '',
        heightIn: data?.heightIn ? String(data.heightIn) : '',
        weightLbs: data?.weightLbs ? String(data.weightLbs) : '',
        phone: data?.phone || '',
      });
      setPrivacySetting(data?.privacySetting || 'public');
    } catch (err) {
      setProfileError(errorMessage(err, 'Failed to load profile'));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    apiFetch<{ success: boolean; data: typeof notifications }>('/api/users/notification-preferences')
      .then(res => { if (res.data) setNotifications(res.data); })
      .catch(() => {});
  }, []);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (saveStatus === 'saved' || saveStatus === 'error') setSaveStatus('idle');
  };

  const handleSaveProfile = async () => {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const payload: Record<string, any> = {
        name: form.name,
        position: form.position,
        school: form.school,
        state: form.state,
        city: form.city,
        zipCode: form.zipCode,
        gradYear: form.gradYear,
        gpa: form.gpa,
        sport: form.sport,
        bio: form.bio,
        achievements: form.achievements,
        heightIn: form.heightIn || undefined,
        weightLbs: form.weightLbs || undefined,
        phone: form.phone || undefined,
      };
      const res = await apiFetch<{ success: boolean; data: UserProfile }>('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setProfile(res.data);
      if (user && res.data.name) updateUser({ name: res.data.name });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(errorMessage(err, 'Failed to save'));
    }
  };

  const handleSavePrivacy = async () => {
    setPrivacySaveStatus('saving');
    try {
      await apiFetch<{ success: boolean; data: UserProfile }>('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ privacySetting }),
      });
      setPrivacySaveStatus('saved');
      setTimeout(() => setPrivacySaveStatus('idle'), 3000);
    } catch {
      setPrivacySaveStatus('error');
      setTimeout(() => setPrivacySaveStatus('idle'), 3000);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    try {
      const res = await apiFetch<{ success: boolean; data: typeof notifications }>('/api/users/notification-preferences', {
        method: 'PUT', body: JSON.stringify(notifications),
      });
      setNotifications(res.data);
      localStorage.setItem('hers365_notif_prefs', JSON.stringify(res.data));
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch {
      // keep local toggles if save fails
    } finally {
      setNotifSaving(false);
    }
  };

  const handlePhotoPick = async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setPhotoUploading(true);
    try {
      const presign = await apiFetch<{ uploadUrl: string; publicUrl: string }>('/api/upload/presign', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error('Upload failed');
      const res = await apiFetch<{ success: boolean; data: UserProfile }>('/api/users/profile', {
        method: 'PUT', body: JSON.stringify({ profileImage: presign.publicUrl }),
      });
      if (res.data) setProfile(res.data);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) { setPasswordMsg('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg('Passwords do not match.'); return; }
    setPasswordSaving(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST', body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordMsg('Password updated.');
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSaveAppearance = () => {
    localStorage.setItem('hers365_appearance_prefs', JSON.stringify(appearance));
    setAppearanceSaved(true);
    setTimeout(() => setAppearanceSaved(false), 3000);
  };

  const handleExportData = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hers365-profile-${profile.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const renderProfileTab = () => {
    if (profileLoading) {
      return (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={36} className="text-coral-500 animate-spin" />
        </div>
      );
    }
    if (profileError) {
      return (
        <div className="bg-surface-card border border-red-500/30 rounded-3xl p-8 text-center">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-bold">{profileError}</p>
          <button onClick={fetchProfile} className="mt-4 px-6 py-2 bg-coral-500 text-white rounded-lg font-bold uppercase tracking-widest text-sm">Retry</button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <PhotoUploadCard profile={profile} setProfile={setProfile} />

        {/* Personal Information */}
        <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Email <span className="text-xs text-ink-faint normal-case tracking-normal">(read-only)</span></label>
              <input
                type="email"
                value={profile?.email || ''}
                readOnly
                className="w-full bg-surface-card/50 border border-white/10 rounded-lg py-3 px-4 text-ink-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleFormChange('phone', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. 555.867.5309"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Bio</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={e => handleFormChange('bio', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Athletic Information */}
        <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Athletic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Sport</label>
              <input
                type="text"
                value={form.sport}
                onChange={e => handleFormChange('sport', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. Flag Football"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Position</label>
              <input
                type="text"
                value={form.position}
                onChange={e => handleFormChange('position', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. Quarterback"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">School</label>
              <input
                type="text"
                value={form.school}
                onChange={e => handleFormChange('school', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Graduation Year</label>
              <input
                type="text"
                value={form.gradYear}
                onChange={e => handleFormChange('gradYear', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">GPA</label>
              <input
                type="text"
                value={form.gpa}
                onChange={e => handleFormChange('gpa', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. 3.8"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">State</label>
              <input
                type="text"
                value={form.state}
                onChange={e => handleFormChange('state', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. CA"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">City</label>
              <input
                type="text"
                value={form.city}
                onChange={e => handleFormChange('city', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Zip Code</label>
              <input
                type="text"
                value={form.zipCode}
                onChange={e => handleFormChange('zipCode', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Height (inches)</label>
              <input
                type="number"
                value={form.heightIn}
                onChange={e => handleFormChange('heightIn', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. 68 (for 5'8&quot;)"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Weight (lbs)</label>
              <input
                type="number"
                value={form.weightLbs}
                onChange={e => handleFormChange('weightLbs', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
                placeholder="e.g. 145"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Achievements</label>
              <textarea
                rows={3}
                value={form.achievements}
                onChange={e => handleFormChange('achievements', e.target.value)}
                className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500 resize-none"
                placeholder="List your key achievements..."
              />
            </div>
          </div>
        </div>

        {saveStatus === 'error' && saveError && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle size={16} />
            <span className="text-sm font-bold">{saveError}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-colors ${
              saveStatus === 'saved'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-coral-500 hover:bg-coral-600 text-white'
            }`}
          >
            {saveStatus === 'saving' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle size={18} />
            ) : (
              <Save size={18} />
            )}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      {/* Honesty banner: notification preferences are not yet wired to the
          server, only to this browser's localStorage. Without this banner
          the "Save / Saved!" button below implies cross-device persistence
          it doesn't deliver. Privacy preferences (separate tab) DO persist. */}
      <div role="status" aria-live="polite" className="rounded-2xl border border-coral-500/30 bg-coral-500/[0.06] p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-coral-500 shrink-0 mt-0.5" />
        <div className="text-sm text-ink-muted leading-relaxed">
          <span className="font-bold text-white">Coming soon: cross-device sync.</span>{' '}
          Notification preferences here save to this browser only — they won't follow
          you to another device or carry across logouts. Privacy &amp; Security settings
          (separate tab) do save to your account.
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Notification Preferences</h3>
        <p className="text-xs text-ink-faint mb-6">Saved to your account.</p>

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
                  checked={notifications[item.key as keyof typeof notifications] as boolean}
                  onChange={(e) => setNotifications((prev: typeof notifications) => ({ ...prev, [item.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-coral-500/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral-500"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Quiet Hours</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Quiet Hours Start</label>
            <input
              type="time"
              value={notifications.quietStart}
              onChange={e => setNotifications((prev: typeof notifications) => ({ ...prev, quietStart: e.target.value }))}
              className="bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Quiet Hours End</label>
            <input
              type="time"
              value={notifications.quietEnd}
              onChange={e => setNotifications((prev: typeof notifications) => ({ ...prev, quietEnd: e.target.value }))}
              className="bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveNotifications}
          disabled={notifSaving}
          className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-colors ${notifSaved ? 'bg-green-500 text-white' : 'bg-coral-500 hover:bg-coral-600 text-white'}`}
        >
          {notifSaving ? <Loader2 size={18} className="animate-spin" /> : notifSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {notifSaving ? 'Saving…' : notifSaved ? 'Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Profile Visibility</h3>

        <div className="p-4 bg-surface-card/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-bold">Profile Visibility</h4>
              <p className="text-sm text-ink-muted">Control who can see your profile</p>
            </div>
            <select
              value={privacySetting}
              onChange={e => setPrivacySetting(e.target.value)}
              className="bg-surface-hover border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-coral-500"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {[
            { label: 'Contact Information', description: 'Who can see your email', value: 'Verified Users Only' },
            { label: 'Performance Stats', description: 'Who can view your athletic statistics', value: 'Everyone' },
            { label: 'Activity Status', description: "Show when you're online", value: 'Friends Only' }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg opacity-60">
              <div>
                <h4 className="text-white font-bold">{item.label}</h4>
                <p className="text-sm text-ink-muted">{item.description}</p>
              </div>
              <span className="text-xs text-ink-faint border border-white/10 rounded-lg py-2 px-3">Coming soon</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white" />
          <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white" />
          <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white" />
          {passwordMsg && <p className={`text-sm ${passwordMsg === 'Password updated.' ? 'text-green-400' : 'text-red-400'}`}>{passwordMsg}</p>}
          <div className="flex gap-3 items-center">
            <button type="submit" disabled={passwordSaving} className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white rounded-lg font-bold uppercase tracking-widest text-sm">
              {passwordSaving ? 'Saving…' : 'Update Password'}
            </button>
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-ink-muted hover:text-coral-500">Forgot password?</button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink-faint text-sm">
          <Trash2 size={16} className="opacity-50" />
          <span>To delete your account, contact <span className="text-ink-muted">support@hers365.com</span></span>
        </div>
        <button
          onClick={handleSavePrivacy}
          disabled={privacySaveStatus === 'saving'}
          className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-colors ${
            privacySaveStatus === 'saved'
              ? 'bg-green-500 text-white'
              : privacySaveStatus === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-coral-500 hover:bg-coral-600 text-white'
          }`}
        >
          {privacySaveStatus === 'saving' ? <Loader2 size={18} className="animate-spin" /> : privacySaveStatus === 'saved' ? <CheckCircle size={18} /> : <Save size={18} />}
          {privacySaveStatus === 'saving' ? 'Saving…' : privacySaveStatus === 'saved' ? 'Saved!' : privacySaveStatus === 'error' ? "Couldn't save — retry" : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Theme</h3>
        <p className="text-xs text-ink-faint mb-6">Saved to this device only.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Dark', 'Light', 'Auto'].map((themeName) => (
            <div
              key={themeName}
              onClick={() => setAppearance((prev: typeof appearance) => ({ ...prev, theme: themeName }))}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                appearance.theme === themeName
                  ? 'border-coral-500 bg-coral-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <h4 className="text-white font-bold mb-2">{themeName}</h4>
              <p className="text-sm text-ink-muted">
                {themeName === 'Dark' ? 'Classic dark theme' : themeName === 'Light' ? 'Light theme for better readability' : 'Follow system preference'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Language & Region</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Language</label>
            <select
              value={appearance.language}
              onChange={e => setAppearance((prev: typeof appearance) => ({ ...prev, language: e.target.value }))}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            >
              <option>English (US)</option>
              <option>English (UK)</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink-muted uppercase tracking-widest mb-2">Timezone</label>
            <select
              value={appearance.timezone}
              onChange={e => setAppearance((prev: typeof appearance) => ({ ...prev, timezone: e.target.value }))}
              className="w-full bg-surface-card border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-coral-500"
            >
              <option>Pacific Time (PT)</option>
              <option>Eastern Time (ET)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveAppearance}
          className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-colors ${appearanceSaved ? 'bg-green-500 text-white' : 'bg-coral-500 hover:bg-coral-600 text-white'}`}
        >
          {appearanceSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {appearanceSaved ? 'Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );

  const renderAccountTab = () => {
    const memberSince = profile?.createdAt
      ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    const tier = profile?.subscriptionTier || 'free';
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const tierColor = tier === 'premium' ? 'bg-coral-500' : tier === 'elite' ? 'bg-yellow-500' : 'bg-surface-hover';

    const vStatus = profile?.verificationStatus || 'unverified';
    const isVerified = vStatus === 'verified';

    return (
      <div className="space-y-6">
        <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Account Information</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">Account Status</h4>
                <p className="text-sm text-ink-muted capitalize">{vStatus}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${isVerified ? 'bg-green-500 text-white' : 'bg-surface-hover text-ink-muted border border-white/10'}`}>
                {isVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">Member Since</h4>
                <p className="text-sm text-ink-muted">{memberSince}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-card/50 rounded-lg">
              <div>
                <h4 className="text-white font-bold">Account Type</h4>
                <p className="text-sm text-ink-muted capitalize">{tier} Athlete Account</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${tierColor}`}>
                {tierLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-tight">Data Management</h3>

          <div className="space-y-4">
            <button
              onClick={handleExportData}
              disabled={!profile}
              className="w-full flex items-center justify-between p-4 bg-surface-card/50 hover:bg-surface-card/70 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <h4 className="text-white font-bold">Download My Data</h4>
                <p className="text-sm text-ink-muted">Download your profile as JSON</p>
              </div>
              <Download size={20} className="text-ink-muted" />
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className="w-full flex items-center justify-between p-4 bg-surface-card/50 hover:bg-surface-card/70 rounded-lg transition-colors"
            >
              <div>
                <h4 className="text-white font-bold">Privacy Settings</h4>
                <p className="text-sm text-ink-muted">Manage how your data is used</p>
              </div>
              <Globe size={20} className="text-ink-muted" />
            </button>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">Session</h3>
          <button
            type="button"
            onClick={() => { apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {}); logout(); navigate('/auth'); }}
            className="flex items-center gap-2 px-6 py-3 bg-surface-hover hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold uppercase tracking-widest text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-3xl backdrop-blur-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-tight">Danger Zone</h3>
          <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
            <Trash2 size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-red-400 font-bold text-sm uppercase tracking-widest mb-1">Delete Account</h4>
              <p className="text-sm text-ink-muted">Account deletion is handled by our support team. Email <span className="text-ink-light">support@hers365.com</span> to request deletion.</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Settings
        </h1>
        <p className="text-ink-muted text-lg">
          Manage your account preferences and privacy settings
        </p>
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
                  activeTab === section.id
                    ? 'bg-coral-500 text-white'
                    : 'text-ink-muted hover:text-white hover:bg-white/5'
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
