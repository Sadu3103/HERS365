import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/users/profile', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });

  it("returns the caller's own athlete row with role attached and no passwordHash", async () => {
    const a = await makeAthlete({ city: 'Atlanta' });
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(a.id);
    expect(res.body.data.city).toBe('Atlanta');
    expect(res.body.data.role).toBe('athlete');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('routes coach role to the coaches table', async () => {
    const c = await makeCoach({ name: 'Coach K' });
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(c, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(c.id);
    expect(res.body.data.role).toBe('coach');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('routes parent role to the parents table', async () => {
    const p = await makeParent();
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(p, 'parent')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(p.id);
    expect(res.body.data.role).toBe('parent');
  });

  it('returns 404 when the token references a user id that does not exist in the role table', async () => {
    await makeAthlete();
    // Token claims coach role + an id that isn't in the coaches table.
    const ghost = tokenFor({ id: 999999, email: 'ghost@test.local', name: 'ghost' }, 'coach');
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${ghost}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('PUT /api/users/profile', () => {
  it('requires authentication', async () => {
    const res = await request(app).put('/api/users/profile').send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('rejects non-athlete callers with 403', async () => {
    const c = await makeCoach();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(c, 'coach')}`)
      .send({ name: 'New Coach Name' });
    expect(res.status).toBe(403);
  });

  it('rejects an empty body with 400 (zod refine: at least one field)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects an invalid privacySetting enum with 400', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ privacySetting: 'definitely-not-valid' });
    expect(res.status).toBe(400);
  });

  it('persists privacySetting and other whitelisted fields, coercing gradYear to int', async () => {
    const a = await makeAthlete({ privacySetting: 'public' });
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ privacySetting: 'private', city: 'Denver', gradYear: '2027', bio: 'go ducks' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.privacySetting).toBe('private');
    expect(res.body.data.city).toBe('Denver');
    expect(res.body.data.gradYear).toBe(2027);
    expect(res.body.data.bio).toBe('go ducks');
    expect(res.body.data.passwordHash).toBeUndefined();

    const [persisted] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));
    expect(persisted.privacySetting).toBe('private');
    expect(persisted.city).toBe('Denver');
    expect(persisted.gradYear).toBe(2027);
  });

  it('silently drops non-whitelisted fields like email and passwordHash', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({
        name: 'Renamed',
        email: 'attacker@evil.test',
        passwordHash: 'ATTACKER',
        id: 9999,
        subscriptionTier: 'pro',
      });
    expect(res.status).toBe(200);

    const [persisted] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));
    expect(persisted.name).toBe('Renamed');
    expect(persisted.email).toBe(a.email);
    expect(persisted.passwordHash).not.toBe('ATTACKER');
    expect(persisted.id).toBe(a.id);
  });
});

describe('GET /api/users/stats', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/users/stats');
    expect(res.status).toBe(401);
  });

  it('returns an empty object for non-athlete callers', async () => {
    const c = await makeCoach();
    const res = await request(app)
      .get('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(c, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({});
  });

  it('returns an empty object for an athlete with no combine row', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({});
  });

  it('returns the seeded combine row for the caller', async () => {
    const a = await makeAthlete();
    await db.insert(schema.combineStats).values({
      playerId: a.id, season: '2026', fortyDash: '4.55',
    });
    const res = await request(app)
      .get('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fortyDash).toBe('4.55');
    expect(res.body.data.season).toBe('2026');
    expect(res.body.data.playerId).toBe(a.id);
  });
});

describe('POST /api/users/stats', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/users/stats').send({ fortyDash: '4.5' });
    expect(res.status).toBe(401);
  });

  it('rejects non-athlete callers with 403', async () => {
    const c = await makeCoach();
    const res = await request(app)
      .post('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(c, 'coach')}`)
      .send({ fortyDash: '4.5' });
    expect(res.status).toBe(403);
  });

  it('inserts a combine row for a first-time submission', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ fortyDash: '4.55', shuttle: '4.20', vertical: '32' });
    expect(res.status).toBe(200);
    expect(res.body.data.fortyDash).toBe('4.55');

    const rows = await db
      .select()
      .from(schema.combineStats)
      .where(eq(schema.combineStats.playerId, a.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].fortyDash).toBe('4.55');
    expect(rows[0].shuttle).toBe('4.20');
    expect(rows[0].vertical).toBe('32');
  });

  it('updates the existing combine row instead of inserting a second one', async () => {
    const a = await makeAthlete();
    await db.insert(schema.combineStats).values({ playerId: a.id, fortyDash: '5.00' });

    const res = await request(app)
      .post('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ fortyDash: '4.55' });
    expect(res.status).toBe(200);
    expect(res.body.data.fortyDash).toBe('4.55');

    const rows = await db
      .select()
      .from(schema.combineStats)
      .where(eq(schema.combineStats.playerId, a.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].fortyDash).toBe('4.55');
  });

  it('returns the existing row unchanged when the payload contains no combine fields', async () => {
    const a = await makeAthlete();
    const [existing] = await db.insert(schema.combineStats).values({
      playerId: a.id, fortyDash: '4.99',
    }).returning();

    const res = await request(app)
      .post('/api/users/stats')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ unrelatedField: 'ignored' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(existing.id);
    expect(res.body.data.fortyDash).toBe('4.99');
  });
});
