import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Edit3, CheckCircle2, Share2, MessageSquare, Loader2, AlertTriangle,
  UserX, Link2, Instagram, Eye, Play, Upload, Film, Image, Trophy, Zap,
  Activity, X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { athleteAvatar } from '../lib/avatar';

interface ApiProfile {
  id: number;
  name: string;
  position: string;
  state: string;
  city: string;
  school: string;
  gradYear: number;
  gpa: string | null;
  bio: string | null;
  achievements: string;
  verificationStatus: string;
  g5Rating: number;
  archetype: string;
  nilPoints: number;
  heightIn: number | null;
  weightLbs: number | null;
}

interface EditForm {
  name: string;
  position: string;
  school: string;
  location: string;
  gradYear: string;
  bio: string;
  heightIn: string;
  weightLbs: string;
}

interface GameStat {
  passingAttempts: number | null;
  passingCompletions: number | null;
  passingYards: number | null;
  passingTds: number | null;
  interceptionsThrown: number | null;
  rushingAttempts: number | null;
  rushingYards: number | null;
  rushingTds: number | null;
  receptions: number | null;
  receivingYards: number | null;
  receivingTds: number | null;
  flagPulls: number | null;
  interceptionsCaught: number | null;
  passBreakups: number | null;
  defensiveTds: number | null;
}

interface CombineStat {
  fortyDash: string | null;
  shuttle: string | null;
  vertical: string | null;
  broadJump: string | null;
  threeCone: string | null;
}

interface Highlight {
  id: number;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  season: string | null;
  createdAt: string;
}

const tabs = ['Overview', 'Stats', 'Highlights', 'Activity'];

function fmtHeight(inches: number | null): string {
  if (!inches) return '--';
  const ft = Math.floor(inches / 12);
  const rem = inches % 12;
  return `${ft}'${rem}"`;
}

function sumGameStats(stats: GameStat[]): GameStat {
  const acc: Record<string, number> = {
    passingAttempts: 0, passingCompletions: 0, passingYards: 0, passingTds: 0,
    interceptionsThrown: 0, rushingAttempts: 0, rushingYards: 0, rushingTds: 0,
    receptions: 0, receivingYards: 0, receivingTds: 0, flagPulls: 0,
    interceptionsCaught: 0, passBreakups: 0, defensiveTds: 0,
  };
  for (const s of stats) {
    for (const k of Object.keys(acc)) {
      acc[k] += (s as any)[k] ?? 0;
    }
  }
  return acc as any;
}

export const Profile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('Overview');
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const isOwnProfile = !!profile && !!user && user.id === profile.id;
  const canEdit = isOwnProfile && user.role !== 'coach';
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [viewAsCoach, setViewAsCoach] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', position: '', school: '', location: '', gradYear: '', bio: '', heightIn: '', weightLbs: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [gameStats, setGameStats] = useState<GameStat[]>([]);
  const [combineStats, setCombineStats] = useState<CombineStat | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [uploadingHighlight, setUploadingHighlight] = useState(false);
  const highlightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    if (shareOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareOpen]);

  const closeEdit = useCallback(() => setEditOpen(false), []);
  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeEdit(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editOpen, closeEdit]);
  useEffect(() => { if (editOpen) nameInputRef.current?.focus(); }, [editOpen]);

  const profileUrl = id ? `https://hers365.com/profile/${id}` : `https://hers365.com/profile`;

  const openEdit = () => {
    if (!profile) return;
    setEditForm({
      name: profile.name ?? '',
      position: profile.position ?? '',
      school: profile.school ?? '',
      location: profile.state ?? '',
      gradYear: profile.gradYear != null ? String(profile.gradYear) : '',
      bio: profile.bio ?? '',
      heightIn: profile.heightIn != null ? String(profile.heightIn) : '',
      weightLbs: profile.weightLbs != null ? String(profile.weightLbs) : '',
    });
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { setEditError('Name is required.'); return; }
    if (editForm.gradYear && (!/^\d{4}$/.test(editForm.gradYear) || Number(editForm.gradYear) < 2020 || Number(editForm.gradYear) > 2035)) {
      setEditError('Graduation year must be a valid 4-digit year (2020-2035).');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await apiFetch<ApiProfile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          position: editForm.position.trim() || undefined,
          school: editForm.school.trim() || undefined,
          state: editForm.location.trim() || undefined,
          gradYear: editForm.gradYear ? Number(editForm.gradYear) : undefined,
          bio: editForm.bio.trim() || undefined,
          heightIn: editForm.heightIn || undefined,
          weightLbs: editForm.weightLbs || undefined,
        }),
      });
      setProfile(updated);
      setEditOpen(false);
      showNotification('success', 'Profile updated', 'Your changes have been saved.');
    } catch (err: any) {
      setEditError(err.message || 'Failed to save. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setIsError(false);
      setIsEmpty(false);
      try {
        const endpoint = id ? `/api/players/${id}` : '/api/profile';
        const data = await apiFetch<ApiProfile | null>(endpoint);
        if (!data || !data.name) { setIsEmpty(true); } else { setProfile(data); }
      } catch { setIsError(true); }
      finally { setIsLoading(false); }
    };
    loadProfile();
  }, [id]);

  useEffect(() => {
    if (!profile) return;
    setStatsLoading(true);
    if (isOwnProfile) {
      apiFetch<{ game: GameStat[]; combine: CombineStat | null }>('/api/profile/stats')
        .then(d => { setGameStats(d.game ?? []); setCombineStats(d.combine ?? null); })
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    } else {
      apiFetch<GameStat[]>(`/api/players/${profile.id}/stats`)
        .then(d => { setGameStats(Array.isArray(d) ? d : []); })
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    }
  }, [profile, isOwnProfile]);

  useEffect(() => {
    if (!profile) return;
    setHighlightsLoading(true);
    apiFetch<Highlight[]>(`/api/players/${profile.id}/highlights`)
      .then(d => setHighlights(Array.isArray(d) ? d : []))
      .catch(() => setHighlights([]))
      .finally(() => setHighlightsLoading(false));
  }, [profile]);

  const handleHighlightUpload = async (file: File) => {
    if (!profile) return;
    setUploadingHighlight(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const presignEndpoint = isVideo ? '/api/upload/video/presign' : '/api/upload/presign';
      const { uploadUrl, publicUrl } = await apiFetch<{ uploadUrl: string; publicUrl: string }>(presignEndpoint, {
        method: 'POST',
        body: JSON.stringify({ contentType: file.type, fileName: file.name }),
      });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const hl = await apiFetch<Highlight>(`/api/players/${profile.id}/highlights`, {
        method: 'POST',
        body: JSON.stringify({
          videoUrl: isVideo ? publicUrl : null,
          thumbnailUrl: !isVideo ? publicUrl : null,
          category: 'general',
          season: String(new Date().getFullYear()),
        }),
      });
      setHighlights(prev => [hl, ...prev]);
      showNotification('success', 'Uploaded!', 'Your highlight has been added.');
    } catch (err: any) {
      showNotification('error', 'Upload failed', err.message || 'Please try again.');
    } finally {
      setUploadingHighlight(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', gap: 16 }}>
        <Loader2 size={40} color="#ff5a2d" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>Loading profile...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError && !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', gap: 16, padding: 24 }}>
        <AlertTriangle size={48} color="#444" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ccc', marginBottom: 6 }}>Something went wrong</p>
          <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 16 }}>Unable to load this profile. Please try again.</p>
          <button onClick={() => window.location.reload()} className="k-btn k-btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#888', gap: 16, padding: 24 }}>
        <UserX size={48} color="#444" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ccc', marginBottom: 6 }}>No profile data found</p>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>This athlete hasn't set up their profile yet.</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const location = [profile.city, profile.state].filter(Boolean).join(', ');
  const score = profile.g5Rating != null ? String(profile.g5Rating * 20) : '--';
  const verified = profile.verificationStatus === 'verified';
  const achievementList = profile.achievements
    ? profile.achievements.split(/[\n,]+/).map(a => a.trim()).filter(Boolean)
    : [];
  const totals = gameStats.length > 0 ? sumGameStats(gameStats) : null;

  const effectiveCanEdit = canEdit && !viewAsCoach;

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
      {viewAsCoach && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '10px 14px' }}>
          <Eye size={14} color="#a78bfa" />
          <span style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 600 }}>Viewing as Coach — edit controls hidden</span>
          <button onClick={() => setViewAsCoach(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
        </div>
      )}

      {/* Hero card */}
      <div className="k-card" style={{ padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(255,90,45,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', borderRadius: 12 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={athleteAvatar(profile.name)} alt={profile.name} style={{ width: 80, height: 80, borderRadius: '50%', background: '#1c1c1c', border: '2px solid rgba(255,90,45,0.3)', objectFit: 'cover' }} />
            {verified && (
              <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                <CheckCircle2 size={18} color="#ff5a2d" fill="#ff5a2d" style={{ background: '#111', borderRadius: '50%' }} />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', textTransform: 'uppercase', color: '#fff', lineHeight: 1, marginBottom: 4 }}>{profile.name}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>{profile.position}</span>
                  <span style={{ fontSize: '0.78rem', color: '#666' }}>{profile.school}</span>
                  <span style={{ fontSize: '0.78rem', color: '#444' }}>·</span>
                  <span style={{ fontSize: '0.78rem', color: '#666' }}>Class of {profile.gradYear}</span>
                </div>
                {location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <MapPin size={12} color="#444" />
                    <span style={{ fontSize: '0.72rem', color: '#555' }}>{location}</span>
                  </div>
                )}
                {profile.bio && (
                  <p style={{ fontSize: '0.8rem', color: '#888', marginTop: 8, maxWidth: 420, lineHeight: 1.5 }}>{profile.bio}</p>
                )}
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '3.5rem', color: '#ff5a2d', lineHeight: 1, textShadow: '0 0 30px rgba(255,90,45,0.5)' }}>{score}</div>
                <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Score</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {!isOwnProfile && (
                <button onClick={() => navigate('/messages')} className="k-btn k-btn-primary"><MessageSquare size={14} /> Message</button>
              )}
              {effectiveCanEdit && (
                <button className="k-btn k-btn-primary" onClick={openEdit}><Edit3 size={14} /> Edit Profile</button>
              )}
              {isOwnProfile && !viewAsCoach && (
                <button className="k-btn k-btn-ghost" onClick={() => setViewAsCoach(true)}><Eye size={14} /> View As Coach</button>
              )}
              <div ref={shareRef} style={{ position: 'relative' }}>
                <button className="k-btn k-btn-ghost" onClick={() => setShareOpen(v => !v)}><Share2 size={14} /> Share</button>
                <AnimatePresence>
                  {shareOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50, background: '#161616', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px', minWidth: 230, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
                    >
                      <ShareItem icon={<Link2 size={15} color="#ff5a2d" />} label="Copy Link" onClick={() => { navigator.clipboard.writeText(profileUrl); showNotification('success', 'Link copied!', profileUrl); setShareOpen(false); }} />
                      <ShareItem icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="#ccc"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.857L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>} label="Share on X" onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my HERS365 profile')}&url=${encodeURIComponent(profileUrl)}`, '_blank', 'noopener,noreferrer'); setShareOpen(false); }} />
                      <ShareItem icon={<Instagram size={15} color="#e1306c" />} label="Share on Instagram" onClick={() => { showNotification('info', 'Instagram', 'Copy the link and paste it in your Instagram bio.'); setShareOpen(false); }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: '40YD', value: combineStats?.fortyDash ?? '--' },
            { label: 'GPA', value: profile.gpa ?? '--' },
            { label: 'HGT', value: fmtHeight(profile.heightIn) },
            { label: 'WGT', value: profile.weightLbs ? `${profile.weightLbs} lbs` : '--' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#ddd' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? '#ff5a2d' : 'transparent', border: '1px solid', borderColor: activeTab === tab ? '#ff5a2d' : 'rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 16px', color: activeTab === tab ? '#fff' : '#666', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{tab}</button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

        {/* OVERVIEW */}
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Season totals */}
            <div className="k-card" style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Season Totals</div>
              {statsLoading ? (
                <div style={{ color: '#444', fontSize: '0.82rem' }}>Loading...</div>
              ) : totals ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Pass Yards', value: totals.passingYards },
                    { label: 'Pass TDs', value: totals.passingTds },
                    { label: 'Rush Yards', value: totals.rushingYards },
                    { label: 'Rec Yards', value: totals.receivingYards },
                    { label: 'Flag Pulls', value: totals.flagPulls },
                    { label: 'INT', value: totals.interceptionsCaught },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>{label}</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#ddd' }}>{value ?? '--'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: '#555' }}>No game stats recorded yet.</p>
              )}
            </div>

            {/* Achievements */}
            <div className="k-card" style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Achievements</div>
              {achievementList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {achievementList.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5a2d', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: '#ccc' }}>{a}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: '#555' }}>No achievements listed yet.</p>
              )}
            </div>
          </div>
        )}

        {/* STATS */}
        {activeTab === 'Stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Combine */}
            <div className="k-card" style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Combine / Measurables</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
                {[
                  { label: '40 Yard', value: combineStats?.fortyDash ?? '--' },
                  { label: 'Shuttle', value: combineStats?.shuttle ?? '--' },
                  { label: 'Vertical', value: combineStats?.vertical ?? '--' },
                  { label: 'Broad Jump', value: combineStats?.broadJump ?? '--' },
                  { label: '3-Cone', value: combineStats?.threeCone ?? '--' },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '0 8px' }}>
                    <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#ddd' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game stats */}
            {statsLoading ? (
              <div className="k-card" style={{ padding: '32px', textAlign: 'center', color: '#555' }}>Loading stats...</div>
            ) : gameStats.length > 0 ? (
              <>
                {totals && (
                  <div className="k-card" style={{ padding: '18px 16px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Season Totals ({gameStats.length} games)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {[
                        { section: 'Passing', items: [
                          { label: 'Attempts', value: totals.passingAttempts },
                          { label: 'Completions', value: totals.passingCompletions },
                          { label: 'Yards', value: totals.passingYards },
                          { label: 'TDs', value: totals.passingTds },
                          { label: 'INTs', value: totals.interceptionsThrown },
                        ]},
                        { section: 'Rushing', items: [
                          { label: 'Attempts', value: totals.rushingAttempts },
                          { label: 'Yards', value: totals.rushingYards },
                          { label: 'TDs', value: totals.rushingTds },
                        ]},
                        { section: 'Receiving', items: [
                          { label: 'Receptions', value: totals.receptions },
                          { label: 'Yards', value: totals.receivingYards },
                          { label: 'TDs', value: totals.receivingTds },
                        ]},
                        { section: 'Defense', items: [
                          { label: 'Flag Pulls', value: totals.flagPulls },
                          { label: 'INTs', value: totals.interceptionsCaught },
                          { label: 'Pass BUs', value: totals.passBreakups },
                          { label: 'Def TDs', value: totals.defensiveTds },
                        ]},
                      ].map(({ section, items }) => (
                        <div key={section}>
                          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#ff5a2d', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{section}</div>
                          {items.map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span style={{ fontSize: '0.74rem', color: '#666' }}>{label}</span>
                              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: value ? '#ddd' : '#444' }}>{value ?? '--'}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-game log */}
                <div className="k-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Game Log</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr>
                          {['#', 'Pass YDS', 'Pass TD', 'Rush YDS', 'Rec YDS', 'Flag Pulls'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gameStats.map((g, i) => (
                          <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#555', fontWeight: 700 }}>G{i + 1}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ddd' }}>{g.passingYards ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ddd' }}>{g.passingTds ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ddd' }}>{g.rushingYards ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ddd' }}>{g.receivingYards ?? '--'}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ddd' }}>{g.flagPulls ?? '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="k-card" style={{ padding: '48px', textAlign: 'center' }}>
                <Zap size={32} color="#333" style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>No game stats yet</div>
                <div style={{ fontSize: '0.82rem', color: '#555' }}>Stats will appear here once games are logged.</div>
              </div>
            )}
          </div>
        )}

        {/* HIGHLIGHTS */}
        {activeTab === 'Highlights' && (
          <div>
            {effectiveCanEdit && (
              <div style={{ marginBottom: 16 }}>
                <input
                  type="file"
                  accept="video/*,image/*"
                  ref={highlightInputRef}
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleHighlightUpload(f); e.target.value = ''; }}
                />
                <button
                  className="k-btn k-btn-primary"
                  onClick={() => highlightInputRef.current?.click()}
                  disabled={uploadingHighlight}
                  style={{ opacity: uploadingHighlight ? 0.6 : 1 }}
                >
                  {uploadingHighlight ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</> : <><Upload size={14} /> Upload Highlight</>}
                </button>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {highlightsLoading ? (
              <div className="k-card" style={{ padding: '32px', textAlign: 'center', color: '#555' }}>Loading highlights...</div>
            ) : highlights.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {highlights.map(h => (
                  <div key={h.id} className="k-card" style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                    onClick={() => h.videoUrl && window.open(h.videoUrl, '_blank', 'noopener,noreferrer')}>
                    <div style={{ aspectRatio: '16/9', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {h.thumbnailUrl ? (
                        <img src={h.thumbnailUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} alt="Highlight" />
                      ) : null}
                      {h.videoUrl ? (
                        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={18} color="#fff" fill="#fff" />
                        </div>
                      ) : (
                        <Image size={24} color="#444" />
                      )}
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#666' }}>
                        {h.videoUrl ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Film size={11} /> Video</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Image size={11} /> Photo</span>}
                      </div>
                      {h.season && <div style={{ fontSize: '0.65rem', color: '#444', marginTop: 2 }}>{h.season}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="k-card" style={{ padding: '48px', textAlign: 'center' }}>
                <Film size={32} color="#333" style={{ marginBottom: 12 }} />
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', color: '#444', marginBottom: 6 }}>No highlights yet</div>
                {effectiveCanEdit ? (
                  <div style={{ fontSize: '0.82rem', color: '#555' }}>Upload a video or photo to get started.</div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#555' }}>This athlete hasn't uploaded highlights yet.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY */}
        {activeTab === 'Activity' && (
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>
              <Activity size={12} style={{ display: 'inline', marginRight: 6 }} />Recent Activity
            </div>
            {profile.nilPoints || profile.archetype ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profile.archetype && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,90,45,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trophy size={14} color="#ff5a2d" /></div>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: '#ccc', fontWeight: 600 }}>Archetype: {profile.archetype}</div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>Playing style identified</div>
                    </div>
                  </div>
                )}
                {(profile.nilPoints ?? 0) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={14} color="#4ade80" /></div>
                    <div>
                      <div style={{ fontSize: '0.82rem', color: '#ccc', fontWeight: 600 }}>{profile.nilPoints} NIL Points earned</div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>NIL activity</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.82rem', color: '#555' }}>No recent activity yet.</p>
            )}
          </div>
        )}
      </motion.div>

      {/* Edit modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }} transition={{ duration: 0.15 }}
              role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
                <h2 id="edit-profile-title" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', textTransform: 'uppercase', color: '#fff', margin: 0 }}>Edit Profile</h2>
                <button onClick={() => setEditOpen(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: 4, lineHeight: 1, fontSize: '1.2rem' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Name', key: 'name', placeholder: 'Full name' },
                  { label: 'Position', key: 'position', placeholder: 'e.g. QB, WR, CB' },
                  { label: 'School', key: 'school', placeholder: 'High school name' },
                  { label: 'Location (State)', key: 'location', placeholder: 'e.g. CA, TX' },
                  { label: 'Graduation Year', key: 'gradYear', placeholder: 'e.g. 2026', inputMode: 'numeric' as const },
                  { label: 'Height (inches)', key: 'heightIn', placeholder: 'e.g. 68 (for 5\'8")', inputMode: 'numeric' as const },
                  { label: 'Weight (lbs)', key: 'weightLbs', placeholder: 'e.g. 145', inputMode: 'numeric' as const },
                ].map(({ label, key, placeholder, inputMode }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>{label}</label>
                    <input
                      ref={key === 'name' ? nameInputRef : undefined}
                      value={editForm[key as keyof EditForm]}
                      onChange={e => { setEditForm(f => ({ ...f, [key]: e.target.value })); setEditError(null); }}
                      placeholder={placeholder}
                      inputMode={inputMode}
                      style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.5)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={e => { setEditForm(f => ({ ...f, bio: e.target.value })); setEditError(null); }}
                    placeholder="A short bio about yourself"
                    rows={3}
                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,90,45,0.5)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              </div>

              {editError && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,90,45,0.1)', border: '1px solid rgba(255,90,45,0.3)', borderRadius: 8, color: '#ff5a2d', fontSize: '0.82rem' }}>{editError}</div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditOpen(false)} className="k-btn k-btn-ghost" disabled={editSaving}>Cancel</button>
                <button onClick={saveEdit} className="k-btn k-btn-primary" disabled={editSaving} style={{ opacity: editSaving ? 0.6 : 1 }}>
                  {editSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function ShareItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', borderRadius: 7, padding: '9px 12px', color: '#ccc', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}{label}
    </button>
  );
}
