import { forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ─────────────────────────────────────────────────────────────────
// Mirrors the server's GET /api/rankings/me response. Three shapes only —
// anything else is treated as "render nothing" by the parent.
export type RankMeRanked = {
  ranked: true;
  rank: number;
  total: number;
  rating: number;
  position: string;
};
export type RankMeUnratedOrHidden = {
  ranked: false;
  reason: 'unrated' | 'hidden';
};

interface CommonProps {
  /** True once the show-class has been added (drives the slide-in). */
  inView: boolean;
  /** True when the athlete's real row is on screen — tuck out, don't fully retreat. */
  tucked: boolean;
}

interface RankedProps extends CommonProps {
  data: RankMeRanked;
  athleteId: number;
  athleteName: string;
  athleteSchool: string;
}

// ─── The ranked variant — the centerpiece ──────────────────────────────────
// Whole strip is one button → her profile. One scalpel of orange (the rating
// number); everything else holds composition. No animations beyond the
// slide-in handled by parent class flip.
export const YourRankDock = forwardRef<HTMLButtonElement, RankedProps>(function YourRankDock(
  { data, athleteId, athleteName, athleteSchool, inView, tucked },
  ref,
) {
  const navigate = useNavigate();
  const { rank, rating, position } = data;

  return (
    <div
      className={`rk-dock${inView ? ' rk-dock--in' : ''}${tucked ? ' rk-dock--tucked' : ''}`}
      aria-hidden={!inView}
    >
      <button
        ref={ref}
        type="button"
        onClick={() => navigate(`/profile/${athleteId}`)}
        aria-label={`Your ranking: number ${rank}, rating ${rating}. View your profile.`}
        className="rk-dock-surface"
        style={{
          width: '100%',
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 20px',
          background: 'rgba(18,18,22,0.92)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderTop: '2px solid #FF5A2D',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          boxShadow: '0 -1px 0 rgba(255,90,45,0.40), 0 -16px 40px -12px rgba(255,90,45,0.22)',
          color: '#F4F4F5',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          transition: 'transform 100ms ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.995)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = '')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
      >
        {/* YOU pill */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FF5A2D',
            color: '#0A0A0C',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '4px 9px',
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          You
        </span>

        {/* Rank */}
        <span
          className="tnum"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(28px, 5.5vw, 34px)',
            lineHeight: 1,
            color: '#FF7A52',
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <span style={{ fontSize: '0.6em', color: 'rgba(255,122,82,0.55)', marginRight: 1 }}>#</span>
          {rank}
        </span>

        {/* Name + school */}
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 16,
              color: '#F4F4F5',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {athleteName}
          </span>
          {athleteSchool && (
            <span
              className="rk-dock-school"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                color: '#8A8A94',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: 2,
              }}
            >
              {athleteSchool}
            </span>
          )}
        </span>

        {/* Position chip — hidden on very narrow screens via wrapper class.
            420px breakpoint is handled inline. */}
        {position && position !== '–' && (
          <span
            className="rk-dock-pos"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.04em',
              color: '#C8C8D0',
              background: '#1A1A20',
              padding: '5px 10px',
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            {position}
          </span>
        )}

        {/* Rating — loudest number */}
        <span
          className="tnum"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(32px, 6vw, 38px)',
            lineHeight: 1,
            color: '#FF5A2D',
            letterSpacing: '-0.01em',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {rating}
        </span>

        {/* Chevron */}
        <ChevronRight size={20} color="rgba(244,244,245,0.45)" style={{ flexShrink: 0 }} />
      </button>
    </div>
  );
});

// ─── The unrated / hidden variant ─────────────────────────────────────────
// Same dock slot, muted border + softer shadow. Copy is taken from the spec
// verbatim. CTA targets are real existing routes — /profile for unrated
// (see what to improve), /settings for hidden (manage visibility).
interface UnratedOrHiddenProps extends CommonProps {
  data: RankMeUnratedOrHidden;
}

export function YourRankDockEmpty({ data, inView, tucked }: UnratedOrHiddenProps) {
  const navigate = useNavigate();
  const onCta = () => {
    if (data.reason === 'unrated') navigate('/profile');
    else navigate('/settings');
  };
  const ctaLabel = data.reason === 'unrated' ? 'See what counts ›' : 'Manage visibility ›';
  const message =
    data.reason === 'unrated'
      ? "You're on the board soon — keep your profile sharp."
      : 'Your ranking is private — only you can see this.';
  const subline =
    data.reason === 'hidden' ? 'A parent or guardian set your board to hidden.' : null;

  return (
    <div
      className={`rk-dock${inView ? ' rk-dock--in' : ''}${tucked ? ' rk-dock--tucked' : ''}`}
      aria-hidden={!inView}
    >
      <div
        className="rk-dock-surface"
        style={{
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 20px',
          background: 'rgba(18,18,22,0.92)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderTop: '2px solid rgba(255,90,45,0.35)',
          boxShadow: '0 -1px 0 rgba(255,90,45,0.18), 0 -10px 28px -10px rgba(255,90,45,0.12)',
          color: '#F4F4F5',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FF5A2D',
            color: '#0A0A0C',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '4px 9px',
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          You
        </span>

        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              color: '#C8C8D0',
            }}
          >
            {message}
          </span>
          {subline && (
            <span
              className="rk-dock-subline"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                color: '#8A8A94',
                marginTop: 2,
              }}
            >
              {subline}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onCta}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FF7A52',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            padding: '8px 4px',
            flexShrink: 0,
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
