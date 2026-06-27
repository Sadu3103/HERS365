import type { CSSProperties } from 'react';

export const FLAME = '#ff5a2d';
export const FLAME_SOFT = '#ff8a6a';
export const INK = '#161616';
export const INK_2 = '#111111';
export const INK_3 = '#0d0d0d';
export const LINE = 'rgba(255,255,255,0.08)';
export const LINE_2 = 'rgba(255,255,255,0.05)';
export const MUTED = '#666666';
export const MUTED_2 = '#444444';
export const DISP = "'DM Sans', system-ui, sans-serif";
export const BODY = "'DM Sans', system-ui, sans-serif";

export const disp: CSSProperties = { fontFamily: DISP };

export const kicker: CSSProperties = {
  fontFamily: DISP,
  fontSize: '0.6rem',
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: MUTED,
};

export function glowBlob({
  size = 200,
  top = 0,
  right = 0,
  opacity = 0.4,
  strength = 0.5,
}: {
  size?: number;
  top?: number;
  right?: number;
  opacity?: number;
  strength?: number;
}): CSSProperties {
  return {
    position: 'absolute',
    width: size,
    height: size,
    top,
    right,
    borderRadius: '50%',
    background: `radial-gradient(circle, rgba(255,90,45,${opacity * strength}) 0%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  };
}

// data-reveal makes the CSS resilience rule (html:not(.js-ready) [data-reveal])
// hold this element at the visible state until JS confirms it can run the
// framer-motion enter. See LandingPage.tsx useEffect for the .js-ready signal.
export const reveal = {
  'data-reveal': true,
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};
