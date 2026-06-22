import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/coach/board', () => {
  it('rejects unauthenticated callers with 401', async () => {
    const res = await request(app).get('/api/coach/board');
    expect(res.status).toBe(401);
  });

  it('rejects athlete-role callers with 403', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/coach/board')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(403);
  });

  it('rejects unverified coaches with 403', async () => {
    const coach = await makeCoach({ verifiedStatus: false });
    const res = await request(app)
      .get('/api/coach/board')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(403);
  });

  it('returns an empty board for a fresh verified coach', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/board')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.board).toEqual([]);
  });
});

describe('POST /api/coach/players/:id/save', () => {
  it('returns 400 for a non numeric id', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/coach/players/not-a-number/save')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('happy path: persists a prospect row with the default tier', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.board).toHaveLength(1);
    expect(res.body.board[0].athleteId).toBe(athlete.id);
    expect(res.body.board[0].tier).toBe('watching');

    const persisted = await db
      .select()
      .from(schema.coachProspects)
      .where(and(
        eq(schema.coachProspects.coachId, coach.id),
        eq(schema.coachProspects.athleteId, athlete.id),
      ));
    expect(persisted).toHaveLength(1);
  });

  it('updates the tier on a second save instead of duplicating', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const token = tokenFor(coach, 'coach');

    await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tier: 'watching' });

    const second = await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tier: 'top-target' });
    expect(second.status).toBe(200);

    const persisted = await db
      .select()
      .from(schema.coachProspects)
      .where(and(
        eq(schema.coachProspects.coachId, coach.id),
        eq(schema.coachProspects.athleteId, athlete.id),
      ));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].tier).toBe('top-target');
  });
});

describe('PATCH /api/coach/players/:id/notes', () => {
  it('persists notes scoped to the coach + athlete pair', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const token = tokenFor(coach, 'coach');

    await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const res = await request(app)
      .patch(`/api/coach/players/${athlete.id}/notes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Strong arm, recruit hard' });
    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(schema.coachProspects)
      .where(and(
        eq(schema.coachProspects.coachId, coach.id),
        eq(schema.coachProspects.athleteId, athlete.id),
      ));
    expect(row?.notes).toBe('Strong arm, recruit hard');
  });
});

describe('PATCH /api/coach/players/:id/tier', () => {
  it('rejects an unknown tier value', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({});

    const res = await request(app)
      .patch(`/api/coach/players/${athlete.id}/tier`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ tier: 'maybe-someday' });
    expect(res.status).toBe(400);
  });

  it('persists a valid tier change', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const token = tokenFor(coach, 'coach');

    await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const res = await request(app)
      .patch(`/api/coach/players/${athlete.id}/tier`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tier: 'offered' });
    expect(res.status).toBe(200);

    const [row] = await db
      .select()
      .from(schema.coachProspects)
      .where(and(
        eq(schema.coachProspects.coachId, coach.id),
        eq(schema.coachProspects.athleteId, athlete.id),
      ));
    expect(row?.tier).toBe('offered');
  });
});

describe('DELETE /api/coach/players/:id/save', () => {
  it('removes the prospect row for that coach + athlete pair only', async () => {
    const coach = await makeCoach();
    const otherCoach = await makeCoach();
    const athlete = await makeAthlete();

    await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({});
    await request(app)
      .post(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${tokenFor(otherCoach, 'coach')}`)
      .send({});

    const res = await request(app)
      .delete(`/api/coach/players/${athlete.id}/save`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);

    const mine = await db
      .select()
      .from(schema.coachProspects)
      .where(eq(schema.coachProspects.coachId, coach.id));
    const theirs = await db
      .select()
      .from(schema.coachProspects)
      .where(eq(schema.coachProspects.coachId, otherCoach.id));
    expect(mine).toHaveLength(0);
    expect(theirs).toHaveLength(1);
  });
});
