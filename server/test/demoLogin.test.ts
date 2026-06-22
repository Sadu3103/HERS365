import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);

// The server-side demo gate is the real security boundary for Instant Login.
// Uses a POSITIVE non-prod assertion: APP_ENV ?? NODE_ENV must be exactly
// 'development' or 'test' AND DEMO_ENABLED must be 'true'. Anything else —
// unset, '', 'production', 'staging', arbitrary strings — fails closed.
//
// This shape is deliberate: this repo's prod entrypoint does not reliably
// set NODE_ENV, so a "not production" check would degrade to "DEMO_ENABLED
// alone" in prod and turn a single misconfigured env var into a full auth
// bypass into a seeded account.
describe('Demo login server-side gate', () => {
  const original = {
    node: process.env.NODE_ENV,
    appEnv: process.env.APP_ENV,
    demo: process.env.DEMO_ENABLED,
  };

  beforeEach(() => {
    delete process.env.DEMO_ENABLED;
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (original.node === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original.node;
    if (original.appEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = original.appEnv;
    if (original.demo === undefined) delete process.env.DEMO_ENABLED;
    else process.env.DEMO_ENABLED = original.demo;
  });

  it('rejects demo athlete email with 403 when DEMO_ENABLED is off', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maya@hers365.com', password: 'irrelevant' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/disabled/i);
  });

  it('rejects demo coach email with 403 when NODE_ENV=production even if DEMO_ENABLED=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_ENABLED = 'true';
    const res = await request(app)
      .post('/api/auth/secure/coach/login')
      .send({ email: 'coach@hers365.com', password: 'irrelevant' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/disabled/i);
  });

  // CRITICAL: covers the real-world prod scenario where NODE_ENV is not
  // explicitly set to 'production'. An "if NODE_ENV !== 'production'" check
  // would have let this through — the positive-assertion gate must not.
  it('rejects demo athlete email with 403 when env value is UNSET (no APP_ENV, no NODE_ENV) even with DEMO_ENABLED=true', async () => {
    delete process.env.NODE_ENV;
    delete process.env.APP_ENV;
    process.env.DEMO_ENABLED = 'true';
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maya@hers365.com', password: 'irrelevant' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/disabled/i);
  });

  it('does not interfere with non-demo logins (gate is allowlist-only)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'irrelevant' });
    // Should hit the normal credential check (401), not the demo gate (403).
    expect(res.status).toBe(401);
  });
});
