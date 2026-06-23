import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

// [F-37] POST /api/training/sessions — athletes log a personal session (real DB write).
describe('POST /api/training/sessions', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app).post('/api/training/sessions').send({ activity: 'Run', durationMinutes: 30 });
    expect(res.status).toBe(401);
  });

  it('rejects a non-athlete (coach) with 403', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/training/sessions')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ activity: 'Run', durationMinutes: 30 });
    expect(res.status).toBe(403);
  });

  it('logs a session and persists it to the DB', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/training/sessions')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ activity: 'Speed & agility', durationMinutes: 45, intensity: 'high', notes: 'PB on 40' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      playerId: athlete.id,
      activity: 'Speed & agility',
      durationMinutes: 45,
      intensity: 'high',
    });

    const rows = await db
      .select()
      .from(schema.athleteSessions)
      .where(eq(schema.athleteSessions.playerId, athlete.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].durationMinutes).toBe(45);
  });

  it('400s on missing activity, bad duration, and bad intensity', async () => {
    const athlete = await makeAthlete();
    const token = `Bearer ${tokenFor(athlete, 'athlete')}`;
    const noActivity = await request(app).post('/api/training/sessions').set('Authorization', token).send({ durationMinutes: 30 });
    expect(noActivity.status).toBe(400);
    const zero = await request(app).post('/api/training/sessions').set('Authorization', token).send({ activity: 'Run', durationMinutes: 0 });
    expect(zero.status).toBe(400);
    const tooLong = await request(app).post('/api/training/sessions').set('Authorization', token).send({ activity: 'Run', durationMinutes: 5000 });
    expect(tooLong.status).toBe(400);
    const badIntensity = await request(app).post('/api/training/sessions').set('Authorization', token).send({ activity: 'Run', durationMinutes: 30, intensity: 'extreme' });
    expect(badIntensity.status).toBe(400);
  });
});

// [F-37] GET /api/training/sessions/me — athlete reads back their own log.
describe('GET /api/training/sessions/me', () => {
  it("returns only the calling athlete's sessions, newest first", async () => {
    const a = await makeAthlete();
    const b = await makeAthlete();
    const tokenA = `Bearer ${tokenFor(a, 'athlete')}`;

    await request(app).post('/api/training/sessions').set('Authorization', tokenA)
      .send({ activity: 'Older', durationMinutes: 20, sessionDate: '2026-01-01T10:00:00Z' });
    await request(app).post('/api/training/sessions').set('Authorization', tokenA)
      .send({ activity: 'Newer', durationMinutes: 30, sessionDate: '2026-06-01T10:00:00Z' });
    await request(app).post('/api/training/sessions').set('Authorization', `Bearer ${tokenFor(b, 'athlete')}`)
      .send({ activity: 'Other athlete', durationMinutes: 15 });

    const res = await request(app).get('/api/training/sessions/me').set('Authorization', tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].activity).toBe('Newer');
    expect(res.body.data.every((s: any) => s.playerId === a.id)).toBe(true);
  });
});

// [F-37] PATCH /api/training/programs/:id/progress — update completion percentage.
describe('PATCH /api/training/programs/:id/progress', () => {
  it('rejects unauthenticated and non-athlete requests', async () => {
    const noauth = await request(app).patch('/api/training/programs/1/progress').send({ percentComplete: 50 });
    expect(noauth.status).toBe(401);
    const coach = await makeCoach();
    const asCoach = await request(app).patch('/api/training/programs/1/progress')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`).send({ percentComplete: 50 });
    expect(asCoach.status).toBe(403);
  });

  it('400s on out-of-range percentComplete', async () => {
    const athlete = await makeAthlete();
    const token = `Bearer ${tokenFor(athlete, 'athlete')}`;
    const low = await request(app).patch('/api/training/programs/1/progress').set('Authorization', token).send({ percentComplete: -5 });
    expect(low.status).toBe(400);
    const high = await request(app).patch('/api/training/programs/1/progress').set('Authorization', token).send({ percentComplete: 150 });
    expect(high.status).toBe(400);
  });

  it('upserts progress (creates then updates the same row)', async () => {
    const athlete = await makeAthlete();
    const token = `Bearer ${tokenFor(athlete, 'athlete')}`;

    const first = await request(app).patch('/api/training/programs/2/progress').set('Authorization', token).send({ percentComplete: 40 });
    expect(first.status).toBe(200);
    expect(first.body.data.percentComplete).toBe(40);

    const second = await request(app).patch('/api/training/programs/2/progress').set('Authorization', token).send({ percentComplete: 75 });
    expect(second.status).toBe(200);
    expect(second.body.data.percentComplete).toBe(75);

    // Upsert, not duplicate: exactly one row for (player, program).
    const rows = await db
      .select()
      .from(schema.athleteProgramProgress)
      .where(eq(schema.athleteProgramProgress.playerId, athlete.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].percentComplete).toBe(75);
  });
});
