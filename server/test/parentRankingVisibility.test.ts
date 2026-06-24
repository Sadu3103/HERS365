import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import rankingRouter from '../rankingRoutes';
import { resetDb } from './helpers/db';
import { makeAthlete, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

// Parent-controlled ranking visibility (sister of #245 coachDiscoverable).
//
// Behavior:
//   • PUT /api/parent/settings { rankingVisibility: false } → for every
//     linked child, set players.preferences.rankingVisible = false (merged
//     into existing JSON; coachDiscoverable and other keys survive).
//   • GET /api/rankings → drops athletes whose preferences.rankingVisible
//     === false. Unset OR true stays in results.
//   • GET /rankings/players (server/rankingRoutes.ts, mounted ad-hoc on a
//     small test app since it isn't wired into createApp) → same filter.
//
// Default-preserving: an unset flag means visible, so existing athletes
// are unchanged.

const app = createApp();

// rankingRoutes isn't wired into createApp(); mount on a tiny test app the
// same way server/test/rankingRoutes.test.ts does it.
function buildRankingApp() {
  const a = express();
  a.use(express.json());
  a.use('/rankings', rankingRouter);
  return a;
}
const rankingApp = buildRankingApp();

beforeEach(resetDb);

const parentAuth = (p: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(p, 'parent')}` });

async function getChildPrefs(playerId: number): Promise<Record<string, unknown>> {
  const [row] = await db
    .select({ preferences: schema.players.preferences })
    .from(schema.players)
    .where(eq(schema.players.id, playerId));
  return (row?.preferences as Record<string, unknown> | null) ?? {};
}

async function seedAthleteRanking(playerId: number, overallScore: number) {
  await db.insert(schema.athleteRankings).values({
    playerId,
    overallScore,
    combineScore: overallScore,
    maxPrepsScore: overallScore,
    zybekScore: overallScore,
    usaTalentIdScore: overallScore,
    nationalRank: 1,
    stateRank: 1,
    positionRank: 1,
    movement: 'up',
    dataSources: ['combine'],
  });
}

describe('PUT /api/parent/settings propagates rankingVisibility to children', () => {
  it('writes preferences.rankingVisible=false on every linked child when false', async () => {
    const parent = await makeParent();
    const childA = await makeAthlete({ name: 'Ranked A' });
    const childB = await makeAthlete({ name: 'Ranked B' });
    const unrelated = await makeAthlete({ name: 'Unrelated' });
    await linkParentChild(parent.id, childA.id);
    await linkParentChild(parent.id, childB.id);

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });
    expect(res.status).toBe(200);

    expect(await getChildPrefs(childA.id)).toEqual({ rankingVisible: false });
    expect(await getChildPrefs(childB.id)).toEqual({ rankingVisible: false });
    expect(await getChildPrefs(unrelated.id)).toEqual({});
  });

  it('merges into existing child preferences (coachDiscoverable + other keys survive)', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);
    // Pretend #245's coachDiscoverable is already set, plus an unrelated key.
    await db
      .update(schema.players)
      .set({ preferences: { coachDiscoverable: false, theme: 'dark' } })
      .where(eq(schema.players.id, child.id));

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });
    expect(res.status).toBe(200);

    expect(await getChildPrefs(child.id)).toEqual({
      coachDiscoverable: false,
      theme: 'dark',
      rankingVisible: false,
    });
  });

  it('toggling back to true restores rankingVisible=true', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });
    expect((await getChildPrefs(child.id)).rankingVisible).toBe(false);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: true });
    expect((await getChildPrefs(child.id)).rankingVisible).toBe(true);
  });

  it('does NOT touch child preferences when the patch omits rankingVisibility', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);
    await db
      .update(schema.players)
      .set({ preferences: { theme: 'dark' } })
      .where(eq(schema.players.id, child.id));

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ smsAlerts: true });
    expect(res.status).toBe(200);

    expect(await getChildPrefs(child.id)).toEqual({ theme: 'dark' });
  });

  it('a single PUT carrying both profileVisibility and rankingVisibility writes both keys', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false, rankingVisibility: false });
    expect(res.status).toBe(200);

    expect(await getChildPrefs(child.id)).toEqual({
      coachDiscoverable: false,
      rankingVisible: false,
    });
  });
});

describe('GET /api/rankings honors rankingVisible', () => {
  it('excludes children whose parent flipped rankingVisibility=false', async () => {
    const parent = await makeParent();
    const hidden = await makeAthlete({ name: 'Hidden Hannah', position: 'QB', g5Rating: 5, privacySetting: 'public' });
    const visible = await makeAthlete({ name: 'Visible Vera', position: 'QB', g5Rating: 5, privacySetting: 'public' });
    const defaultUnset = await makeAthlete({ name: 'Default Dani', position: 'WR', g5Rating: 4, privacySetting: 'public' });
    await linkParentChild(parent.id, hidden.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });

    const res = await request(app).get('/api/rankings');
    expect(res.status).toBe(200);
    const names = res.body.data.map((p: { name: string }) => p.name);
    expect(names).not.toContain('Hidden Hannah');
    expect(names).toContain('Visible Vera');
    expect(names).toContain('Default Dani');
    expect(res.body.data.find((p: { id: number }) => p.id === visible.id)).toBeTruthy();
    expect(res.body.data.find((p: { id: number }) => p.id === defaultUnset.id)).toBeTruthy();
  });

  it('athletes with no flag stay listed (default-preserving)', async () => {
    await makeAthlete({ name: 'Default Donna', g5Rating: 5, privacySetting: 'public' });
    const res = await request(app).get('/api/rankings');
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { name: string }) => p.name)).toContain('Default Donna');
  });

  it('toggling rankingVisibility back to true restores the row in the public board', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Returning Rae', g5Rating: 5, privacySetting: 'public' });
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });
    const hiddenRes = await request(app).get('/api/rankings');
    expect(hiddenRes.body.data.map((p: { name: string }) => p.name)).not.toContain('Returning Rae');

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: true });
    const restoredRes = await request(app).get('/api/rankings');
    expect(restoredRes.body.data.map((p: { name: string }) => p.name)).toContain('Returning Rae');
  });

  it('does not weaken the existing privacySetting=public gate', async () => {
    // A private athlete with no parent prefs at all is still excluded by the
    // pre-existing privacySetting filter; this test pins that behavior so the
    // new filter is purely additive.
    await makeAthlete({ name: 'Private Patty', g5Rating: 5, privacySetting: 'private' });
    const res = await request(app).get('/api/rankings');
    expect(res.body.data.map((p: { name: string }) => p.name)).not.toContain('Private Patty');
  });
});

describe('GET /rankings/players (rankingRoutes.ts) honors rankingVisible', () => {
  it('excludes children whose parent flipped rankingVisibility=false', async () => {
    const parent = await makeParent();
    const hidden = await makeAthlete({ name: 'Hidden Holly', position: 'QB', state: 'GA' });
    const visible = await makeAthlete({ name: 'Visible Vera', position: 'QB', state: 'GA' });
    await seedAthleteRanking(hidden.id, 90);
    await seedAthleteRanking(visible.id, 85);
    await linkParentChild(parent.id, hidden.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });

    const res = await request(rankingApp).get('/rankings/players');
    expect(res.status).toBe(200);
    const names = res.body.map((p: { name: string }) => p.name);
    expect(names).not.toContain('Hidden Holly');
    expect(names).toContain('Visible Vera');
  });

  it('athletes with no flag stay listed (default-preserving)', async () => {
    const a = await makeAthlete({ name: 'Default Dorothy', position: 'WR' });
    await seedAthleteRanking(a.id, 80);
    const res = await request(rankingApp).get('/rankings/players');
    expect(res.status).toBe(200);
    expect(res.body.map((p: { name: string }) => p.name)).toContain('Default Dorothy');
  });

  it('toggling rankingVisibility back to true restores the row', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Returning Rita', position: 'DB' });
    await seedAthleteRanking(child.id, 88);
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: false });
    expect((await request(rankingApp).get('/rankings/players')).body.map((p: { name: string }) => p.name))
      .not.toContain('Returning Rita');

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ rankingVisibility: true });
    expect((await request(rankingApp).get('/rankings/players')).body.map((p: { name: string }) => p.name))
      .toContain('Returning Rita');
  });
});
