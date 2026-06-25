import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// The /api/coaches router is a public, in-memory lookup (no auth, no DB).
// These tests exercise the real handler — parseIdParam validation, the
// not-found branch, and the public DTO that must strip `email` before
// returning to anonymous callers.
const app = createApp();

describe('GET /api/coaches/:id', () => {
  it('returns 200 with the public coach record for a known id', async () => {
    const res = await request(app).get('/api/coaches/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.name).toMatch(/Coach/);
    expect(res.body.data.school).toBeTruthy();
    expect(res.body.data.recruitedAthletes).toBeInstanceOf(Array);
  });

  it('omits the email field from the public response (PII protection)', async () => {
    const res = await request(app).get('/api/coaches/1');
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('email');
  });

  it('returns 404 (not 500) for a well-formed id with no record', async () => {
    const res = await request(app).get('/api/coaches/999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 (not 500) for a non-numeric id', async () => {
    const res = await request(app).get('/api/coaches/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 400 for a negative id (parseIdParam rejects)', async () => {
    const res = await request(app).get('/api/coaches/-1');
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero (parseIdParam rejects non-positive)', async () => {
    const res = await request(app).get('/api/coaches/0');
    expect(res.status).toBe(400);
  });
});
