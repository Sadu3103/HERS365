import React from 'react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)',
  backgroundSize: '400% 100%',
  animation: 'skeletonShimmer 1.4s ease infinite',
  borderRadius: 6,
};

const keyframes = `
@keyframes skeletonShimmer {
  0%   { background-position: 100% 50%; }
  100% { background-position: 0%   50%; }
}
`;

function InjectKeyframes() {
  return <style>{keyframes}</style>;
}

export function SkeletonCard() {
  return (
    <>
      <InjectKeyframes />
      <div style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...shimmerStyle, width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...shimmerStyle, height: 14, width: '60%' }} />
            <div style={{ ...shimmerStyle, height: 11, width: '40%' }} />
          </div>
        </div>
        <div style={{ ...shimmerStyle, height: 11, width: '100%' }} />
        <div style={{ ...shimmerStyle, height: 11, width: '80%' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ ...shimmerStyle, height: 32, flex: 1, borderRadius: 8 }} />
          <div style={{ ...shimmerStyle, height: 32, flex: 1, borderRadius: 8 }} />
          <div style={{ ...shimmerStyle, height: 32, flex: 1, borderRadius: 8 }} />
        </div>
      </div>
    </>
  );
}

export function SkeletonProfile() {
  return (
    <>
      <InjectKeyframes />
      <div style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ ...shimmerStyle, width: 80, height: 80, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...shimmerStyle, height: 22, width: '50%' }} />
            <div style={{ ...shimmerStyle, height: 14, width: '35%' }} />
            <div style={{ ...shimmerStyle, height: 12, width: '25%' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <div style={{ ...shimmerStyle, height: 34, width: 100, borderRadius: 8 }} />
              <div style={{ ...shimmerStyle, height: 34, width: 100, borderRadius: 8 }} />
            </div>
          </div>
          <div style={{ ...shimmerStyle, width: 60, height: 60, borderRadius: 8, flexShrink: 0 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '0 8px' }}>
              <div style={{ ...shimmerStyle, height: 10, width: '60%', margin: '0 auto 8px' }} />
              <div style={{ ...shimmerStyle, height: 22, width: '50%', margin: '0 auto' }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['100%', '90%', '75%', '85%', '60%'];
  return (
    <>
      <InjectKeyframes />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...Array(lines)].map((_, i) => (
          <div key={i} style={{ ...shimmerStyle, height: 13, width: widths[i % widths.length] }} />
        ))}
      </div>
    </>
  );
}
