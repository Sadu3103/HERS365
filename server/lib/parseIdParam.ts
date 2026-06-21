export function parseIdParam(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return value;
  }
  if (typeof value !== 'string' || value.length === 0) return null;
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}
