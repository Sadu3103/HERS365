import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

// POST /api/coach/contact/:athleteId — creates a pending message_request so
// parents can approve/reject. This is the first step in the coach→athlete
// contact flow; actual messages require a parent-approved link.

const app = createApp();
beforeEach(resetDb);

const coachAuth = (c: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(c, 'coach')}` });
const athleteAuth = (a: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(a, 'athlete')}` });

async function pendingRequests(athleteId: number) {
  return db
    .select()
    .from(schema.messageRequests)
    .where(eq(schema.messageRequests.athleteId, athleteId));
}

describe('POST /api/coach/contact/:athleteId', () => {
  it('creates a pending message request visible to the parent', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete({ name: 'Target Tara' });

    const res = await request(app)
      .post(`/api/coach/contact/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'Hi Tara, interested in recruiting you.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');

    const rows = await pendingRequests(athlete.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].receiverId).toBe(coach.id);
    expect(rows[0].content).toBe('Hi Tara, interested in recruiting you.');
    expect(rows[0].status).toBe('pending');
    expect(rows[0].parentId).toBeNull();
  });

  it('is idempotent — re-submitting while pending returns 201 without duplicating', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();

    await request(app)
      .post(`/api/coach/contact/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'First attempt.' });

    const res = await request(app)
      .post(`/api/coach/contact/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'Second attempt.' });

    expect(res.status).toBe(201);
    const rows = await pendingRequests(athlete.id);
    expect(rows).toHaveLength(1);
  });

  it('blocks a coach from contacting a coachDiscoverable=false athlete', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Hidden Hana' });
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set({ Authorization: `Bearer ${tokenFor(parent, 'parent')}` })
      .send({ profileVisibility: false });

    const coach = await makeCoach();
    const res = await request(app)
      .post(`/api/coach/contact/${child.id}`)
      .set(coachAuth(coach))
      .send({ message: 'Trying to contact a hidden athlete.' });

    expect(res.status).toBe(403);
    const rows = await pendingRequests(child.id);
    expect(rows).toHaveLength(0);
  });

  it('returns 404 for a non-existent athlete', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/coach/contact/999999')
      .set(coachAuth(coach))
      .send({ message: 'Hello?' });
    expect(res.status).toBe(404);
  });

  it('rejects a non-coach token (athlete cannot initiate contact requests)', async () => {
    const athlete = await makeAthlete();
    const target = await makeAthlete({ name: 'Target' });
    const res = await request(app)
      .post(`/api/coach/contact/${target.id}`)
      .set(athleteAuth(athlete))
      .send({ message: 'Hello from athlete.' });
    expect(res.status).toBe(403);
  });

  it('rejects an empty message body', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app)
      .post(`/api/coach/contact/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: '   ' });
    expect(res.status).toBe(400);
  });
});
