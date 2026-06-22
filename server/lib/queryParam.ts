// Safe query-param parsers. Reject non numeric input rather than producing NaN
// and passing it into eq()/where()/limit(), which Postgres rejects with
// "invalid input syntax for type integer".

function firstString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) value = value[0];
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s.length === 0 ? null : s;
}

// Parses a query value as an integer. Returns null when missing or malformed —
// callers should either 400 on null or skip the filter.
export function parseIntQuery(value: unknown): number | null {
  const s = firstString(value);
  if (s === null) return null;
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

// Same shape for floats — used by GPA-style filters.
export function parseFloatQuery(value: unknown): number | null {
  const s = firstString(value);
  if (s === null) return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

// Pagination-friendly: returns a clamped int, falling back to default on missing
// or malformed input. Use for limit/offset/page where the API contract is to
// silently degrade rather than 400.
export function clampIntQuery(
  value: unknown,
  opts: { default: number; min: number; max: number },
): number {
  const parsed = parseIntQuery(value);
  if (parsed === null) return opts.default;
  return Math.max(opts.min, Math.min(opts.max, parsed));
}
