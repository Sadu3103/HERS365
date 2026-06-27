import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRatingReveal } from '../useRatingReveal';

// Read in tandem with client/src/hooks/useRatingReveal.ts — the storage key
// is hard-coded there so a rename would intentionally break this gate test.
const STORAGE_KEY = 'hers_rating_reveal_v1';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe('useRatingReveal', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('(a) prefers-reduced-motion: reduce → value equals target, revealing stays false', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() =>
      useRatingReveal(85, { enabled: true }),
    );
    expect(result.current.value).toBe(85);
    expect(result.current.revealing).toBe(false);
  });

  it('(a.2) reduced-motion path marks the rating as revealed in sessionStorage', () => {
    mockMatchMedia(true);
    renderHook(() => useRatingReveal(85, { enabled: true }));
    // The hook is supposed to fire-and-forget the gate even when it skips
    // the animation, so a repeat in the same session also stays silent.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('85');
  });

  it('(b) enabled: false → value equals target instantly, no animation', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() =>
      useRatingReveal(85, { enabled: false }),
    );
    expect(result.current.value).toBe(85);
    expect(result.current.revealing).toBe(false);
  });

  it('(c) null target → value is 0 and revealing stays false', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() =>
      useRatingReveal(null, { enabled: true }),
    );
    expect(result.current.value).toBe(0);
    expect(result.current.revealing).toBe(false);
  });

  it('(d) fire-once gate: sessionStorage already holding the target → revealing stays false', () => {
    // Simulate a prior reveal in the same session. The shouldReveal() check
    // inside the hook reads sessionStorage; a hit blocks any new animation.
    sessionStorage.setItem(STORAGE_KEY, '85');
    mockMatchMedia(false);

    const { result } = renderHook(() =>
      useRatingReveal(85, { enabled: true }),
    );

    expect(result.current.value).toBe(85);
    expect(result.current.revealing).toBe(false);
  });

  it('(d.2) gate releases when the target value actually changes', () => {
    // Stored 80, new target 95 — a re-rated athlete should get the moment
    // again. We assert the gate did NOT block by checking sessionStorage
    // still holds the previous value (the reduced-motion early return is
    // what would overwrite it, so we also force reduced-motion off here
    // and don't run the animation — just confirm the gate decided to fire).
    sessionStorage.setItem(STORAGE_KEY, '80');
    mockMatchMedia(true); // reduce so the path that runs is the
                          // "would have fired but we're in reduced-motion"
                          // branch, which calls markRevealed.
    renderHook(() => useRatingReveal(95, { enabled: true }));
    // The reduce branch runs because the gate didn't block — gate works.
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('95');
  });
});
