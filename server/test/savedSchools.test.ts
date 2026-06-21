import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/athletes/me/saved-schools', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/athletes/me/saved-schools');
    expect(res.status).toBe(401);
  });

  it('returns an empty list for a brand new athlete', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('returns only the caller’s saved schools', async () => {
    const me = await makeAthlete();
    const other = await makeAthlete();
    await db.insert(schema.savedSchools).values([
      { athleteId: me.id, programId: 1 },
      { athleteId: me.id, programId: 2 },
      { athleteId: other.id, programId: 3 },
    ]);

    const res = await request(app)
      .get('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sort()).toEqual([1, 2]);
  });
});

describe('POST /api/athletes/me/saved-schools', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/athletes/me/saved-schools')
      .send({ schoolId: 1 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when schoolId is missing (validateBody)', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non numeric schoolId', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ schoolId: 'not-a-number' });
    expect(res.status).toBe(400);
  });

  it('saves a school for the caller and returns the updated list', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ schoolId: 7 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([7]);

    const persisted = await db
      .select()
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athlete.id));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].programId).toBe(7);
  });

  it('does not duplicate when saving the same school twice', async () => {
    const athlete = await makeAthlete();
    const token = tokenFor(athlete, 'athlete');
    await request(app)
      .post('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolId: 7 });
    const res = await request(app)
      .post('/api/athletes/me/saved-schools')
      .set('Authorization', `Bearer ${token}`)
      .send({ schoolId: 7 });
    expect(res.status).toBe(200);

    const persisted = await db
      .select()
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athlete.id));
    expect(persisted).toHaveLength(1);
  });
});

describe('DELETE /api/athletes/me/saved-schools/:schoolId', () => {
  it('requires authentication', async () => {
    const res = await request(app).delete('/api/athletes/me/saved-schools/1');
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non numeric schoolId', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .delete('/api/athletes/me/saved-schools/not-a-number')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(400);
  });

  it('removes only the caller’s saved school for that program', async () => {
    const me = await makeAthlete();
    const other = await makeAthlete();
    await db.insert(schema.savedSchools).values([
      { athleteId: me.id, programId: 4 },
      { athleteId: me.id, programId: 5 },
      { athleteId: other.id, programId: 4 },
    ]);

    const res = await request(app)
      .delete('/api/athletes/me/saved-schools/4')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sort()).toEqual([5]);

    const mine = await db
      .select()
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, me.id));
    expect(mine.map(r => r.programId)).toEqual([5]);

    const theirs = await db
      .select()
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, other.id));
    expect(theirs.map(r => r.programId)).toEqual([4]);
  });

  it('is a no-op (still 200) when the school was never saved', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .delete('/api/athletes/me/saved-schools/9999')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
