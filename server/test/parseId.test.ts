import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';
import { parseIdParam } from '../lib/parseId';

const app = createApp();
beforeEach(resetDb);

// ── Unit checks on the helper itself ──────────────────────────────────────
describe('parseIdParam', () => {
  it('accepts plain positive decimal strings up to int4 max', () => {
    expect(parseIdParam('1')).toBe(1);
    expect(parseIdParam('42')).toBe(42);
    expect(parseIdParam('2147483647')).toBe(2_147_483_647);
  });

  it('also accepts pre-coerced numbers (Zod z.coerce.number() ran first)', () => {
    expect(parseIdParam(7)).toBe(7);
  });

  it('rejects non-numeric, decimals, scientific notation, signed', () => {
    expect(parseIdParam('abc')).toBeNull();
    expect(parseIdParam('12abc')).toBeNull();
    expect(parseIdParam('12.7')).toBeNull();
    expect(parseIdParam('1e3')).toBeNull();
    expect(parseIdParam('-5')).toBeNull();
    expect(parseIdParam('+5')).toBeNull();
    expect(parseIdParam(' 7 ')).toBeNull();
  });

  it('rejects zero, negatives, and >int4 overflow', () => {
    expect(parseIdParam('0')).toBeNull();
    expect(parseIdParam(0)).toBeNull();
    expect(parseIdParam(-1)).toBeNull();
    expect(parseIdParam('2147483648')).toBeNull(); // int4 max + 1
    expect(parseIdParam('99999999999999')).toBeNull();
    expect(parseIdParam(Number.MAX_SAFE_INTEGER)).toBeNull();
    expect(parseIdParam(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseIdParam(Number.NaN)).toBeNull();
  });

  it('rejects empty / wrong-type inputs', () => {
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam(null)).toBeNull();
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam({})).toBeNull();
    expect(parseIdParam([])).toBeNull();
  });
});

// ── End-to-end: representative id-taking routes return 400, not 500 ───────
//
// Three routes covering both code paths the helper runs through:
//   - DELETE /api/messages/:id     — direct parseIdParam (no Zod ahead)
//   - GET    /api/messages/conversations/:partnerId/messages
//                                  — direct parseIdParam (no Zod ahead)
//   - POST   /api/coach/message/:playerId
//                                  — Zod z.coerce.number() runs first; the
//                                    helper is the second line of defense
//
// For each: non-numeric, negative, and overflow ids must surface as 400 —
// never reach drizzle and never crash with a 500.

const BAD_IDS = [
  ['non-numeric', 'abc'],
  ['negative', '-1'],
  ['int4 overflow', '99999999999999'],
  ['decimal', '12.7'],
  ['embedded junk', '12abc'],
] as const;

describe('id-param validation returns 400 (not 500) on bad ids', () => {
  describe('DELETE /api/messages/:id', () => {
    for (const [label, badId] of BAD_IDS) {
      it(`${label}: ${badId} → 400`, async () => {
        const athlete = await makeAthlete();
        const res = await request(app)
          .delete(`/api/messages/${encodeURIComponent(badId)}`)
          .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
        expect(res.status).toBe(400);
      });
    }
  });

  describe('GET /api/messages/conversations/:partnerId/messages', () => {
    for (const [label, badId] of BAD_IDS) {
      it(`${label}: ${badId} → 400`, async () => {
        const athlete = await makeAthlete();
        const res = await request(app)
          .get(`/api/messages/conversations/${encodeURIComponent(badId)}/messages`)
          .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
        expect(res.status).toBe(400);
      });
    }
  });

  describe('POST /api/coach/message/:playerId', () => {
    for (const [label, badId] of BAD_IDS) {
      it(`${label}: ${badId} → 400`, async () => {
        const coach = await makeCoach();
        const res = await request(app)
          .post(`/api/coach/message/${encodeURIComponent(badId)}`)
          .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
          .send({ message: 'irrelevant' });
        expect(res.status).toBe(400);
      });
    }
  });
});
