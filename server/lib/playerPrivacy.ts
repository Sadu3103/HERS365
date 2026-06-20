// Centralized PII strippers for player rows. Both list/search and single-
// row reads route through these, so a new sensitive field on the players
// table only has to land in one allowlist instead of being repeated across
// every endpoint.
//
// Directive 1 (minor safety): never expose phone/email/dob/address/zip of
// a minor to anyone who isn't the owner. PR #190 added dob, phone, and
// pendingParentEmail to the schema but the old per-route strippers didn't
// know about them — this file is the fix.

const PII_FIELDS = [
  'email',
  'phone',
  'dob',
  'zipCode',
  'pendingParentEmail',
  // Hash always stays server-side.
  'passwordHash',
] as const;

// Public/cross-user view: strip everything in PII_FIELDS.
export function publicPlayerView<T extends Record<string, unknown>>(row: T | null | undefined): Partial<T> | T | null | undefined {
  if (!row) return row;
  const out: Record<string, unknown> = { ...row };
  for (const f of PII_FIELDS) delete out[f];
  return out as Partial<T>;
}

// Self/own-profile view: keep the contact fields the owner already has,
// just drop the password hash. Use this when the caller is the player.
export function selfPlayerView<T extends Record<string, unknown>>(row: T | null | undefined): Partial<T> | T | null | undefined {
  if (!row) return row;
  const out: Record<string, unknown> = { ...row };
  delete out.passwordHash;
  return out as Partial<T>;
}

// Strip the password hash from any user row before it ships. Use for admin
// dashboards / staff tools where the operator IS authorized to see PII (email,
// phone, dob) but the cryptographic secret must never leave the server.
export function withoutPasswordHash<T extends Record<string, unknown>>(row: T | null | undefined): Partial<T> | T | null | undefined {
  if (!row) return row;
  const out: Record<string, unknown> = { ...row };
  delete out.passwordHash;
  return out as Partial<T>;
}
