// GET /api/rankings/me — self-scoped "your rank" endpoint.
// Hard rules (asserted below):
//   1. requires auth (no token → 401)
//   2. non-athlete role → ranked:false reason:not_athlete (never 4xx for a
//      valid token; the client treats this as "render nothing")
//   3. unrated athlete → reason:unrated
//   4. parent-hidden athlete (rankingVisible:false) → reason:hidden
//   5. non-public privacy → reason:hidden
//   6. rated, visible, public → ranked:true with correct rank/total/rating
//   7. rating + ordering are IDENTICAL to GET /api/rankings (no drift)
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/rankings/me', () => {
  it('returns 401 with no auth header', async () => {
    const res = await request(app).get('/api/rankings/me');
    expect(res.status).toBe(401);
  });

  it('returns ranked:false reason:not_athlete for a coach token', async () => {
    const coach = await makeCoach({ name: 'Coach Test' });
    const token = tokenFor(coach, 'coach');
    const res = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, ranked: false, reason: 'not_athlete' });
  });

  it('returns ranked:false reason:unrated for an athlete with null g5Rating', async () => {
    const me = await makeAthlete({ name: 'Unrated Me', g5Rating: null, privacySetting: 'public' });
    const res = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, ranked: false, reason: 'unrated' });
  });

  it('returns ranked:false reason:hidden when privacySetting !== "public"', async () => {
    const me = await makeAthlete({ name: 'Private Me', g5Rating: 5, privacySetting: 'private' });
    const res = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, ranked: false, reason: 'hidden' });
  });

  it('returns ranked:false reason:hidden when preferences.rankingVisible === false', async () => {
    const me = await makeAthlete({
      name: 'Hidden Me',
      g5Rating: 5,
      privacySetting: 'public',
      preferences: { rankingVisible: false },
    });
    const res = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, ranked: false, reason: 'hidden' });
  });

  it('returns ranked:true with correct rank/total/rating/position for a rated visible athlete', async () => {
    // Build a 3-person board. The caller (Mid) lands at rank 2.
    await makeAthlete({ name: 'Top',  position: 'WR', g5Rating: 5, xpPoints: 1200, privacySetting: 'public' });
    const me = await makeAthlete({ name: 'Mid', position: 'QB', g5Rating: 5, xpPoints: 700, privacySetting: 'public' });
    await makeAthlete({ name: 'Low',  position: 'DB', g5Rating: 4, xpPoints: 100, privacySetting: 'public' });

    const res = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ranked).toBe(true);
    expect(res.body.rank).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.position).toBe('QB');
    // rating formula: min(99, g5*18 + round(xp/100)) = min(99, 90 + 7) = 97
    expect(res.body.rating).toBe(97);
  });

  it('rating + ordering on /me match GET /api/rankings exactly', async () => {
    // Three athletes; pull the public board and pull /me for the middle one;
    // assert /me.rank lines up with her index in the board and /me.rating
    // matches the rating on her board row.
    await makeAthlete({ name: 'A', g5Rating: 5, xpPoints: 900, privacySetting: 'public' });
    const me = await makeAthlete({ name: 'B', g5Rating: 5, xpPoints: 500, privacySetting: 'public' });
    await makeAthlete({ name: 'C', g5Rating: 4, xpPoints: 100, privacySetting: 'public' });

    const board = await request(app).get('/api/rankings').then((r) => r.body.data);
    const onBoard = board.find((p: { id: number }) => p.id === me.id);
    expect(onBoard).toBeTruthy();

    const meRes = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`)
      .then((r) => r.body);

    expect(meRes.rank).toBe(onBoard.rank);
    expect(meRes.rating).toBe(onBoard.rating);
    expect(meRes.position).toBe(onBoard.position);
  });

  it('does not leak any other athlete in the response shape', async () => {
    await makeAthlete({ name: 'Other A', g5Rating: 5, privacySetting: 'public' });
    const me = await makeAthlete({ name: 'Me', g5Rating: 5, privacySetting: 'public' });
    await makeAthlete({ name: 'Other B', g5Rating: 5, privacySetting: 'public' });

    const res = await request(app)
      .get('/api/rankings/me')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);

    const json = JSON.stringify(res.body);
    expect(json).not.toContain('Other A');
    expect(json).not.toContain('Other B');
    // Only six top-level keys allowed: success, ranked, rank, total, rating, position.
    const allowed = new Set(['success', 'ranked', 'rank', 'total', 'rating', 'position', 'reason']);
    for (const k of Object.keys(res.body)) {
      expect(allowed.has(k)).toBe(true);
    }
  });
});
