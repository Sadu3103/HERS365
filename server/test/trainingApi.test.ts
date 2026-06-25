import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeTrainingPlan, makeDrill, tokenFor } from './helpers/fixtures';

// The training router is DB-backed. /programs maps training_plans into a stub
// DTO (category is always 'General', level always 'Intermediate', exercises
// always []). /sessions maps the drills table. /progress and /enroll require
// auth. Ids are validated with parseIdParam (400 on bad input, 404 on no row).
const app = createApp();
beforeEach(resetDb);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('GET /api/training/programs', () => {
  it('returns the seeded plans with the stub shape', async () => {
    await makeTrainingPlan({ goals: 'Speed' });
    await makeTrainingPlan({ goals: 'Strength' });
    const res = await request(app).get('/api/training/programs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('name');
  });

  it('treats "All" as no category filter', async () => {
    await makeTrainingPlan();
    await makeTrainingPlan();
    const baseline = await request(app).get('/api/training/programs');
    const all = await request(app).get('/api/training/programs').query({ category: 'All' });
    expect(all.status).toBe(200);
    expect(all.body.data.length).toBe(baseline.body.data.length);
  });

  it('filters out plans whose category does not match (stub category is "General")', async () => {
    await makeTrainingPlan();
    const res = await request(app).get('/api/training/programs').query({ category: 'Position Specific' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('honors a numeric limit', async () => {
    await makeTrainingPlan();
    await makeTrainingPlan();
    const res = await request(app).get('/api/training/programs').query({ limit: '1' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('falls back to the default limit when limit is non-numeric', async () => {
    await makeTrainingPlan();
    const res = await request(app).get('/api/training/programs').query({ limit: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/training/programs/:id', () => {
  it('returns 200 with the program for a known id', async () => {
    const plan = await makeTrainingPlan({ goals: 'Agility' });
    const res = await request(app).get(`/api/training/programs/${plan.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(plan.id);
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('exercises');
  });

  it('returns 404 (not 500) for an unknown numeric id', async () => {
    const res = await request(app).get('/api/training/programs/999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 for a non-numeric id (parseIdParam rejects)', async () => {
    const res = await request(app).get('/api/training/programs/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/training/sessions', () => {
  it('returns the seeded drills with the default limit', async () => {
    await makeDrill();
    const res = await request(app).get('/api/training/sessions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty when filtered by programId (drills have no program FK)', async () => {
    await makeDrill();
    const res = await request(app).get('/api/training/sessions').query({ programId: '1' });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('returns 400 when programId is not an integer', async () => {
    const res = await request(app).get('/api/training/sessions').query({ programId: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/integer/i);
  });

  it('filters by completed=true (stub drills are never completed → empty)', async () => {
    await makeDrill();
    const res = await request(app).get('/api/training/sessions').query({ completed: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.data.every((s: { completed: boolean }) => s.completed === true)).toBe(true);
  });
});

describe('GET /api/training/sessions/today', () => {
  it('returns 200 and a list of today/incomplete sessions', async () => {
    await makeDrill();
    const res = await request(app).get('/api/training/sessions/today');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const today = new Date().toDateString();
    for (const s of res.body.data) {
      expect(new Date(s.date).toDateString()).toBe(today);
      expect(s.completed).toBe(false);
    }
  });
});

describe('GET /api/training/progress', () => {
  it('401s without a token', async () => {
    const res = await request(app).get('/api/training/progress');
    expect(res.status).toBe(401);
  });

  it('returns a well-shaped progress payload for an authed player', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/training/progress')
      .set(auth(tokenFor(athlete, 'athlete')));
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
  it('401s without a token', async () => {
    const plan = await makeTrainingPlan();
    const res = await request(app).post(`/api/training/programs/${plan.id}/enroll`).send({});
    expect(res.status).toBe(401);
  });

  it('returns 200 + message for a known program when authed', async () => {
    const athlete = await makeAthlete();
    const plan = await makeTrainingPlan({ goals: 'Combine Prep' });
    const res = await request(app)
      .post(`/api/training/programs/${plan.id}/enroll`)
      .set(auth(tokenFor(athlete, 'athlete')))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/enrolled/i);
    expect(res.body.data.id).toBe(plan.id);
  });

  it('returns 404 for an unknown program when authed', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/training/programs/999999/enroll')
      .set(auth(tokenFor(athlete, 'athlete')))
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('PUT /api/training/sessions/:id/complete', () => {
  it('returns 404 for an unknown session id', async () => {
    const res = await request(app).put('/api/training/sessions/999999/complete').send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('marks a seeded drill completed', async () => {
    const drill = await makeDrill();
    const res = await request(app).put(`/api/training/sessions/${drill.id}/complete`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(drill.id);
    expect(res.body.data.completed).toBe(true);
  });

  it('returns 400 for a non-numeric session id', async () => {
    const res = await request(app).put('/api/training/sessions/not-a-number/complete').send({});
    expect(res.status).toBe(400);
  });
});
