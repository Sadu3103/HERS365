import { describe, it, expect } from 'vitest';
import { toShareCard, type ShareCardSource } from '../shareCard';

// ─── PII safety contract ─────────────────────────────────────────────────────
// The platform is for minors. The card type is the structural boundary —
// these tests assert the mapper never widens it, never lets a last name
// through, and never fabricates rank/delta when the data isn't there.
//
// Every assertion here is a guarantee a future change to the type would have
// to actively break. CI failing here means a reviewer needs eyes on whatever
// changed shareCard.ts — not "just update the snapshot."
const ALLOWED_KEYS = [
  'firstName',
  'position',
  'school',
  'rating',
  'rank',
  'rankDelta',
  'verified',
] as const;

const baseSource: ShareCardSource = {
  name: 'Sarah Watkins',
  position: 'QB',
  school: 'TX Tech',
  g5Rating: 4.75,
  verificationStatus: 'verified',
};

describe('toShareCard — PII safety boundary', () => {
  it('(a) strips the last name from a full name', () => {
    const result = toShareCard(baseSource);
    expect(result).not.toBeNull();
    expect(result!.firstName).toBe('Sarah');
    expect(result!.firstName).not.toBe('Sarah Watkins');
    expect(result!.firstName).not.toBe('Watkins');
  });

  it('(b) converts g5Rating 4.75 to an integer rating of 95', () => {
    const result = toShareCard(baseSource);
    expect(result!.rating).toBe(95);
    expect(Number.isInteger(result!.rating)).toBe(true);
  });

  it('(c) returns null when g5Rating is null (fail-closed: no card without a rating)', () => {
    const result = toShareCard({ ...baseSource, g5Rating: null });
    expect(result).toBeNull();
  });

  it('(d) falls back to "Athlete" for an empty name, never an empty string', () => {
    const result = toShareCard({ ...baseSource, name: '' });
    expect(result!.firstName).toBe('Athlete');
    expect(result!.firstName).not.toBe('');
  });

  describe('(e) verified flag derives from verificationStatus', () => {
    it('"verified" → true', () => {
      const result = toShareCard({ ...baseSource, verificationStatus: 'verified' });
      expect(result!.verified).toBe(true);
    });
    it.each(['pending', 'unverified', 'rejected', '', 'VERIFIED'])(
      '%s → false (only the literal "verified" passes)',
      (status) => {
        const result = toShareCard({ ...baseSource, verificationStatus: status });
        expect(result!.verified).toBe(false);
      },
    );
  });

  it('(f) passes rank and rankDelta through when provided', () => {
    const result = toShareCard({ ...baseSource, rank: 12, rankDelta: 3 });
    expect(result!.rank).toBe(12);
    expect(result!.rankDelta).toBe(3);
  });

  it('(g) rank/rankDelta absent → undefined (never null, never fabricated)', () => {
    const result = toShareCard(baseSource);
    expect(result!.rank).toBeUndefined();
    expect(result!.rankDelta).toBeUndefined();
    expect(result!.rank).not.toBeNull();
    expect(result!.rankDelta).not.toBeNull();
  });

  it('(g.2) rank/rankDelta passed as null in source → still undefined out', () => {
    const result = toShareCard({ ...baseSource, rank: null, rankDelta: null });
    expect(result!.rank).toBeUndefined();
    expect(result!.rankDelta).toBeUndefined();
  });

  it('(h) output contains only allowed keys — no PII can leak via a new field', () => {
    const result = toShareCard({ ...baseSource, rank: 12, rankDelta: 3 });
    const keys = Object.keys(result!);
    expect(
      keys.every((k) => (ALLOWED_KEYS as readonly string[]).includes(k)),
    ).toBe(true);
  });

  it('(i) output never contains a lastName key', () => {
    const result = toShareCard(baseSource);
    expect(result).not.toHaveProperty('lastName');
  });

  it('(i.2) output never contains email, phone, dob, address, or parent fields', () => {
    const result = toShareCard(baseSource);
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('dob');
    expect(result).not.toHaveProperty('age');
    expect(result).not.toHaveProperty('address');
    expect(result).not.toHaveProperty('city');
    expect(result).not.toHaveProperty('state');
    expect(result).not.toHaveProperty('zipCode');
    expect(result).not.toHaveProperty('parentEmail');
    expect(result).not.toHaveProperty('pendingParentEmail');
  });

  it('(j) name with multiple spaces normalizes to the first non-empty token', () => {
    const result = toShareCard({ ...baseSource, name: '  Maria   Elena   Torres  ' });
    expect(result!.firstName).toBe('Maria');
  });
});
