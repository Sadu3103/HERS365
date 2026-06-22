import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { signToken } from '../auth';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

// Scope per the batch6 brief: admin verification surface only — not every
// admin endpoint. The shared requireAdmin contract is exercised via the
// representative /admin/coaches/verification route plus the two verify
// endpoints (PATCH /coaches/:id/verify, PATCH /users/:id/verify) which must
// actually flip the underlying status columns.
const app = createApp();
beforeEach(resetDb);

function adminToken() {
  // signToken accepts the admin role directly; admin endpoints only check
  // role === 'admin' and don't look the user up in any users table.
  return signToken({ userId: 1, email: 'admin@test.local', role: 'admin', name: 'Admin' });
}

describe('requireAdmin gate (shared across admin endpoints)', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/admin/coaches/verification');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/admin/coaches/verification')
      .set('Authorization', 'NotBearer something');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/admin/coaches/verification')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 403 for an authenticated athlete', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/admin/coaches/verification')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('returns 403 for an authenticated coach', async () => {
    const c = await makeCoach();
    const res = await request(app)
      .get('/api/admin/coaches/verification')
      .set('Authorization', `Bearer ${tokenFor(c, 'coach')}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/admin/coaches/verification', () => {
  it('returns only coaches whose verifiedStatus is false', async () => {
    await makeCoach({ name: 'Verified Vera', verifiedStatus: true });
    const pending1 = await makeCoach({ name: 'Pending Paula', verifiedStatus: false });
    const pending2 = await makeCoach({ name: 'Pending Petra', verifiedStatus: false });

    const res = await request(app)
      .get('/api/admin/coaches/verification')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const ids = res.body.map((c: { id: number }) => c.id).sort();
    expect(ids).toEqual([pending1.id, pending2.id].sort());
    // PII guard: passwordHash must never leave admin endpoints in the response.
    for (const coach of res.body) {
      expect(coach).not.toHaveProperty('passwordHash');
    }
  });

  it('returns an empty array when every coach is already verified', async () => {
    await makeCoach({ verifiedStatus: true });
    await makeCoach({ verifiedStatus: true });
    const res = await request(app)
      .get('/api/admin/coaches/verification')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('PATCH /api/admin/coaches/:id/verify', () => {
  it('returns 401 when no auth is supplied', async () => {
    const c = await makeCoach({ verifiedStatus: false });
    const res = await request(app)
      .patch(`/api/admin/coaches/${c.id}/verify`)
      .send({ verified: true });
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin attempts to verify a coach', async () => {
    const c = await makeCoach({ verifiedStatus: false });
    const athlete = await makeAthlete();
    const res = await request(app)
      .patch(`/api/admin/coaches/${c.id}/verify`)
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ verified: true });
    expect(res.status).toBe(403);
  });

  it('flips verifiedStatus to true for an admin caller and persists', async () => {
    const c = await makeCoach({ verifiedStatus: false });

    const res = await request(app)
      .patch(`/api/admin/coaches/${c.id}/verify`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ verified: true });
    expect(res.status).toBe(200);
    expect(res.body.verifiedStatus).toBe(true);
    expect(res.body).not.toHaveProperty('passwordHash');

    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.id, c.id));
    expect(row.verifiedStatus).toBe(true);
    expect(row.verifiedAt).not.toBeNull();
  });

  it('flips verifiedStatus back to false and clears verifiedAt', async () => {
    const c = await makeCoach({ verifiedStatus: true });
    const res = await request(app)
      .patch(`/api/admin/coaches/${c.id}/verify`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ verified: false });
    expect(res.status).toBe(200);
    expect(res.body.verifiedStatus).toBe(false);

    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.id, c.id));
    expect(row.verifiedStatus).toBe(false);
    expect(row.verifiedAt).toBeNull();
  });

  it('returns 404 (not 500) for a well-formed id that does not exist', async () => {
    const res = await request(app)
      .patch('/api/admin/coaches/999999/verify')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ verified: true });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 (not 500) for a non-numeric id', async () => {
    const res = await request(app)
      .patch('/api/admin/coaches/not-a-number/verify')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ verified: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });
});

describe('PATCH /api/admin/users/:id/verify', () => {
  it('returns 401 when no auth is supplied', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .patch(`/api/admin/users/${a.id}/verify`)
      .send({ status: 'verified' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin attempts to verify a user', async () => {
    const target = await makeAthlete();
    const stranger = await makeAthlete();
    const res = await request(app)
      .patch(`/api/admin/users/${target.id}/verify`)
      .set('Authorization', `Bearer ${tokenFor(stranger, 'athlete')}`)
      .send({ status: 'verified' });
    expect(res.status).toBe(403);
  });

  it('persists verificationStatus for an admin caller', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .patch(`/api/admin/users/${a.id}/verify`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'verified' });
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('verified');
    expect(res.body).not.toHaveProperty('passwordHash');

    const [row] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));
    expect(row.verificationStatus).toBe('verified');
  });

  it('returns 404 (not 500) for a well-formed id that does not exist', async () => {
    const res = await request(app)
      .patch('/api/admin/users/999999/verify')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'verified' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 (not 500) for a non-numeric id', async () => {
    const res = await request(app)
      .patch('/api/admin/users/abc/verify')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'verified' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 400 (not 500) for a negative id (parseIdParam rejects non-positive)', async () => {
    const res = await request(app)
      .patch('/api/admin/users/-1/verify')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'verified' });
    expect(res.status).toBe(400);
  });
});

// Coverage for the remaining adminRoutes parseIdParam guards. We don't need
// happy-path tests for every endpoint here (that's batch7 territory); these
// just confirm the 400 (not 500) contract for non-numeric ids on the rest of
// the verify / mutation surface that was hardened in this batch.
describe('adminRoutes numeric-id hardening (400, not 500, on non-numeric ids)', () => {
  const cases: Array<{ method: 'patch' | 'delete' | 'post'; path: string }> = [
    { method: 'patch', path: '/api/admin/users/abc/subscription' },
    { method: 'delete', path: '/api/admin/users/abc' },
    { method: 'patch', path: '/api/admin/posts/abc/moderate' },
    { method: 'patch', path: '/api/admin/events/abc' },
    { method: 'delete', path: '/api/admin/events/abc' },
    { method: 'patch', path: '/api/admin/subscription-plans/abc' },
    { method: 'delete', path: '/api/admin/subscription-plans/abc' },
    { method: 'post', path: '/api/admin/athletes/abc/verify' },
    { method: 'patch', path: '/api/admin/teams/abc' },
    { method: 'delete', path: '/api/admin/teams/abc' },
  ];

  for (const { method, path } of cases) {
    it(`${method.toUpperCase()} ${path} → 400`, async () => {
      const res = await (request(app) as any)[method](path)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ verified: true, status: 'verified', tier: 'pro' });
      expect(res.status).toBe(400);
    });
  }
});
