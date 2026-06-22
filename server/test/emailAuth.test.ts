import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { sendPasswordResetEmail } from '../email';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

// /api/auth/email/* — gap-coverage for emailAuthRoutes.ts. The happy-path
// token shape is already locked by emailAuthToken.test.ts; this file covers
// the error and enumeration-safety branches only.
//
// IMPORTANT: server/emailAuthRoutes.ts registers a rate limiter on /register
// with max=5 per hour per IP. Counter is module-scoped and persists across
// tests in the same file. We budget exactly 5 /register POSTs across this
// file's lifetime; duplicate-detection and unhappy-login coverage seed users
// via the db helper instead of consuming additional register slots.
//
// Mocking ../email keeps tests offline AND lets us capture the reset token
// that the route would otherwise only deliver via email. vi.mock is hoisted
// above the static imports so the route picks up the stubbed module.
vi.mock('../email', () => ({
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendEmail: vi.fn(async () => undefined),
}));

const app = createApp();
beforeEach(async () => {
  await resetDb();
  vi.mocked(sendPasswordResetEmail).mockClear();
});

describe('POST /api/auth/email/register — error paths', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'no-password@test.local' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'not-an-email', password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  it('returns 400 when the password is shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'short-pw@test.local', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('returns 409 when the email is already registered', async () => {
    // Seed an athlete with the same email via the db helper (no /register
    // call) so the duplicate-detection branch is exercised without burning
    // a rate-limit slot.
    const existing = await makeAthlete({ email: 'duplicate-email@test.local' });
    expect(existing.email).toBe('duplicate-email@test.local');

    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: 'duplicate-email@test.local', password: 'Password1' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

// emailAuthRoutes.ts does not enforce a server-side DOB / COPPA check on
// register — the field isn't read by the handler at all. The age gate is
// applied client-side in client/src/pages/Auth.tsx. Documenting that here so
// a future reader doesn't expect a server reject path that doesn't exist.

describe('POST /api/auth/email/login — error paths', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'no-password@test.local' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it('returns 401 (not 404) for an unknown email — no enumeration leak', async () => {
    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'nobody@test.local', password: 'Password1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 with the same body for a wrong password on an existing account', async () => {
    // makeAthlete seeds the canonical bcrypt-hashed password 'Test-pw-123'.
    await makeAthlete({ email: 'wrong-pw@test.local' });

    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'wrong-pw@test.local', password: 'definitely-not-right' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 for an account whose passwordHash is null (e.g. OAuth-only user)', async () => {
    // Force passwordHash to null via direct update — the helper always seeds
    // a hash, so we strip it here to exercise the !passwordHash branch.
    const a = await makeAthlete({ email: 'oauth-only@test.local' });
    await db.update(schema.players).set({ passwordHash: null }).where(eq(schema.players.id, a.id));

    const res = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'oauth-only@test.local', password: 'whatever-Password1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});

describe('POST /api/auth/email/forgot-password — no user enumeration', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  it('returns the same generic 200 response shape for an existing AND a non-existing email', async () => {
    await makeAthlete({ email: 'real-user@test.local' });

    const existingRes = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: 'real-user@test.local' });
    const ghostRes = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: 'never-registered@test.local' });

    expect(existingRes.status).toBe(200);
    expect(ghostRes.status).toBe(200);
    // Same shape and same message — the response must not differ in any way
    // that lets a caller distinguish "this email exists" from "this email
    // doesn't exist."
    expect(existingRes.body).toEqual(ghostRes.body);
    expect(existingRes.body.message).toMatch(/if that email exists/i);
    // No accidental field leak.
    expect(existingRes.body).not.toHaveProperty('userId');
    expect(existingRes.body).not.toHaveProperty('exists');
    expect(existingRes.body).not.toHaveProperty('id');
  });

  it('only triggers a reset email for an existing account', async () => {
    await makeAthlete({ email: 'real@test.local' });

    await request(app).post('/api/auth/email/forgot-password').send({ email: 'real@test.local' });
    await request(app).post('/api/auth/email/forgot-password').send({ email: 'ghost@test.local' });

    // sendPasswordResetEmail is called exactly once: for the real user.
    expect(vi.mocked(sendPasswordResetEmail)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendPasswordResetEmail).mock.calls[0][0]).toBe('real@test.local');
  });
});

describe('POST /api/auth/email/reset-password', () => {
  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ password: 'Password1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token and password/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token: 'whatever-token' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token and password/i);
  });

  it('returns 400 when the password is shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token: 'whatever-token', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('returns 400 for an unknown reset token and does not mutate any password', async () => {
    const a = await makeAthlete({ email: 'no-mutation@test.local' });
    const [before] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));

    const res = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token: 'not-a-real-token', password: 'BrandNewPw1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);

    const [after] = await db.select().from(schema.players).where(eq(schema.players.id, a.id));
    expect(after.passwordHash).toBe(before.passwordHash);
  });

  it('accepts a token minted via /forgot-password and rotates the password', async () => {
    const targetEmail = 'reset-flow@test.local';
    await makeAthlete({ email: targetEmail });

    // Mint a fresh token through the real flow; the mock captures the value
    // the route would have emailed.
    const forgotRes = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: targetEmail });
    expect(forgotRes.status).toBe(200);
    expect(vi.mocked(sendPasswordResetEmail)).toHaveBeenCalledTimes(1);
    const [emailedTo, token] = vi.mocked(sendPasswordResetEmail).mock.calls[0];
    expect(emailedTo).toBe(targetEmail);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const resetRes = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token, password: 'BrandNewPw1' });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toMatch(/updated/i);

    // New password works on /login.
    const loginRes = await request(app)
      .post('/api/auth/email/login')
      .send({ email: targetEmail, password: 'BrandNewPw1' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf('string');

    // Token is single-use: replaying it after a successful reset is rejected.
    const replayRes = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token, password: 'AnotherPw1' });
    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error).toMatch(/invalid or expired/i);
  });
});
