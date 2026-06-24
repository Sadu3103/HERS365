import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import rankingRouter from '../rankingRoutes';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

// rankingRoutes is not currently wired into createApp(); it lives next to
// server/api/rankings.ts which is the route that ships. We still want to
// guard the router against regressions, so mount it on a small test app
// (same pattern as eventRoutes.test.ts / exportRoutes.test.ts).
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/rankings', rankingRouter);
  return app;
}

const app = buildApp();
beforeEach(resetDb);

async function seedRanking(playerId: number, overrides: Partial<typeof schema.athleteRankings.$inferInsert> = {}) {
  const [row] = await db.insert(schema.athleteRankings).values({
    playerId,
    overallScore: 80,
    combineScore: 80,
    maxPrepsScore: 80,
    zybekScore: 80,
    usaTalentIdScore: 80,
    nationalRank: 1,
    stateRank: 1,
    positionRank: 1,
    movement: 'up',
    dataSources: ['combine', 'max_preps'],
    ...overrides,
  }).returning();
  return row;
}

describe('GET /rankings/players', () => {
  it('returns an empty list when there are no athletes', async () => {
    const res = await request(app).get('/rankings/players');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('enriches each row with tier + tierColor derived from overallScore', async () => {
    const a = await makeAthlete({ name: 'Top Pick', position: 'QB', state: 'GA' });
    await seedRanking(a.id, { overallScore: 95 });

    const res = await request(app).get('/rankings/players');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Top Pick');
    expect(res.body[0].overallScore).toBe(95);
    expect(res.body[0]).toHaveProperty('tier');
    expect(res.body[0]).toHaveProperty('tierColor');
  });

  it('honors position + state filters and ignores state when level is national', async () => {
    const qbGa = await makeAthlete({ name: 'QB Georgia', position: 'QB', state: 'GA' });
    const wrGa = await makeAthlete({ name: 'WR Georgia', position: 'WR', state: 'GA' });
    const qbTx = await makeAthlete({ name: 'QB Texas', position: 'QB', state: 'TX' });
    await seedRanking(qbGa.id);
    await seedRanking(wrGa.id);
    await seedRanking(qbTx.id);

    const byPos = await request(app).get('/rankings/players').query({ position: 'QB' });
    expect(byPos.status).toBe(200);
    expect(byPos.body.map((p: { name: string }) => p.name).sort()).toEqual(['QB Georgia', 'QB Texas']);

    // level=national should *ignore* state per the route (state filter only
    // applies when level !== 'national').
    const national = await request(app).get('/rankings/players').query({ state: 'GA' });
    expect(national.status).toBe(200);
    expect(national.body).toHaveLength(3);

    const stateFiltered = await request(app)
      .get('/rankings/players')
      .query({ level: 'state', state: 'GA' });
    expect(stateFiltered.status).toBe(200);
    expect(stateFiltered.body.map((p: { name: string }) => p.name).sort()).toEqual(['QB Georgia', 'WR Georgia']);
  });

  it('returns 400 (not 500) for a non-integer graduationYear', async () => {
    const res = await request(app).get('/rankings/players').query({ graduationYear: 'not-a-year' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/integer/i);
  });

  it('clamps limit and offset to safe ranges', async () => {
    const a = await makeAthlete();
    await seedRanking(a.id);
    // limit=0 should clamp up to min, limit=10000 clamps down to max — either
    // way the request must succeed, not 500.
    const lo = await request(app).get('/rankings/players').query({ limit: '0' });
    expect(lo.status).toBe(200);
    const hi = await request(app).get('/rankings/players').query({ limit: '10000' });
    expect(hi.status).toBe(200);
  });
});

describe('GET /rankings/players/:id', () => {
  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/rankings/players/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 400 for a negative id', async () => {
    const res = await request(app).get('/rankings/players/-5');
    expect(res.status).toBe(400);
  });

  it('returns 404 (not 500) for a well-formed id with no player', async () => {
    const res = await request(app).get('/rankings/players/999999');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it('returns the player with parsed dataSources array and tier enrichment', async () => {
    const a = await makeAthlete({ name: 'Detail Dana', position: 'WR' });
    await seedRanking(a.id, {
      overallScore: 88,
      combineScore: 80,
      maxPrepsScore: 90,
      zybekScore: 85,
      usaTalentIdScore: 92,
      dataSources: ['combine', 'max_preps', 'zybek'],
    });

    const res = await request(app).get(`/rankings/players/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Detail Dana');
    expect(res.body.scores.overall).toBe(88);
    expect(res.body.scores.maxPreps).toBe(90);
    expect(res.body.dataSources).toEqual(['combine', 'max_preps', 'zybek']);
    expect(res.body).toHaveProperty('tier');
    expect(res.body).toHaveProperty('tierColor');
    // Privacy guard from publicPlayerView — minor PII never leaves a public
    // ranking endpoint.
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('phone');
    expect(res.body).not.toHaveProperty('dob');
  });

  it('returns zero scores and empty dataSources when no athleteRankings row exists', async () => {
    const a = await makeAthlete({ name: 'Unrated Una' });
    const res = await request(app).get(`/rankings/players/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.scores.overall).toBe(0);
    expect(res.body.dataSources).toEqual([]);
  });

  it('returns an empty dataSources array when the column holds null', async () => {
    const a = await makeAthlete();
    await seedRanking(a.id, { dataSources: null });
    const res = await request(app).get(`/rankings/players/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.dataSources).toEqual([]);
  });
});

describe('GET /rankings/states', () => {
  it('returns a sorted, deduped list of non-null states', async () => {
    await makeAthlete({ state: 'GA' });
    await makeAthlete({ state: 'GA' });
    await makeAthlete({ state: 'TX' });
    await makeAthlete({ state: 'CA' });

    const res = await request(app).get('/rankings/states');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['CA', 'GA', 'TX']);
  });
});

describe('GET /rankings/positions', () => {
  it('returns a sorted, deduped list of non-null positions', async () => {
    await makeAthlete({ position: 'QB' });
    await makeAthlete({ position: 'WR' });
    await makeAthlete({ position: 'QB' });

    const res = await request(app).get('/rankings/positions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['QB', 'WR']);
  });
});

describe('GET /rankings/criteria', () => {
  it('returns the static methodology payload', async () => {
    const res = await request(app).get('/rankings/criteria');
    expect(res.status).toBe(200);
    expect(res.body.sources).toBeInstanceOf(Array);
    expect(res.body.sources.length).toBeGreaterThan(0);
    expect(res.body.tiers).toBeInstanceOf(Array);
    expect(typeof res.body.methodology).toBe('string');
  });
});

describe('POST /rankings/calculate/:playerId', () => {
  it('returns 400 (not 500) for a non-numeric playerId', async () => {
    const res = await request(app).post('/rankings/calculate/not-a-number').send({});
    expect(res.status).toBe(400);
  });

  it('upserts an athleteRankings row for the given player and serializes dataSources', async () => {
    const a = await makeAthlete();
    const res = await request(app).post(`/rankings/calculate/${a.id}`).send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.playerId).toBe(a.id);

    const rows = await db.select().from(schema.athleteRankings);
    const ranking = rows.find(r => r.playerId === a.id);
    expect(ranking).toBeDefined();
    expect(Array.isArray(ranking!.dataSources)).toBe(true);
  });
});
