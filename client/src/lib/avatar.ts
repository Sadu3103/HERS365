const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ['#ff5a2d', '#ff8a5a'],
  ['#ff7a3d', '#c0431c'],
  ['#33373f', '#15171b'],
  ['#3b2a22', '#1a120d'],
  ['#2b3038', '#141619'],
  ['#43311f', '#1c130b'],
];

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic, on-brand monogram avatar as an inline SVG data URI.
// No network call, no stock faces — required on a platform for minors.
export function athleteAvatar(name: string): string {
  const h = hashName(name || '');
  const [a, b] = PALETTE[h % PALETTE.length];
  const text = initials(name);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
    `<rect width='128' height='128' rx='64' fill='url(#g)'/>` +
    `<text x='64' y='83' font-family='Inter,system-ui,sans-serif' font-size='52' font-weight='700' fill='#f4f4f2' text-anchor='middle'>${text}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
