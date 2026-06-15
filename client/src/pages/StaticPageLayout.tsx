import React from 'react';

const LINE = 'rgba(255,255,255,0.07)';
const MUTED = '#8a8a86';
const DISP = "'Barlow Condensed', sans-serif";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
};

export const StaticPageLayout = ({ title, subtitle, badge, children }: Props) => (
  <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 120px' }}>
    <div style={{ marginBottom: 32 }}>
      {badge && (
        <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ff5a2d', marginBottom: 6 }}>{badge}</div>
      )}
      <h1 style={{ fontFamily: DISP, fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1 }}>{title}</h1>
      {subtitle && <p style={{ color: MUTED, fontSize: '0.82rem', margin: 0 }}>{subtitle}</p>}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {children}
    </div>
  </div>
);

export const StaticSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${LINE}`, borderRadius: 12, padding: '18px 22px' }}>
    <h3 style={{ fontFamily: DISP, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', margin: '0 0 8px', color: '#f4f4f2' }}>{title}</h3>
    <div style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.65 }}>{children}</div>
  </div>
);
