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
