import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);

// The server-side demo gate is the real security boundary for Instant Login.
// The client gate (VITE_ENABLE_DEMO_LOGIN + non-prod MODE) is best-effort UX;
// a leaked client bundle must not be able to reach a prod demo path, so the
// server fails closed on both signals (DEMO_ENABLED + NODE_ENV).
describe('Demo login server-side gate', () => {
  const original = { node: process.env.NODE_ENV, demo: process.env.DEMO_ENABLED };

  beforeEach(() => {
    delete process.env.DEMO_ENABLED;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = original.node;
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

  it('does not interfere with non-demo logins (gate is allowlist-only)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'irrelevant' });
    // Should hit the normal credential check (401), not the demo gate (403).
    expect(res.status).toBe(401);
  });
});
