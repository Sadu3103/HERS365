import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('JWT gates', () => {
  it('401s with no token', async () => {
    const res = await request(app).get('/api/messages/conversations');
    expect(res.status).toBe(401);
  });

  it('401s with a garbage token', async () => {
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('401s with an expired token', async () => {
    // Same secret the app verifies with — keeps this a test of EXPIRY, not
    // of a signature mismatch, even if setup.ts changes the test secret.
    const expired = jwt.sign(
      { userId: 1, email: 'x@test.local', role: 'athlete', name: 'X' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' },
    );
    const res = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('403s an athlete on coach endpoints', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/coach/messages')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(403);
  });

  it('403s a coach on admin endpoints', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(403);
  });
});

describe('register / login round trip', () => {
  it('registers an athlete, logs in, and never leaks passwordHash', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'newathlete@test.local',
      password: 'Str0ng-pass!',
      name: 'New Athlete',
      role: 'athlete',
      dob: '2008-04-12',
    });
    expect([200, 201]).toContain(reg.status);
    expect(JSON.stringify(reg.body)).not.toContain('passwordHash');
    expect(JSON.stringify(reg.body)).not.toContain('password_hash');

    const login = await request(app).post('/api/auth/login').send({
      email: 'newathlete@test.local',
      password: 'Str0ng-pass!',
    });
    expect(login.status).toBe(200);
    expect(login.body.token ?? login.body.data?.token).toBeTruthy();
    expect(JSON.stringify(login.body)).not.toContain('passwordHash');
    expect(JSON.stringify(login.body)).not.toContain('password_hash');

    const token = login.body.token ?? login.body.data?.token;
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    // Positive assertion so the leak checks can't pass vacuously on an empty body.
    expect(JSON.stringify(me.body)).toContain('newathlete@test.local');
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    expect(JSON.stringify(me.body)).not.toContain('password_hash');
  });

  it('rejects login with a wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'a2@test.local', password: 'Right-pass-1', name: 'A2', role: 'athlete', dob: '2008-04-12',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'a2@test.local', password: 'Wrong-pass-1',
    });
    expect(res.status).toBe(401);
  });
});

describe('register hardening: role allowlist + parent gate', () => {
  // Privilege escalation: a body role of 'admin' must be rejected before any
  // DB write or token signing, so it can never yield an admin JWT.
  it('rejects a self-registered admin with 400 and no token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'wannabe-admin@test.local', password: 'Str0ng-pass!', name: 'Wannabe', role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid account type');
    expect(res.body.token).toBeUndefined();
  });

  // COPPA + parent-gate: a 13-to-17 athlete cannot self-register without a
  // parent/guardian email.
  it('rejects an under-18 athlete with no parent email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'minor@test.local', password: 'Str0ng-pass!', name: 'Minor', role: 'athlete', dob: '2011-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('parent');
  });

  it('accepts an under-18 athlete once a parent email is supplied', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'minor2@test.local', password: 'Str0ng-pass!', name: 'Minor Two',
      role: 'athlete', dob: '2011-01-01', parentEmail: 'guardian@test.local',
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.token).toBeTruthy();
  });
});

// The email/password register endpoint always creates an athlete, so it must
// enforce the same shared age/parent gate as /api/auth/register. This router
// is mounted at /api/auth/email. Keep total requests here at or under the
// 5/hour in-memory register limiter so no case flakes on a 429.
describe('email/password register: shared athlete gate', () => {
  it('rejects an under-13 dob (COPPA)', async () => {
    const res = await request(app).post('/api/auth/email/register').send({
      email: 'coppa@test.local', password: 'Str0ng-pass!', name: 'Too Young', dob: '2016-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('under 13');
    expect(res.body.token).toBeUndefined();
  });

  it('rejects an under-18 dob with no parent email', async () => {
    const res = await request(app).post('/api/auth/email/register').send({
      email: 'eminor@test.local', password: 'Str0ng-pass!', name: 'E Minor', dob: '2011-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('parent');
    expect(res.body.token).toBeUndefined();
  });

  it('rejects a missing dob', async () => {
    const res = await request(app).post('/api/auth/email/register').send({
      email: 'nodob@test.local', password: 'Str0ng-pass!', name: 'No Dob',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date of birth is required for athlete accounts');
    expect(res.body.token).toBeUndefined();
  });

  it('accepts an adult dob and returns a token', async () => {
    const res = await request(app).post('/api/auth/email/register').send({
      email: 'eadult@test.local', password: 'Str0ng-pass!', name: 'E Adult', dob: '2000-01-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it('accepts an under-18 dob once a parent email is supplied', async () => {
    const res = await request(app).post('/api/auth/email/register').send({
      email: 'eminor2@test.local', password: 'Str0ng-pass!', name: 'E Minor Two',
      dob: '2011-01-01', parentEmail: 'guardian@test.local',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });
});
