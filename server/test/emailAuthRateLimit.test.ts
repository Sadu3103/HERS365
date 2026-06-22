import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { _emailAuthLimitersForTests } from '../emailAuthRoutes';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

// /api/auth/email/{login,forgot-password,reset-password} — these brute-force
// surfaces were previously unrated-limited; this file pins the new throttle.
// Pattern mirrors server/test/messageThrottle.test.ts: configure a low max
// via env (the limiter's `max` option is a function that re-reads env on
// every request) and reset the limiter store between tests so cases stay
// deterministic without any sleep / fake-timer juggling.
vi.mock('../email', () => ({
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendEmail: vi.fn(async () => undefined),
}));

const app = createApp();

const LOGIN_MAX = 3;
const RESET_MAX = 2;
const ORIGINAL_ENV = { ...process.env };

// supertest goes over loopback; reset every known representation of it so
// the limiter starts clean for each test.
const LOOPBACK_KEYS = ['::ffff:127.0.0.1', '127.0.0.1', '::1'];

function resetLimiters() {
  for (const key of LOOPBACK_KEYS) {
    _emailAuthLimitersForTests.login.resetKey(key);
    _emailAuthLimitersForTests.passwordReset.resetKey(key);
  }
}

beforeEach(async () => {
  process.env.LOGIN_RATE_LIMIT_MAX = String(LOGIN_MAX);
  process.env.PASSWORD_RESET_RATE_LIMIT_MAX = String(RESET_MAX);
  await resetDb();
  resetLimiters();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetLimiters();
});

describe('throttle on POST /api/auth/email/login', () => {
  it(`returns 429 once a caller exceeds ${LOGIN_MAX} attempts in the window`, async () => {
    await makeAthlete({ email: 'login-throttle@test.local' });

    // Exhaust the budget with a mix of wrong-password 401s — the limiter
    // counts every request, not just successes.
    for (let i = 0; i < LOGIN_MAX; i++) {
      const res = await request(app)
        .post('/api/auth/email/login')
        .send({ email: 'login-throttle@test.local', password: 'wrong-Password1' });
      expect(res.status).toBe(401);
    }

    const throttled = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'login-throttle@test.local', password: 'wrong-Password1' });
    expect(throttled.status).toBe(429);
    expect(throttled.body.error).toMatch(/too many/i);
  });

  it('also fires for the correct password — the cap is on attempts, not failures', async () => {
    await makeAthlete({ email: 'right-pw@test.local' });

    // Burn the budget on wrong passwords.
    for (let i = 0; i < LOGIN_MAX; i++) {
      await request(app)
        .post('/api/auth/email/login')
        .send({ email: 'right-pw@test.local', password: 'wrong-Password1' });
    }

    // The correct password no longer wins — the gate is at the limiter.
    const throttled = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'right-pw@test.local', password: 'Test-pw-123' });
    expect(throttled.status).toBe(429);
  });

  it('resetKey on the loopback IP lifts the throttle (sanity for the test helper)', async () => {
    await makeAthlete({ email: 'reset-helper@test.local' });

    for (let i = 0; i < LOGIN_MAX; i++) {
      await request(app)
        .post('/api/auth/email/login')
        .send({ email: 'reset-helper@test.local', password: 'wrong-Password1' });
    }
    const throttled = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'reset-helper@test.local', password: 'wrong-Password1' });
    expect(throttled.status).toBe(429);

    resetLimiters();

    const afterReset = await request(app)
      .post('/api/auth/email/login')
      .send({ email: 'reset-helper@test.local', password: 'Test-pw-123' });
    expect(afterReset.status).toBe(200);
    expect(afterReset.body.token).toBeTypeOf('string');
  });
});

describe('throttle on POST /api/auth/email/forgot-password', () => {
  it(`returns 429 once a caller exceeds ${RESET_MAX} requests in the window`, async () => {
    for (let i = 0; i < RESET_MAX; i++) {
      const res = await request(app)
        .post('/api/auth/email/forgot-password')
        .send({ email: `nobody-${i}@test.local` });
      expect(res.status).toBe(200);
    }

    const throttled = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: 'nobody-overflow@test.local' });
    expect(throttled.status).toBe(429);
    expect(throttled.body.error).toMatch(/too many/i);
  });

  it('the cap applies regardless of whether the email exists — no enumeration via 429 timing', async () => {
    await makeAthlete({ email: 'real@test.local' });

    // First call hits an existing user, second a ghost — both consume budget.
    const first = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: 'real@test.local' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: 'ghost@test.local' });
    expect(second.status).toBe(200);

    const throttled = await request(app)
      .post('/api/auth/email/forgot-password')
      .send({ email: 'real@test.local' });
    expect(throttled.status).toBe(429);
  });
});

describe('throttle on POST /api/auth/email/reset-password', () => {
  it(`returns 429 once a caller exceeds ${RESET_MAX} reset attempts in the window`, async () => {
    for (let i = 0; i < RESET_MAX; i++) {
      const res = await request(app)
        .post('/api/auth/email/reset-password')
        .send({ token: `bad-${i}`, password: 'Brand-new-pw1' });
      // Each request is a 400 because the token is bogus, but every request
      // still counts toward the limiter.
      expect(res.status).toBe(400);
    }

    const throttled = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token: 'one-too-many', password: 'Brand-new-pw1' });
    expect(throttled.status).toBe(429);
    expect(throttled.body.error).toMatch(/too many/i);
  });

  it('shares its budget with /forgot-password (same passwordResetLimiter)', async () => {
    // Burn the budget on /forgot-password.
    for (let i = 0; i < RESET_MAX; i++) {
      await request(app)
        .post('/api/auth/email/forgot-password')
        .send({ email: `mixed-${i}@test.local` });
    }

    // A /reset-password call from the same IP is now also throttled.
    const throttled = await request(app)
      .post('/api/auth/email/reset-password')
      .send({ token: 'whatever', password: 'Brand-new-pw1' });
    expect(throttled.status).toBe(429);
  });
});
