import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MapPin, Trophy, ChevronRight, Plus, CheckCircle2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const teams = [
  {
    id: 1,
    name: 'Westlake Wolfpack',
    school: 'Westlake HS',
    location: 'Austin, TX',
    record: '14-2',
    ranking: 1,
    players: 18,
    division: 'Varsity',
    conference: 'Texas 5A',
    coachName: 'Coach Martinez',
    wins: 14,
    losses: 2,
    pointsFor: 412,
    pointsAgainst: 198,
    roster: [
      { name: 'Sarah Watkins', pos: 'QB', score: 95, verified: true },
      { name: 'Maya Johnson',  pos: 'WR', score: 92, verified: true },
      { name: 'Chloe Zhang',   pos: 'RB', score: 90, verified: true },
      { name: 'Ava Mitchell',  pos: 'LB', score: 89, verified: true },
    ],
  },
  {
    id: 2,
    name: 'Summit Storm',
    school: 'Summit Prep',
    location: 'Denver, CO',
    record: '12-4',
    ranking: 4,
    players: 16,
    division: 'Varsity',
    conference: 'Colorado 4A',
    coachName: 'Coach Davis',
    wins: 12,
    losses: 4,
    pointsFor: 348,
    pointsAgainst: 241,
    roster: [
      { name: "Emma O'Connor",  pos: 'QB', score: 89, verified: false },
      { name: 'Jordan Lee',     pos: 'WR', score: 88, verified: true },
      { name: 'Priya Patel',    pos: 'DB', score: 87, verified: false },
      { name: 'Taylor Brooks',  pos: 'RB', score: 86, verified: true },
    ],
  },
  {
    id: 3,
    name: 'Centennial Blaze',
    school: 'Centennial HS',
    location: 'Los Angeles, CA',
    record: '11-5',
    ranking: 7,
    players: 20,
    division: 'Varsity',
    conference: 'California 6A',
    coachName: 'Coach Thompson',
    wins: 11,
    losses: 5,
    pointsFor: 301,
    pointsAgainst: 278,
    roster: [
      { name: 'Isabella Reyes', pos: 'DB', score: 91, verified: true },
      { name: 'Zoe Williams',   pos: 'QB', score: 85, verified: true },
    ],
  },
];

const divisions = ['All', 'Varsity', 'JV', 'Youth'];

function nameToIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return (h % 90) + 1;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <img
      src={`https://randomuser.me/api/portraits/women/${nameToIdx(name)}.jpg`}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', background: '#1c1c1c', flexShrink: 0, objectFit: 'cover' }}
    />
  );
}

export const Teams = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(1);
  const [division, setDivision] = useState('All');

  const filtered = teams.filter(t => division === 'All' || t.division === division);
  const activeTeam = teams.find(t => t.id === selected) ?? teams[0];

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
            Teams
          </h1>
          <p style={{ color: '#555', fontSize: '0.85rem' }}>Top-ranked girls flag football programs</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#ff5a2d', border: 'none', borderRadius: 8,
          color: '#fff', fontSize: '0.78rem', fontWeight: 700,
          padding: '10px 16px', cursor: 'pointer', letterSpacing: '0.04em',
        }}>
          <Plus size={14} /> CREATE TEAM
        </button>
      </div>

      {/* Division filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {divisions.map(d => (
          <button key={d} onClick={() => setDivision(d)} style={{
            background: division === d ? '#ff5a2d' : 'transparent',
            border: '1px solid',
            borderColor: division === d ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
            borderRadius: 7, padding: '7px 16px',
            color: division === d ? '#fff' : '#666',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
          }}>{d}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>

        {/* Team list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(t.id)}
              style={{
                padding: '16px',
                background: selected === t.id ? 'rgba(255,90,45,0.08)' : '#111',
                border: `1px solid ${selected === t.id ? 'rgba(255,90,45,0.35)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#fff' }}>{t.name}</span>
                    {t.ranking <= 3 && <Shield size={12} color="#ff5a2d" fill="rgba(255,90,45,0.2)" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={10} color="#444" />
                    <span style={{ fontSize: '0.72rem', color: '#555' }}>{t.location}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#ff5a2d', lineHeight: 1 }}>#{t.ranking}</div>
                  <div style={{ fontSize: '0.62rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rank</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '2px 8px', fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>{t.record}</span>
                <span style={{ fontSize: '0.7rem', color: '#555' }}>{t.players} players</span>
                <span style={{ fontSize: '0.7rem', color: '#555' }}>{t.conference}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Team detail */}
        <motion.div key={activeTeam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>

          {/* Header card */}
          <div className="k-card" style={{ padding: '22px 20px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: 'radial-gradient(circle, rgba(255,90,45,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', textTransform: 'uppercase', color: '#fff', lineHeight: 1 }}>{activeTeam.name}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: '#777' }}>{activeTeam.school}</span>
                  <span style={{ color: '#333' }}>·</span>
                  <span style={{ fontSize: '0.78rem', color: '#555' }}>{activeTeam.conference}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} color="#444" />
                  <span style={{ fontSize: '0.72rem', color: '#444' }}>{activeTeam.location}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '3.5rem', color: '#ff5a2d', lineHeight: 1 }}>#{activeTeam.ranking}</div>
                <div style={{ fontSize: '0.62rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>National</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, gap: 0 }}>
              {[
                { label: 'Record',  value: activeTeam.record },
                { label: 'Players', value: activeTeam.players },
                { label: 'Pts For', value: activeTeam.pointsFor },
                { label: 'Pts Agn', value: activeTeam.pointsAgainst },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '0 8px' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#ddd' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Roster */}
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Key Players</span>
              <button style={{ background: 'none', border: 'none', color: '#ff5a2d', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                Full Roster <ChevronRight size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activeTeam.roster.map((player, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <Avatar name={player.name} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ddd' }}>{player.name}</span>
                      {player.verified && <CheckCircle2 size={11} color="#ff5a2d" fill="#ff5a2d" />}
                    </div>
                    <span style={{ background: 'rgba(255,90,45,0.1)', color: '#ff5a2d', fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>{player.pos}</span>
                  </div>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#ff5a2d' }}>{player.score}</span>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
};
