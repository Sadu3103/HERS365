// Public-endpoint analogue of #250 (coach player-detail discoverability).
//
// GET /api/rankings filters out players with preferences.rankingVisible=false.
// GET /api/rankings/:id used to ignore that flag, so an unauthenticated
// scraper could enumerate ids and dox minors who had opted out of the public
// board. The fix gates the detail endpoint on the same pref and returns 404
// (not 403) so hidden players are indistinguishable from nonexistent ids.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';
import { __test__ as rankingsTest } from '../api/rankings';

const app = createApp();
beforeEach(resetDb);

async function setPrefs(id: number, preferences: Record<string, unknown>) {
  await db.update(schema.players).set({ preferences }).where(eq(schema.players.id, id));
}

describe('GET /api/rankings/:id honors preferences.rankingVisible', () => {
  it('200 when preferences is empty {}', async () => {
    const p = await makeAthlete({ g5Rating: 5, privacySetting: 'public' });
    await setPrefs(p.id, {});
    const res = await request(app).get(`/api/rankings/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(p.id);
  });

  it('200 when rankingVisible is explicitly true', async () => {
    const p = await makeAthlete({ g5Rating: 5, privacySetting: 'public' });
    await setPrefs(p.id, { rankingVisible: true });
    const res = await request(app).get(`/api/rankings/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(p.id);
  });

  it('404 when rankingVisible is false (hidden minors are indistinguishable from nonexistent ids)', async () => {
    const p = await makeAthlete({ g5Rating: 5, privacySetting: 'public' });
    await setPrefs(p.id, { rankingVisible: false });
    const res = await request(app).get(`/api/rankings/${p.id}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Player not found' });
  });

  it('200 when preferences is null (unset → visible, codebase convention)', async () => {
    const p = await makeAthlete({ g5Rating: 5, privacySetting: 'public' });
    await db.update(schema.players).set({ preferences: null }).where(eq(schema.players.id, p.id));
    const res = await request(app).get(`/api/rankings/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(p.id);
  });

  it('404 for a nonexistent id', async () => {
    const res = await request(app).get('/api/rankings/999999');
    expect(res.status).toBe(404);
  });

  it('400 for a non-numeric id param', async () => {
    const res = await request(app).get('/api/rankings/abc');
    expect(res.status).toBe(400);
  });

  // The malformed-prefs case can't be reproduced via HTTP because postgres
  // jsonb rejects invalid JSON at write time. The fail-closed branch exists
  // as defense-in-depth for any code path that hands preferences in as a
  // raw string, so exercise it directly.
  it('isRankingVisible returns false for malformed JSON string (fail closed)', () => {
    expect(rankingsTest.isRankingVisible('{bad')).toBe(false);
  });
});

describe('rankings list and detail agree on visibility', () => {
  it('a player with rankingVisible=false is BOTH absent from the list AND returns 404 on :id', async () => {
    const hidden = await makeAthlete({ name: 'Hidden Hank', g5Rating: 5, privacySetting: 'public' });
    const visible = await makeAthlete({ name: 'Visible Val', g5Rating: 5, privacySetting: 'public' });
    await setPrefs(hidden.id, { rankingVisible: false });
    await setPrefs(visible.id, {});

    const listRes = await request(app).get('/api/rankings');
    expect(listRes.status).toBe(200);
    const listIds = listRes.body.data.map((p: { id: number }) => p.id);
    expect(listIds).not.toContain(hidden.id);
    expect(listIds).toContain(visible.id);

    const hiddenDetail = await request(app).get(`/api/rankings/${hidden.id}`);
    expect(hiddenDetail.status).toBe(404);

    const visibleDetail = await request(app).get(`/api/rankings/${visible.id}`);
    expect(visibleDetail.status).toBe(200);
  });
});
