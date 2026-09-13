import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

// Existing coverage on this router lives in exposure.test.ts, savedSchools.test.ts,
// parseIdParam.test.ts, and queryParamValidation.test.ts. This file picks up the
// gaps: GET /:id privacy enforcement, PUT /:id ownership + whitelisting, and
// POST /:id/favorite 501.
const app = createApp();
beforeEach(resetDb);

describe('GET /api/athletes/:id privacy enforcement', () => {
  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app).get('/api/athletes/999999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/athletes/not-a-number');
    expect(res.status).toBe(400);
  });

  it('hides a private athlete from an anonymous viewer with 403', async () => {
    const a = await makeAthlete({ privacySetting: 'private' });
    const res = await request(app).get(`/api/athletes/${a.id}`);
    expect(res.status).toBe(403);
  });

  it('hides a private athlete from another (non-coach) athlete with 403', async () => {
    const owner = await makeAthlete({ privacySetting: 'private' });
    const stranger = await makeAthlete();
    const res = await request(app)
      .get(`/api/athletes/${owner.id}`)
      .set('Authorization', `Bearer ${tokenFor(stranger, 'athlete')}`);
    expect(res.status).toBe(403);
  });

  it('lets the owner view their own private profile', async () => {
    const owner = await makeAthlete({ privacySetting: 'private' });
    const res = await request(app)
      .get(`/api/athletes/${owner.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(owner.id);
  });

  it('lets a coach view a private athlete', async () => {
    const owner = await makeAthlete({ privacySetting: 'private' });
    const coach = await makeCoach();
    const res = await request(app)
      .get(`/api/athletes/${owner.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(owner.id);
  });

  it('returns a public athlete to an anonymous viewer', async () => {
    const a = await makeAthlete({ privacySetting: 'public' });
    const res = await request(app).get(`/api/athletes/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(a.id);
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe('PUT /api/athletes/:id', () => {
  it('requires authentication', async () => {
    const a = await makeAthlete();
    const res = await request(app).put(`/api/athletes/${a.id}`).send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for a malformed id', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put('/api/athletes/not-a-number')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it("rejects edits to someone else's profile with 403 and does not mutate", async () => {
    const owner = await makeAthlete({ name: 'Original' });
    const stranger = await makeAthlete();
    const res = await request(app)
      .put(`/api/athletes/${owner.id}`)
      .set('Authorization', `Bearer ${tokenFor(stranger, 'athlete')}`)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(403);

    const [persisted] = await db.select().from(schema.players).where(eq(schema.players.id, owner.id));
    expect(persisted.name).toBe('Original');
  });

  it('returns 400 for an empty body (zod refine: at least one field)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put(`/api/athletes/${a.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('persists privacySetting and other whitelisted fields, coercing gradYear', async () => {
    const a = await makeAthlete({ privacySetting: 'public' });
    const res = await request(app)
      .put(`/api/athletes/${a.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ privacySetting: 'parent_only', city: 'Phoenix', gradYear: '2028', skillTier: 'tier1' });
    expect(res.status).toBe(200);

    const [persisted] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));
    expect(persisted.privacySetting).toBe('parent_only');
    expect(persisted.city).toBe('Phoenix');
    expect(persisted.gradYear).toBe(2028);
    expect(persisted.skillTier).toBe('tier1');
  });

  it('rejects an invalid privacySetting enum with 400', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put(`/api/athletes/${a.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ privacySetting: 'world-readable' });
    expect(res.status).toBe(400);
  });

  it('silently drops non-whitelisted fields (email, passwordHash, subscriptionTier)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .put(`/api/athletes/${a.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({
        name: 'Renamed',
        email: 'attacker@evil.test',
        passwordHash: 'ATTACKER',
        subscriptionTier: 'pro',
      });
    expect(res.status).toBe(200);

    const [persisted] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));
    expect(persisted.name).toBe('Renamed');
    expect(persisted.email).toBe(a.email);
    expect(persisted.passwordHash).not.toBe('ATTACKER');
  });

  it('returns 404 when the path id is well-formed but does not exist', async () => {
    // A token from an athlete whose id matches the path id, so ownership passes
    // but the row was deleted in between (simulated by skipping the seed). This
    // exercises the post-update empty-result branch.
    const a = await makeAthlete();
    const fakeId = 999999;
    const ghost = tokenFor({ id: fakeId, email: a.email, name: a.name }, 'athlete');
    const res = await request(app)
      .put(`/api/athletes/${fakeId}`)
      .set('Authorization', `Bearer ${ghost}`)
      .send({ name: 'Anybody' });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/athletes/:id/favorite', () => {
  it('returns 501 not implemented', async () => {
    const a = await makeAthlete();
    const res = await request(app).post(`/api/athletes/${a.id}/favorite`).send({});
    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/not implemented/i);
  });
});
