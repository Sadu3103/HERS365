import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// The training router is mock-data backed (no DB, no auth). These tests
// exercise the real handler code paths — filters, id parsing, the not-found
// branch, and the mutation in PUT /sessions/:id/complete that mutates the
// shared in-memory program progress. Because the module state is shared
// across tests, the order-dependent ones live in their own describe block at
// the bottom and read state without resetting it.
const app = createApp();

describe('GET /api/training/programs', () => {
  it('returns the full list with default limit', async () => {
    const res = await request(app).get('/api/training/programs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
  });

  it('filters by category', async () => {
    const res = await request(app)
      .get('/api/training/programs')
      .query({ category: 'Position Specific' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((p: any) => p.category === 'Position Specific')).toBe(true);
  });

  it('filters by level', async () => {
    const res = await request(app)
      .get('/api/training/programs')
      .query({ level: 'Elite' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((p: any) => p.level === 'Elite')).toBe(true);
  });

  it('treats "All" as no filter for category and level', async () => {
    const baseline = await request(app).get('/api/training/programs');
    const allBoth = await request(app)
      .get('/api/training/programs')
      .query({ category: 'All', level: 'All' });
    expect(allBoth.status).toBe(200);
    expect(allBoth.body.data.length).toBe(baseline.body.data.length);
  });

  it('honors a numeric limit', async () => {
    const res = await request(app)
      .get('/api/training/programs')
      .query({ limit: '1' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('falls back to the default limit when limit is non-numeric', async () => {
    const res = await request(app)
      .get('/api/training/programs')
      .query({ limit: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/training/programs/:id', () => {
  it('returns 200 with the program for a known id', async () => {
    const res = await request(app).get('/api/training/programs/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('exercises');
  });

  it('returns 404 (not 500) for an unknown numeric id', async () => {
    const res = await request(app).get('/api/training/programs/999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 (not 500) for a non-numeric id — parseInt yields NaN and matches nothing', async () => {
    const res = await request(app).get('/api/training/programs/not-a-number');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/training/sessions', () => {
  it('returns the full list with default limit', async () => {
    const res = await request(app).get('/api/training/sessions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by programId', async () => {
    const res = await request(app)
      .get('/api/training/sessions')
      .query({ programId: '1' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((s: any) => s.programId === 1)).toBe(true);
  });

  it('returns 400 (not 500) when programId is not an integer', async () => {
    const res = await request(app)
      .get('/api/training/sessions')
      .query({ programId: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/integer/i);
  });

  it('filters by completed=true', async () => {
    const res = await request(app)
      .get('/api/training/sessions')
      .query({ completed: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((s: any) => s.completed === true)).toBe(true);
  });

  it('filters by completed=false', async () => {
    const res = await request(app)
      .get('/api/training/sessions')
      .query({ completed: 'false' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((s: any) => s.completed === false)).toBe(true);
  });
});

describe('GET /api/training/sessions/today', () => {
  it('returns 200 and a list (possibly empty) without crashing on date math', async () => {
    const res = await request(app).get('/api/training/sessions/today');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Any returned session must be both today and incomplete by contract.
    const today = new Date().toDateString();
    for (const s of res.body.data) {
      expect(new Date(s.date).toDateString()).toBe(today);
      expect(s.completed).toBe(false);
    }
  });
});

describe('GET /api/training/progress', () => {
  it('returns a well-shaped progress payload', async () => {
    const res = await request(app).get('/api/training/progress');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.programs).toEqual(expect.objectContaining({
      total: expect.any(Number),
      active: expect.any(Number),
      completed: expect.any(Number),
      averageProgress: expect.any(Number),
    }));
    expect(res.body.data.weekly).toEqual(expect.objectContaining({
      workoutsCompleted: expect.any(Number),
      totalTrainingTime: expect.any(Number),
      personalRecords: expect.any(Number),
      consistencyStreak: expect.any(Number),
    }));
    expect(Array.isArray(res.body.data.recentAchievements)).toBe(true);
  });
});

describe('POST /api/training/programs/:id/enroll', () => {
  it('returns 200 + message for a known program', async () => {
    const res = await request(app).post('/api/training/programs/1/enroll').send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/enrolled/i);
    expect(res.body.data.id).toBe(1);
  });

  it('returns 404 (not 500) for an unknown program', async () => {
    const res = await request(app).post('/api/training/programs/999999/enroll').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// PUT /sessions/:id/complete mutates the shared in-memory mockSessions /
// mockPrograms arrays, so it must run last in this file. Putting it in its
// own describe at the bottom keeps the contagion confined.
describe('PUT /api/training/sessions/:id/complete (mutates shared state)', () => {
  it('returns 404 (not 500) for an unknown session id', async () => {
    const res = await request(app).put('/api/training/sessions/999999/complete').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('marks the session completed and recomputes the parent program progress', async () => {
    const res = await request(app).put('/api/training/sessions/1/complete').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.completed).toBe(true);

    // The route recomputes completedSessions from mockSessions (count where
    // programId matches and completed=true) and then derives progress as
    // round(completed/total * 100). After this call session 1 (programId=1) is
    // completed, so the recomputed counts and ratio must match.
    const after = await request(app).get('/api/training/programs/1');
    const completed = after.body.data.completedSessions;
    const total = after.body.data.totalSessions;
    expect(completed).toBeGreaterThanOrEqual(1);
    expect(after.body.data.progress).toBe(Math.round((completed / total) * 100));
  });
});
