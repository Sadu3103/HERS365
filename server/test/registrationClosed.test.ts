import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

// Registration kill switch. setup.ts sets REGISTRATION_ENABLED='true' for the
// suite, so each case flips it to closed locally and restores it in finally.
// Lives in its own file so the in-memory register rate limiter starts fresh
// (vitest isolates module state per test file) — otherwise the 5/hour cap that
// auth.test.ts already spends would surface as a 429 before the 403 guard runs.
const app = createApp();
beforeEach(resetDb);

describe('registration kill switch (closed)', () => {
  it('403s POST /api/auth/register when registration is disabled', async () => {
    const prev = process.env.REGISTRATION_ENABLED;
    process.env.REGISTRATION_ENABLED = 'false';
    try {
      const res = await request(app).post('/api/auth/register').send({
        email: 'closed@test.local', password: 'Str0ng-pass!', name: 'Closed', role: 'athlete', dob: '2000-01-01',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Registration is currently closed.');
      expect(res.body.token).toBeUndefined();
    } finally {
      process.env.REGISTRATION_ENABLED = prev;
    }
  });

  it('403s POST /api/auth/email/register when registration is disabled', async () => {
    const prev = process.env.REGISTRATION_ENABLED;
    process.env.REGISTRATION_ENABLED = 'false';
    try {
      const res = await request(app).post('/api/auth/email/register').send({
        email: 'eclosed@test.local', password: 'Str0ng-pass!', name: 'E Closed', dob: '2000-01-01',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Registration is currently closed.');
      expect(res.body.token).toBeUndefined();
    } finally {
      process.env.REGISTRATION_ENABLED = prev;
    }
  });

  it('still logs an existing user in (200) while registration is disabled', async () => {
    // Seed the athlete directly so login does not depend on registration being
    // open. The fixture hashes 'Test-pw-123'.
    const athlete = await makeAthlete();
    const prev = process.env.REGISTRATION_ENABLED;
    process.env.REGISTRATION_ENABLED = 'false';
    try {
      const res = await request(app).post('/api/auth/login').send({
        email: athlete.email, password: 'Test-pw-123',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    } finally {
      process.env.REGISTRATION_ENABLED = prev;
    }
  });
});
