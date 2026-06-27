import React from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
}

// Dark, rounded shimmer block. Sheen + rest tones live in index.css under
// .hers-skel so a single keyframe rule drives every instance on the page,
// and prefers-reduced-motion silences the sheen cleanly.
export function Skeleton({
  width = '100%',
  height = 12,
  radius = 6,
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className="hers-skel"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

// Screen-reader-only span, paired with role="status" / aria-live regions so
// a loading state has a real announcement instead of a silent spinner.
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="hers-skel-sr">{children}</span>;
}
