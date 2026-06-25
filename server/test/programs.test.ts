import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/programs', () => {
  it('returns the public program list without auth', async () => {
    const res = await request(app).get('/api/programs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBe(res.body.data.length);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('filters by state', async () => {
    const res = await request(app).get('/api/programs?state=Texas');
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.state).toBe('Texas');
    }
  });
});

describe('GET /api/programs/:id', () => {
  it('returns a single program for a valid id', async () => {
    const res = await request(app).get('/api/programs/1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.name).toBeTruthy();
  });

  it('returns 400 for a non numeric id (not 500)', async () => {
    const res = await request(app).get('/api/programs/not-a-number');
    expect(res.status).toBe(400);
  });

  it('returns 400 for a negative id', async () => {
    const res = await request(app).get('/api/programs/-3');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown program id', async () => {
    const res = await request(app).get('/api/programs/9999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/programs/me/applications', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/programs/me/applications');
    expect(res.status).toBe(401);
  });

  it('returns an empty list for a brand new athlete', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/programs/me/applications')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('returns only the caller’s own applications', async () => {
    const me = await makeAthlete();
    const other = await makeAthlete();
    await db.insert(schema.programApplications).values([
      { athleteId: me.id, programId: 1, position: 'QB' },
      { athleteId: other.id, programId: 2, position: 'WR' },
    ]);

    const res = await request(app)
      .get('/api/programs/me/applications')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].athleteId).toBe(me.id);
    expect(res.body.data[0].programId).toBe(1);
  });
});

describe('POST /api/programs/:id/applications', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/programs/1/applications')
      .send({ position: 'QB' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non numeric program id', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/programs/not-a-number/applications')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ position: 'QB' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown program id', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/programs/9999/applications')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ position: 'QB' });
    expect(res.status).toBe(404);
  });

  it('returns 400 when position is missing (validateBody)', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/programs/1/applications')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('happy path: inserts a row and returns it with programName', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/programs/1/applications')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ position: 'QB', note: 'Excited about this program' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.athleteId).toBe(athlete.id);
    expect(res.body.data.programId).toBe(1);
    expect(res.body.data.position).toBe('QB');
    expect(res.body.data.note).toBe('Excited about this program');
    expect(res.body.data.programName).toBeTruthy();

    const persisted = await db
      .select()
      .from(schema.programApplications)
      .where(and(
        eq(schema.programApplications.athleteId, athlete.id),
        eq(schema.programApplications.programId, 1),
      ));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].status).toBe('pending');
  });

  it('rejects a duplicate application with 409', async () => {
    const athlete = await makeAthlete();
    const token = tokenFor(athlete, 'athlete');
    const first = await request(app)
      .post('/api/programs/1/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 'QB' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/programs/1/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 'QB' });
    expect(second.status).toBe(409);

    const rows = await db
      .select()
      .from(schema.programApplications)
      .where(and(
        eq(schema.programApplications.athleteId, athlete.id),
        eq(schema.programApplications.programId, 1),
      ));
    expect(rows).toHaveLength(1);
  });
});
