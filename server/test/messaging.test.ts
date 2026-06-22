import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

async function seedMessage(coachId: number, athleteId: number, content: string) {
  await db.insert(schema.messages).values({
    coachId, athleteId, senderId: coachId, senderType: 'coach', content, read: false,
  });
}

describe('messaging access', () => {
  it("a third party cannot read someone else's thread", async () => {
    const coach = await makeCoach();
    const athleteA = await makeAthlete();
    const athleteB = await makeAthlete();
    await seedMessage(coach.id, athleteA.id, 'private to A');

    const res = await request(app)
      .get(`/api/messages/conversations/${coach.id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(athleteB, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('private to A');
  });

  it('sending to a nonexistent partner is a 404, not a 500 or an orphan row', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: 99999, content: 'hello?' });
    expect(res.status).toBe(404);
  });

  it('sending to a non-numeric partner id is a 400, not a 500', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: 'abc', content: 'hello?' });
    expect(res.status).toBe(400);
  });

  it('responding with a non-numeric request id is a 400, not a 500', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .post('/api/messages/requests/not-a-number/respond')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(400);
  });

  it("cannot respond to another user's message request", async () => {
    const coach = await makeCoach();
    const otherCoach = await makeCoach();
    const athlete = await makeAthlete();
    const [reqRow] = await db.insert(schema.messageRequests).values({
      athleteId: athlete.id, receiverId: coach.id, content: 'hi', status: 'pending',
    }).returning();

    const res = await request(app)
      .post(`/api/messages/requests/${reqRow.id}/respond`)
      .set('Authorization', `Bearer ${tokenFor(otherCoach, 'coach')}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
  });
});
