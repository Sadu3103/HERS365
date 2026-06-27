// ─── PII safety boundary ─────────────────────────────────────────────────────
// The platform is for minors. A shareable image is the single highest-risk
// surface we have, so the *only* way data can reach the card component is
// through this allow-list type. Any other field on the profile (last name,
// dob, email, phone, address, parent info, message history) is structurally
// excluded — TypeScript will refuse to render it, and the mapper below never
// reads it. If a field is uncertain, omit it (fail closed).
export interface ShareCardData {
  firstName: string;
  position: string;
  school: string;
  /** 0–100 integer. */
  rating: number;
  /** National rank if known. Optional — omitted from the card if absent. */
  rank?: number;
  /** Weekly rank delta. Positive = climbed, negative = dropped. Optional. */
  rankDelta?: number;
  verified: boolean;
}

// The full Profile object is intentionally *not* in the input type. The
// caller hands us a tiny, deliberately-narrow shape and the mapper rebuilds
// a clean ShareCardData. Adding a new field requires touching this mapper +
// the type above, which forces a review.
export interface ShareCardSource {
  /** Full display name. We slice the first token only — never the last name. */
  name: string;
  position: string;
  school: string;
  /** g5Rating (0–5). We multiply by 20 inside the mapper. */
  g5Rating: number | null;
  verificationStatus: string;
  rank?: number | null;
  rankDelta?: number | null;
}

/** Build a ShareCardData from a raw profile. Fail-closed on missing fields. */
export function toShareCard(p: ShareCardSource): ShareCardData | null {
  if (p.g5Rating == null) return null;
  const firstName = (p.name || '').trim().split(/\s+/)[0] || 'Athlete';
  return {
    firstName,
    position: p.position || '',
    school: p.school || '',
    rating: Math.round(p.g5Rating * 20),
    rank: typeof p.rank === 'number' ? p.rank : undefined,
    rankDelta: typeof p.rankDelta === 'number' ? p.rankDelta : undefined,
    verified: p.verificationStatus === 'verified',
  };
}
