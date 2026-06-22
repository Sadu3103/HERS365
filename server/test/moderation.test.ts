import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

// Mock the moderation module: we don't want tests hitting the OpenAI API,
// and we need to control allow/deny per-test. By default each suite below
// returns { allowed: true } so existing flow-control tests stay green; the
// "blocks flagged content" cases override that for a single call.
vi.mock('../lib/moderation', () => ({
  moderateMessage: vi.fn(async () => ({ allowed: true } as const)),
  _resetModerationClientForTests: vi.fn(),
}));

// Re-import the mocked symbol so vi.mocked() has a typed handle on it.
import { moderateMessage } from '../lib/moderation';

const app = createApp();
beforeEach(async () => {
  await resetDb();
  vi.mocked(moderateMessage).mockReset();
  vi.mocked(moderateMessage).mockResolvedValue({ allowed: true });
});

async function approveContact(athleteId: number, coachId: number, parentId: number | null) {
  await db.insert(schema.messageRequests).values({
    athleteId, receiverId: coachId, content: 'intro', status: 'approved', parentId,
  });
}

async function openContact(coachId: number, athleteId: number) {
  // Helper that gets both parent-gate gates open for a coach/athlete pair
  // so the moderation step is the only thing left between the request and
  // the DB write.
  const parent = await makeParent();
  await linkParentChild(parent.id, athleteId);
  await approveContact(athleteId, coachId, parent.id);
}

describe('moderation gate: POST /api/messages', () => {
  it('calls moderateMessage with the message content before the DB write', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'great game last week' });

    expect(res.status).toBe(201);
    expect(moderateMessage).toHaveBeenCalledTimes(1);
    expect(moderateMessage).toHaveBeenCalledWith('great game last week');
  });

  it('rejects with 422 and does NOT save when moderateMessage returns flagged', async () => {
    vi.mocked(moderateMessage).mockResolvedValueOnce({
      allowed: false,
      reason: 'flagged:harassment',
    });
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'this content would be flagged in real life' });

    expect(res.status).toBe(422);
    // The error message must NOT leak the category the moderation API hit.
    expect(JSON.stringify(res.body)).not.toContain('harassment');
    expect(JSON.stringify(res.body)).not.toContain('flagged');

    // The whole point: no row landed in messages.
    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('does not call moderation when the parent gate has already blocked the request', async () => {
    // Saves on an OpenAI call and proves the order: moderation runs AFTER
    // the relational gates. A coach with no parent link should never trip
    // the moderation API for a message that would be 403'd anyway.
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    // No parent / no approval → 403 from the gate.

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'should never reach moderation' });

    expect(res.status).toBe(403);
    expect(moderateMessage).not.toHaveBeenCalled();
  });
});

describe('moderation gate: POST /api/coach/message/:playerId', () => {
  it('calls moderateMessage with the message body before the DB write', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'welcome to recruiting season' });

    expect([200, 201]).toContain(res.status);
    expect(moderateMessage).toHaveBeenCalledTimes(1);
    expect(moderateMessage).toHaveBeenCalledWith('welcome to recruiting season');
  });

  it('rejects with 422 and does NOT save when moderateMessage flags', async () => {
    vi.mocked(moderateMessage).mockResolvedValueOnce({
      allowed: false,
      reason: 'flagged:violence',
    });
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'would be flagged in real life' });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).not.toContain('violence');

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('does not call moderation when the parent gate has already blocked', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'should never reach moderation' });

    expect(res.status).toBe(403);
    expect(moderateMessage).not.toHaveBeenCalled();
  });
});
