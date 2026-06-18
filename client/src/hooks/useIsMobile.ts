import { useEffect, useState } from 'react';

// Tracks whether the viewport is at or below a breakpoint (default 640px).
// Used to drive layout that lives in inline styles, where Tailwind's responsive
// classes cannot reach (e.g. CSS grid templates set via the style prop).
export function useIsMobile(maxWidth = 640): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
