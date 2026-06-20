import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

async function approveContact(athleteId: number, coachId: number, parentId: number | null) {
  await db.insert(schema.messageRequests).values({
    athleteId, receiverId: coachId, content: 'intro', status: 'approved', parentId,
  });
}

describe('parent-gating of the coach direct-message route', () => {
  it('blocks POST /api/coach/message/:playerId with no approved link', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'hi' });
    expect(res.status).toBe(403);
  });

  it('allows it once a parent-approved link exists', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const parent = await makeParent();
    await linkParentChild(parent.id, athlete.id);
    await approveContact(athlete.id, coach.id, parent.id);
    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'welcome' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('parent-gating of coach↔athlete messaging', () => {
  it('blocks a coach messaging an athlete with no approved link', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'hi kid' });
    expect(res.status).toBe(403);
  });

  it('blocks even when a request is approved but has no parent attached', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await approveContact(athlete.id, coach.id, null);
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'hi' });
    expect(res.status).toBe(403);
  });

  it('blocks again if the parent revokes the link after approving', async () => {
    // Coverage for the failure mode where an approved request is rolled back —
    // either the parent removes the link or the request status flips back to
    // pending/rejected. The gate must re-engage on the very next send.
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const parent = await makeParent();
    await linkParentChild(parent.id, athlete.id);
    await approveContact(athlete.id, coach.id, parent.id);

    // Sanity: messaging is open while the link is live.
    const before = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'hi while open' });
    expect(before.status).toBe(201);

    // Parent flips the approval back — same shape the parent route uses.
    await db
      .update(schema.messageRequests)
      .set({ status: 'rejected', parentId: null })
      .where(eq(schema.messageRequests.receiverId, coach.id));

    const after = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'should not land' });
    expect(after.status).toBe(403);
  });

  it('rejects send-message with no body content (Zod gate)', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id });
    expect(res.status).toBe(400);
  });

  it('allows messaging once a parent-approved link exists, both directions', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const parent = await makeParent();
    await linkParentChild(parent.id, athlete.id);
    await approveContact(athlete.id, coach.id, parent.id);

    const fromCoach = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'welcome to tryouts' });
    expect(fromCoach.status).toBe(201);

    const fromAthlete = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ partnerId: coach.id, content: 'thanks coach' });
    expect(fromAthlete.status).toBe(201);
  });
});
