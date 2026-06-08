import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Edit3, CheckCircle2, Share2, MessageSquare, TrendingUp, Loader2, AlertTriangle, UserX, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HARDCODED_PROFILE = {
  name: 'Sarah Watkins',
  position: 'QB',
  school: 'Westlake HS',
  location: 'Austin, TX',
  graduationYear: 2026,
  height: "5'9\"",
  weight: '145 lbs',
  fortyYard: 4.72,
  gpa: 3.9,
  score: 95,
  rank: 1,
  verified: true,
  bio: 'Dual-threat quarterback with elite arm strength and mobility. Committed to elevating my game every day. Focused on earning a D1 scholarship through hard work and consistency.',
  stats: [
    { label: 'TDs',     value: '24' },
    { label: 'Comp %',  value: '68%' },
    { label: 'Yds',     value: '2,840' },
    { label: 'Rating',  value: '142.3' },
  ],
  achievements: [
    'Elite 11 Finalist 2025',
    'State Champion 7v7',
    'All-State QB — 2024',
    'USA Football Top 50',
  ],
  recentActivity: [
    { text: 'Clocked 4.72 at the Dallas Combine', time: '2h ago' },
    { text: 'Completed Elite QB Development — Session 18', time: '1d ago' },
    { text: 'Moved up to #1 in national rankings', time: '3d ago' },
    { text: 'Posted new highlight reel', time: '5d ago' },
  ],
};

const tabs = ['Overview', 'Stats', 'Highlights', 'Activity'];

type ProfileData = typeof HARDCODED_PROFILE;

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const url = window.location.href;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=Check%20out%20this%20athlete%20on%20HERS365&url=${encodeURIComponent(url)}`;

  return (
    <div style={{ position: 'relative' }}>
      <button className="k-btn k-btn-ghost" onClick={() => setOpen(o => !o)}>
        <Share2 size={14} /> Share
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 50,
          background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: 8, minWidth: 180,
          display: 'flex', flexDirection: 'column', gap: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', color: copied ? '#ff5a2d' : '#ccc', cursor: 'pointer', borderRadius: 7, fontSize: '0.82rem', width: '100%', textAlign: 'left' }}>
            <LinkIcon size={13} /> {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', color: '#ccc', textDecoration: 'none', borderRadius: 7, fontSize: '0.82rem' }}
            onClick={() => setOpen(false)}>
            <Share2 size={13} /> Share on X
          </a>
        </div>
      )}
    </div>
  );
}

export const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [profile, setProfile] = useState<ProfileData>(HARDCODED_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setIsError(false);
      setIsEmpty(false);
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const data: ProfileData | null = await res.json();
        if (!data || !data.name) {
          setIsEmpty(true);
        } else {
          setProfile(data);
        }
      } catch {
        // API unavailable — fall through to hardcoded demo data silently
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

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
      {isError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,90,45,0.08)', border: '1px solid rgba(255,90,45,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#ff5a2d', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} />
          <span style={{ fontWeight: 600 }}>Something went wrong. Try again.</span>
          <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', background: 'rgba(255,90,45,0.15)', border: '1px solid rgba(255,90,45,0.3)', color: '#ff5a2d', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      <div className="k-card" style={{ padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(255,90,45,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', borderRadius: 12 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt={profile.name} style={{ width: 80, height: 80, borderRadius: '50%', background: '#1c1c1c', border: '2px solid rgba(255,90,45,0.3)', objectFit: 'cover' }} />
            {profile.verified && (
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
                  <span style={{ fontSize: '0.78rem', color: '#666' }}>Class of {profile.graduationYear}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <MapPin size={12} color="#444" />
                  <span style={{ fontSize: '0.72rem', color: '#555' }}>{profile.location}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '3.5rem', color: '#ff5a2d', lineHeight: 1, textShadow: '0 0 30px rgba(255,90,45,0.5)' }}>{profile.score}</div>
                <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 6, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 6, padding: '3px 7px' }}>
                  <TrendingUp size={11} color="#4ade80" />
                  <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 700 }}>#{profile.rank} Nationally</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.55, marginTop: 12, marginBottom: 16, maxWidth: 600 }}>{profile.bio}</p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/messages')} className="k-btn k-btn-primary"><MessageSquare size={14} /> Message</button>
              <button className="k-btn k-btn-ghost"><Edit3 size={14} /> Edit Profile</button>
              <ShareButton />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: '40YD', value: `${profile.fortyYard}s` },
            { label: 'GPA',  value: profile.gpa.toFixed(1) },
            { label: 'HGT',  value: profile.height },
            { label: 'WGT',  value: profile.weight },
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
            <div className="k-card" style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 16 }}>Season Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {profile.stats.map(({ label, value }) => (
                  <div key={label} style={{ background: '#0d0d0d', borderRadius: 8, padding: '14px 12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#ff5a2d', lineHeight: 1, marginBottom: 4 }}>{value}</div>
                    <div style={{ fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="k-card" style={{ padding: '18px 16px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Achievements</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.achievements.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5a2d', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#ccc' }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Activity' && (
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>Recent Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {profile.recentActivity.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5a2d', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.83rem', color: '#ccc' }}>{item.text}</div>
                    <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 3 }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
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
