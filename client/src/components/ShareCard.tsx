import { forwardRef } from 'react';
import type { ShareCardData } from '../lib/shareCard';

// ─── Card visual — 9:16 (540 × 960), exported at pixelRatio 2 → 1080 × 1920 ─

const BG = '#0E0E11';
const ACCENT = '#FF5A2D';
const ACCENT_TEXT = '#FF7A52';
const TEXT_PRIMARY = '#F5F5F7';
const TEXT_SECONDARY = '#B0B0B8';
const DIVIDER = 'rgba(255,255,255,0.08)';
const DISP = "'Barlow Condensed', sans-serif";
const BODY = "'DM Sans', sans-serif";

interface ShareCardProps {
  data: ShareCardData;
}

/**
 * Offscreen export target. Mount via portal/conditional render off-screen
 * (left: -9999px) with aria-hidden, snapshot with html-to-image, unmount.
 * Never rendered in the actual user-visible UI.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(function ShareCard(
  { data },
  ref,
) {
  const { firstName, position, school, rating, rank, rankDelta, verified } = data;

  const deltaLine = (() => {
    if (typeof rankDelta !== 'number' || rankDelta === 0) return null;
    if (rankDelta > 0) return { symbol: '▲', n: rankDelta, color: ACCENT_TEXT };
    return { symbol: '▼', n: Math.abs(rankDelta), color: '#8A8A92' };
  })();

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        width: 540,
        height: 960,
        background: BG,
        color: TEXT_PRIMARY,
        fontFamily: BODY,
        position: 'relative',
        overflow: 'hidden',
        padding: '60px 56px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Frozen radial bloom behind the number — same DNA as the live reveal. */}
      <div
        style={{
          position: 'absolute',
          top: 220,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 720,
          height: 720,
          borderRadius: '50%',
          background: `radial-gradient(circle at center, rgba(255,90,45,.42) 0%, rgba(255,90,45,.12) 42%, transparent 70%)`,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top label */}
      <div
        style={{
          fontFamily: DISP,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.24em',
          color: ACCENT_TEXT,
          textTransform: 'uppercase',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        HERS Rating
      </div>

      {/* The number */}
      <div
        style={{
          fontFamily: DISP,
          fontWeight: 800,
          fontSize: 320,
          lineHeight: 1,
          color: ACCENT,
          textAlign: 'center',
          marginTop: 30,
          marginBottom: 18,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 60px rgba(255,90,45,0.4)',
          position: 'relative',
        }}
      >
        {rating}
      </div>

      {/* Verified row */}
      {verified && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
            marginBottom: 26,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: ACCENT,
              color: '#0A0A0C',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            ✓
          </span>
          <span
            style={{
              fontFamily: DISP,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: TEXT_PRIMARY,
            }}
          >
            Verified Athlete
          </span>
        </div>
      )}

      {/* First name */}
      <div
        style={{
          fontFamily: DISP,
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.05,
          color: TEXT_PRIMARY,
          textAlign: 'center',
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          position: 'relative',
        }}
      >
        {firstName}
      </div>

      {/* Position · School */}
      <div
        style={{
          fontFamily: BODY,
          fontSize: 18,
          color: TEXT_SECONDARY,
          textAlign: 'center',
          marginTop: 12,
          position: 'relative',
        }}
      >
        {[position, school].filter(Boolean).join(' · ')}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Rank + delta */}
      {(typeof rank === 'number' || deltaLine) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: 12,
            position: 'relative',
            marginBottom: 24,
          }}
        >
          {typeof rank === 'number' && (
            <span
              style={{
                fontFamily: DISP,
                fontWeight: 800,
                fontSize: 28,
                color: TEXT_PRIMARY,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.01em',
              }}
            >
              Rank #{rank} nationally
            </span>
          )}
          {deltaLine && (
            <span
              style={{
                fontFamily: BODY,
                fontSize: 18,
                fontWeight: 600,
                color: deltaLine.color,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {deltaLine.symbol}{deltaLine.n} this week
            </span>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: DIVIDER, marginBottom: 24, position: 'relative' }} />

      {/* Tagline + wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontFamily: DISP,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '0.04em',
            color: TEXT_SECONDARY,
            textTransform: 'uppercase',
          }}
        >
          Get Seen. Get Ranked. Get Recruited.
        </div>
        <div
          style={{
            fontFamily: DISP,
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: '0.04em',
            color: TEXT_PRIMARY,
            textTransform: 'uppercase',
          }}
        >
          HERS<span style={{ color: ACCENT }}>365</span>
        </div>
      </div>
    </div>
  );
});
