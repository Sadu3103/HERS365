import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import scholarshipRouter from '../scholarshipRoutes';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

// scholarshipRoutes is not yet wired into createApp(). Mount on a tiny test
// app so the real router code is exercised end-to-end against the real db.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/scholarships', scholarshipRouter);
  return app;
}

const app = buildApp();
beforeEach(resetDb);

async function seedScholarship(overrides: Partial<typeof schema.scholarships.$inferInsert> = {}) {
  const [row] = await db.insert(schema.scholarships).values({
    name: 'NIL Award',
    amount: 5000,
    deadline: '2026-09-01',
    ...overrides,
  }).returning();
  return row;
}

describe('GET /api/scholarships', () => {
  it('returns an empty list when there are none', async () => {
    const res = await request(app).get('/api/scholarships');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns seeded scholarships', async () => {
    await seedScholarship({ name: 'Alpha' });
    await seedScholarship({ name: 'Bravo' });
    const res = await request(app).get('/api/scholarships');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((s: any) => s.name).sort()).toEqual(['Alpha', 'Bravo']);
  });
});

describe('GET /api/scholarships/saved/:playerId', () => {
  it('returns the saved scholarship ids for that player only', async () => {
    const s1 = await seedScholarship();
    const s2 = await seedScholarship();
    const me = await makeAthlete();
    const other = await makeAthlete();
    await db.insert(schema.savedScholarships).values([
      { playerId: me.id,    scholarshipId: s1.id },
      { playerId: me.id,    scholarshipId: s2.id },
      { playerId: other.id, scholarshipId: s1.id },
    ]);

    const res = await request(app).get(`/api/scholarships/saved/${me.id}`);
    expect(res.status).toBe(200);
    expect((res.body as number[]).sort()).toEqual([s1.id, s2.id].sort());
  });

  it('returns an empty list for a player with no saves', async () => {
    const athlete = await makeAthlete();
    const res = await request(app).get(`/api/scholarships/saved/${athlete.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Known gap pinned by this test: the handler does `parseInt(playerId)` with
  // no validation, so a non-numeric :playerId currently flows NaN into the
  // query and returns 500. The desired contract is 400 (per the D-series id
  // validation pattern in queryParamValidation.test.ts) — leaving as a
  // regression pin so the day this route adopts parseIdParam, this test
  // catches the intent.
  it('currently returns 500 on a non-numeric :playerId (regression pin)', async () => {
    const res = await request(app).get('/api/scholarships/saved/not-a-number');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/scholarships/save', () => {
  it('saves a scholarship for a player', async () => {
    const s = await seedScholarship();
    const athlete = await makeAthlete();

    const res = await request(app)
      .post('/api/scholarships/save')
      .send({ playerId: athlete.id, scholarshipId: s.id });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/saved/i);

    const rows = await db
      .select()
      .from(schema.savedScholarships)
      .where(and(
        eq(schema.savedScholarships.playerId, athlete.id),
        eq(schema.savedScholarships.scholarshipId, s.id),
      ));
    expect(rows).toHaveLength(1);
  });

  it('returns 400 when the same scholarship is saved twice', async () => {
    const s = await seedScholarship();
    const athlete = await makeAthlete();
    await db.insert(schema.savedScholarships).values({ playerId: athlete.id, scholarshipId: s.id });

    const res = await request(app)
      .post('/api/scholarships/save')
      .send({ playerId: athlete.id, scholarshipId: s.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already saved/i);

    const rows = await db
      .select()
      .from(schema.savedScholarships)
      .where(and(
        eq(schema.savedScholarships.playerId, athlete.id),
        eq(schema.savedScholarships.scholarshipId, s.id),
      ));
    expect(rows).toHaveLength(1);
  });
});

describe('DELETE /api/scholarships/save', () => {
  it('removes a saved scholarship', async () => {
    const s = await seedScholarship();
    const athlete = await makeAthlete();
    await db.insert(schema.savedScholarships).values({ playerId: athlete.id, scholarshipId: s.id });

    const res = await request(app)
      .delete('/api/scholarships/save')
      .send({ playerId: athlete.id, scholarshipId: s.id });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);

    const rows = await db
      .select()
      .from(schema.savedScholarships)
      .where(and(
        eq(schema.savedScholarships.playerId, athlete.id),
        eq(schema.savedScholarships.scholarshipId, s.id),
      ));
    expect(rows).toEqual([]);
  });

  it('is a no-op (still 200) when no matching row exists', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .delete('/api/scholarships/save')
      .send({ playerId: athlete.id, scholarshipId: 999999 });
    expect(res.status).toBe(200);
  });

  it('only removes the caller’s row, not someone else’s save of the same scholarship', async () => {
    const s = await seedScholarship();
    const me = await makeAthlete();
    const other = await makeAthlete();
    await db.insert(schema.savedScholarships).values([
      { playerId: me.id,    scholarshipId: s.id },
      { playerId: other.id, scholarshipId: s.id },
    ]);

    const res = await request(app)
      .delete('/api/scholarships/save')
      .send({ playerId: me.id, scholarshipId: s.id });
    expect(res.status).toBe(200);

    const survivors = await db
      .select()
      .from(schema.savedScholarships)
      .where(eq(schema.savedScholarships.scholarshipId, s.id));
    expect(survivors).toHaveLength(1);
    expect(survivors[0].playerId).toBe(other.id);
  });
});
