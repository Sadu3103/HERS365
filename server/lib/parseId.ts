// Strict parser for route-param ids that hit the DB.
//
// Reject everything that would either fail in Postgres (NaN, Infinity, non-
// integers, values outside int4) or that's clearly invalid for a DB id
// (negative, zero). Catches a few classes of bug in one place:
//   - parseInt('abc')              → NaN  → drizzle .where(eq(id, NaN)) crashes
//   - parseInt('123abc')           → 123  (silently truncates — user typo masked)
//   - parseInt('0')                → 0    (no row has id 0; cheaper to 400)
//   - parseInt('-5')               → -5   (DB error or silent wrong-row hit)
//   - parseInt('99999999999999')   → 99999999999999 (overflows pg int4)
//
// Returns the validated number, or null on any rejection. Callers do:
//
//   const id = parseIdParam(req.params.id);
//   if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });
//
// Keep this dependency-free so middleware / route handlers / lib code can
// all share it.

// Postgres int4 max — every id column in schema.ts uses serial / integer,
// which is int4. Anything larger would 22003 (numeric_value_out_of_range)
// at the driver, surfacing as a 500.
const MAX_INT4 = 2_147_483_647;

export function parseIdParam(value: unknown): number | null {
  // Accept the two shapes route handlers see in practice:
  //   - string (raw from req.params before any validation middleware)
  //   - number (after a Zod `z.coerce.number()` param schema has already
  //     coerced it; runtime value is a number even though the type says
  //     string)
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null;
    if (value < 1 || value > MAX_INT4) return null;
    return value;
  }
  if (typeof value !== 'string' || value.length === 0) return null;
  // No leading +/-, no whitespace, no scientific notation, no decimals —
  // a route id is a plain decimal integer. parseInt would happily accept
  // '12.7' or '12abc' here, so we reject those before parsing.
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > MAX_INT4) return null;
  return n;
}
