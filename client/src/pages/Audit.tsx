import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertCircle, Clock, TrendingUp, FileText, DollarSign, Eye } from 'lucide-react';

const nilDeals = [
  { id: 1, brand: 'Under Armour',   type: 'Apparel',     value: '$2,400/yr',  status: 'approved', date: '2025-03-15', disclosure: true  },
  { id: 2, brand: 'Gatorade',       type: 'Endorsement', value: '$800/yr',    status: 'approved', date: '2025-04-02', disclosure: true  },
  { id: 3, brand: 'QB Elite Camp',  type: 'Appearance',  value: '$300 flat',  status: 'pending',  date: '2025-05-20', disclosure: false },
  { id: 4, brand: 'GameTime App',   type: 'Social Media', value: '$150/post', status: 'review',   date: '2025-05-25', disclosure: true  },
];

const requirements = [
  { label: 'School notification filed',       done: true  },
  { label: 'State association disclosure',    done: true  },
  { label: 'GPA eligibility maintained (3.9)', done: true  },
  { label: 'Academic certification current',  done: true  },
  { label: 'QB Elite Camp contract reviewed', done: false },
  { label: 'GameTime App FTC disclosure tag', done: false },
];

const statusColor: Record<string, { bg: string; text: string; label: string }> = {
  approved: { bg: 'rgba(74,222,128,0.1)',   text: '#4ade80', label: 'Approved'  },
  pending:  { bg: 'rgba(251,191,36,0.1)',   text: '#fbbf24', label: 'Pending'   },
  review:   { bg: 'rgba(255,90,45,0.1)',    text: '#ff5a2d', label: 'Review'    },
  rejected: { bg: 'rgba(248,113,113,0.1)',  text: '#f87171', label: 'Rejected'  },
};

export const Audit = () => {
  const [activeTab, setActiveTab] = useState<'nil' | 'checklist'>('nil');

  const approvedCount  = nilDeals.filter(d => d.status === 'approved').length;
  const pendingCount   = nilDeals.filter(d => d.status === 'pending').length;
  const reviewCount    = nilDeals.filter(d => d.status === 'review').length;
  const doneCount      = requirements.filter(r => r.done).length;
  const compliancePct  = Math.round((doneCount / requirements.length) * 100);

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '2rem', textTransform: 'uppercase', color: '#fff', marginBottom: 4 }}>
          NIL Compliance
        </h1>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Track your Name, Image & Likeness deals and eligibility status</p>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'COMPLIANCE',  value: `${compliancePct}%`,   sub: `${doneCount}/${requirements.length} items`, icon: Shield,     accent: compliancePct === 100 ? '#4ade80' : '#ff5a2d' },
          { label: 'ACTIVE DEALS', value: approvedCount,         sub: 'Approved',                                 icon: CheckCircle2, accent: '#4ade80' },
          { label: 'PENDING',     value: pendingCount,           sub: 'Needs action',                             icon: Clock,      accent: '#fbbf24' },
          { label: 'UNDER REVIEW', value: reviewCount,           sub: 'In progress',                              icon: Eye,        accent: '#ff5a2d' },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="k-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>{label}</span>
              <Icon size={14} color={accent} />
            </div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: accent, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: '#444' }}>{sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Compliance bar */}
      <div className="k-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ccc' }}>Overall Compliance Score</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: '1rem', color: compliancePct >= 80 ? '#4ade80' : '#ff5a2d' }}>{compliancePct}%</span>
        </div>
        <div className="k-progress-track" style={{ height: 8 }}>
          <div className="k-progress-fill" style={{ width: `${compliancePct}%`, background: compliancePct >= 80 ? '#4ade80' : '#ff5a2d' }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['nil', 'checklist'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: activeTab === tab ? '#ff5a2d' : 'transparent',
            border: '1px solid',
            borderColor: activeTab === tab ? '#ff5a2d' : 'rgba(255,255,255,0.08)',
            borderRadius: 7, padding: '7px 16px',
            color: activeTab === tab ? '#fff' : '#666',
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {tab === 'nil' ? 'NIL Deals' : 'Checklist'}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

        {activeTab === 'nil' && (
          <div className="k-card" style={{ overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 90px',
              padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {['BRAND / TYPE', 'VALUE', 'STATUS', 'DATE', 'DISCLOSE'].map(h => (
                <div key={h} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444' }}>{h}</div>
              ))}
            </div>
            {nilDeals.map((deal, i) => {
              const s = statusColor[deal.status];
              return (
                <motion.div key={deal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 100px 90px 90px',
                    padding: '13px 16px', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1c1c1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={14} color="#ff5a2d" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ddd' }}>{deal.brand}</div>
                        <div style={{ fontSize: '0.68rem', color: '#555' }}>{deal.type}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ccc' }}>{deal.value}</div>
                  <div>
                    <span style={{ background: s.bg, color: s.text, fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 5 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#555' }}>{deal.date}</div>
                  <div>
                    {deal.disclosure
                      ? <CheckCircle2 size={15} color="#4ade80" fill="#4ade80" />
                      : <AlertCircle size={15} color="#fbbf24" />
                    }
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="k-card" style={{ padding: '18px 16px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 16 }}>Compliance Checklist</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {requirements.map((req, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {req.done
                    ? <CheckCircle2 size={16} color="#4ade80" fill="#4ade80" style={{ flexShrink: 0 }} />
                    : <AlertCircle  size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '0.85rem', color: req.done ? '#666' : '#ccc', fontWeight: 500, textDecoration: req.done ? 'line-through' : 'none' }}>{req.label}</span>
                  {!req.done && (
                    <span style={{ marginLeft: 'auto', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: '0.63rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>ACTION NEEDED</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};
