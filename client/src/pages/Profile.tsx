import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Edit3, CheckCircle2, Share2, MessageSquare, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const profile = {
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
    { label: 'TDs',      value: '24' },
    { label: 'Comp %',   value: '68%' },
    { label: 'Yds',      value: '2,840' },
    { label: 'Rating',   value: '142.3' },
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

export const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>

      {/* Hero card */}
      <div className="k-card" style={{ padding: '28px 24px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        {/* Subtle coral glow top-right */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(255,90,45,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name)}`}
              alt={profile.name}
              style={{ width: 80, height: 80, borderRadius: '50%', background: '#1c1c1c', border: '2px solid rgba(255,90,45,0.3)' }}
            />
            {profile.verified && (
              <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                <CheckCircle2 size={18} color="#ff5a2d" fill="#ff5a2d" style={{ background: '#111', borderRadius: '50%' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', textTransform: 'uppercase', color: '#fff', lineHeight: 1, marginBottom: 4 }}>
                  {profile.name}
                </h1>
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

              {/* Score */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '3rem', color: '#ff5a2d', lineHeight: 1 }}>{profile.score}</div>
                <div style={{ fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Score</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 4 }}>
                  <TrendingUp size={12} color="#4ade80" />
                  <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>#1 Nationally</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <p style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.55, marginTop: 12, marginBottom: 16, maxWidth: 600 }}>{profile.bio}</p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/messages')} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#ff5a2d', border: 'none', borderRadius: 7,
                color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                padding: '9px 16px', cursor: 'pointer',
              }}>
                <MessageSquare size={14} /> Message
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7, color: '#ccc', fontSize: '0.78rem', fontWeight: 600,
                padding: '9px 16px', cursor: 'pointer',
              }}>
                <Edit3 size={14} /> Edit Profile
              </button>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 7, color: '#ccc', fontSize: '0.78rem', fontWeight: 600,
                padding: '9px 16px', cursor: 'pointer',
              }}>
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Measurables */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0, marginTop: 20, paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { label: '40YD', value: `${profile.fortyYard}s` },
            { label: 'GPA',  value: profile.gpa.toFixed(1) },
            { label: 'HGT',  value: profile.height },
            { label: 'WGT',  value: profile.weight },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{
              textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              padding: '0 8px',
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#ddd' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? '#ff5a2d' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === tab ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
            borderRadius: 7, padding: '7px 16px',
            color: activeTab === tab ? '#fff' : '#666',
            fontSize: '0.78rem', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{tab}</button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Season stats */}
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

            {/* Achievements */}
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
