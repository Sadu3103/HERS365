import { useEffect, useRef, useState } from 'react';

// Once per session for the same value. Re-runs when the value actually
// changes (e.g., a re-rated athlete) so the moment matters. Storage failure
// in private modes is silent — we just render the static number.
const KEY = 'hers_rating_reveal_v1';

function shouldReveal(rating: number): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return true;
    return Number(raw) !== rating;
  } catch {
    return false;
  }
}

function markRevealed(rating: number): void {
  try {
    sessionStorage.setItem(KEY, String(rating));
  } catch {
    // private mode / quota exceeded — nothing to do.
  }
}

// Decelerate hard and settle. Apple-feel: fast in, slow at the line.
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hapticOnLand(reduced: boolean): void {
  if (reduced) return;
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate([18, 40, 24]);
  } catch {
    // older Safari throws if the page is not user-activated; not our problem.
  }
}

export interface RatingRevealState {
  /** The number to render right now. Counts up during the reveal, sits on target after. */
  value: number;
  /** True from the moment the count-up starts until ~1.1s after it lands. Drives the glow/badge classes. */
  revealing: boolean;
}

interface UseRatingRevealOptions {
  /** Disable the reveal (e.g., not the athlete's own profile). Forces value === target instantly. */
  enabled: boolean;
}

/**
 * The signature moment: count-up the athlete's own HERS Rating, fire a single
 * orange bloom, stamp the verified badge, then go quiet. Once per session per
 * value. Reduced-motion → instant final value, no haptic. Never lies — if the
 * target is null we just sit at 0 and the caller can choose to not render.
 */
export function useRatingReveal(
  target: number | null,
  { enabled }: UseRatingRevealOptions,
): RatingRevealState {
  // animValue == null means "no animation in flight — just show the target".
  // Only the animation path ever calls setAnimValue, so unused render paths
  // never trigger a re-render from inside the effect.
  const [animValue, setAnimValue] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const rafId = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Bail-outs that don't animate: never touch animValue, so no re-render.
    if (target == null) return;
    if (!enabled) return;
    if (!shouldReveal(target)) return;

    const reduced = prefersReducedMotion();
    if (reduced) {
      markRevealed(target);
      return;
    }

    // ~60% of the target rounded — close enough to feel earned, far enough to
    // feel the climb. 0 → target is too vacant for ratings in the 80–100 band.
    const start = Math.round(target * 0.6);
    const begin = performance.now() + 120; // t=120ms after mount
    const duration = 900;
    let kicked = false;
    let landed = false;

    const tick = (now: number) => {
      // Defer the initial setState into the RAF callback so the effect body
      // itself is setState-free — the react-compiler "cascading renders" rule
      // does not allow synchronous setState inside useEffect.
      if (!kicked) {
        kicked = true;
        setRevealing(true);
        setAnimValue(start);
      }
      const elapsed = now - begin;
      if (elapsed < 0) {
        rafId.current = requestAnimationFrame(tick);
        return;
      }
      const tNorm = Math.min(1, elapsed / duration);
      const eased = easeOutExpo(tNorm);
      setAnimValue(Math.round(start + (target - start) * eased));
      if (tNorm < 1) {
        rafId.current = requestAnimationFrame(tick);
        return;
      }
      // Snap to the integer target so we never settle one off.
      setAnimValue(target);
      if (!landed) {
        landed = true;
        hapticOnLand(reduced);
        markRevealed(target);
        // Linger long enough for the CSS badge stamp (t=1180) + rank delta
        // (t=1280) to play to completion, then release the classes.
        settleTimer.current = setTimeout(() => setRevealing(false), 1100);
      }
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
      if (settleTimer.current != null) clearTimeout(settleTimer.current);
    };
  }, [target, enabled]);

  const value = animValue ?? (target ?? 0);
  return { value, revealing };
}
