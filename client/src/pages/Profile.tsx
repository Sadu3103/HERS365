import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Edit3, CheckCircle2, Share2, MessageSquare, Loader2, AlertTriangle, UserX, Link2, Instagram } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { apiFetch } from '../lib/api';

interface ApiProfile {
  id: number;
  name: string;
  position: string;
  state: string;
  city: string;
  school: string;
  gradYear: number;
  gpa: string | null;
  achievements: string;
  verificationStatus: string;
  g5Rating: number;
  archetype: string;
  nilPoints: number;
}

const tabs = ['Overview', 'Stats', 'Highlights', 'Activity'];

export const Profile = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('Overview');
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    if (shareOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareOpen]);

  const profileUrl = id
    ? `https://hers365.com/profile/${id}`
    : `https://hers365.com/profile`;

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setIsError(false);
      setIsEmpty(false);
      try {
        const data = await apiFetch<ApiProfile | null>('/api/profile');
        if (!data || !data.name) {
          setIsEmpty(true);
        } else {
          setProfile(data);
        }
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

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
          <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: 16 }}>Unable to load your profile. Please try again.</p>
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

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
      <div className="k-card" style={{ padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(255,90,45,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', borderRadius: 12 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt={profile.name} style={{ width: 80, height: 80, borderRadius: '50%', background: '#1c1c1c', border: '2px solid rgba(255,90,45,0.3)', objectFit: 'cover' }} />
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
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '3.5rem', color: '#ff5a2d', lineHeight: 1, textShadow: '0 0 30px rgba(255,90,45,0.5)' }}>{score}</div>
                <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Score</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => navigate('/messages')} className="k-btn k-btn-primary"><MessageSquare size={14} /> Message</button>
              <button className="k-btn k-btn-ghost"><Edit3 size={14} /> Edit Profile</button>
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
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(profileUrl);
                          showNotification('success', 'Link copied!', profileUrl);
                          setShareOpen(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', borderRadius: 7, padding: '9px 12px', color: '#ccc', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Link2 size={15} color="#ff5a2d" />
                        Copy Link
                      </button>
                      <button
                        onClick={() => {
                          const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my HERS365 profile')}&url=${encodeURIComponent(profileUrl)}`;
                          window.open(tweetUrl, '_blank', 'noopener,noreferrer');
                          setShareOpen(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', borderRadius: 7, padding: '9px 12px', color: '#ccc', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#ccc"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.857L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Share on X
                      </button>
                      <button
                        onClick={() => {
                          showNotification('info', 'Instagram', 'Copy the link and paste it in your Instagram bio.');
                          setShareOpen(false);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', borderRadius: 7, padding: '9px 12px', color: '#ccc', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Instagram size={15} color="#e1306c" />
                        Share on Instagram
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: '40YD', value: '--' },
            { label: 'GPA',  value: profile.gpa ?? '--' },
            { label: 'HGT',  value: '--' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '0 8px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#ddd' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? '#ff5a2d' : 'transparent', border: '1px solid', borderColor: activeTab === tab ? '#ff5a2d' : 'rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 16px', color: activeTab === tab ? '#fff' : '#666', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{tab}</button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="k-card" style={{ padding: '48px', textAlign: 'center', color: '#444' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Stats Coming Soon</div>
              <div style={{ fontSize: '0.82rem' }}>Season stats will appear here once available.</div>
            </div>

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

        {activeTab === 'Activity' && (
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Recent Activity</div>
            <p style={{ fontSize: '0.82rem', color: '#555' }}>No recent activity yet.</p>
          </div>
        )}

        {(activeTab === 'Stats' || activeTab === 'Highlights') && (
          <div className="k-card" style={{ padding: '48px', textAlign: 'center', color: '#444' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.3rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{activeTab} Coming Soon</div>
            <div style={{ fontSize: '0.82rem' }}>This section is being built out. Check back soon.</div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
