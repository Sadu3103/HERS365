import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());

// Internal error detail (the JS Error's message / stack / DB message) must
// never reach a client. The standard shape now is a generic copy + a 500.
// These tests force a throw inside the route's try/catch and assert the
// response body is the generic one — explicitly NOT the err.message we
// stubbed in. If the route ever regresses to `res.status(500).json({ error:
// err.message })`, the assertion fires.

describe('500 error path does not leak internal err.message — email auth', () => {
  it('POST /api/auth/email/register returns the generic copy when db.insert throws', async () => {
    const SECRET = 'INTERNAL_DETAIL_DO_NOT_LEAK_xyz123';

    // db.insert builds a chain (.values().returning()); replacing the head
    // method with a thenable that rejects is enough to trip the catch.
    const insertSpy = vi.spyOn(db, 'insert').mockImplementation((() => {
      const chain: any = {
        values: () => chain,
        returning: () => Promise.reject(new Error(SECRET)),
      };
      return chain;
    }) as any);

    const res = await request(app)
      .post('/api/auth/email/register')
      .send({ email: `gen-${Date.now()}@test.local`, password: 'Test-pw-123', name: 'Test' });

    expect(res.status).toBe(500);

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain('stack');
    // Generic copy is what the client sees.
    expect(body).toContain('Authentication request failed, please try again');

    expect(insertSpy).toHaveBeenCalled();
  });
});
