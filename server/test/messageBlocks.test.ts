import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

// Both message routes hit the moderation API. Stub it to allow-all so the
// only failure mode under test is the block gate.
vi.mock('../lib/moderation', () => ({
  moderateMessage: vi.fn(async () => ({ allowed: true } as const)),
  _resetModerationClientForTests: vi.fn(),
}));

const app = createApp();
beforeEach(resetDb);

async function approveContact(athleteId: number, coachId: number, parentId: number | null) {
  await db.insert(schema.messageRequests).values({
    athleteId, receiverId: coachId, content: 'intro', status: 'approved', parentId,
  });
}

async function openContact(coachId: number, athleteId: number) {
  // Drives the pair through every gate ABOVE the block check so the block
  // gate is the only thing left between the request and the DB write.
  const parent = await makeParent();
  await linkParentChild(parent.id, athleteId);
  await approveContact(athleteId, coachId, parent.id);
  return parent;
}

const coachAuth = (c: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(c, 'coach')}` });
const athleteAuth = (a: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(a, 'athlete')}` });

async function blockFromAthlete(athlete: any, coachId: number) {
  return request(app).post('/api/messages/block').set(athleteAuth(athlete)).send({ partnerId: coachId });
}
async function blockFromCoach(coach: any, athleteId: number) {
  return request(app).post('/api/messages/block').set(coachAuth(coach)).send({ partnerId: athleteId });
}
async function unblockFromAthlete(athlete: any, coachId: number) {
  return request(app).post('/api/messages/unblock').set(athleteAuth(athlete)).send({ partnerId: coachId });
}

// ─── P0 bug: coach route ignored eitherBlocked ──────────────────────────────
describe('safety: POST /api/coach/message/:playerId honors blocks', () => {
  it('returns 403 with zero rows when the athlete has blocked the coach', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const blockRes = await blockFromAthlete(athlete, coach.id);
    expect(blockRes.status).toBe(200);

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'should not land' });

    expect(res.status).toBe(403);
    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('returns 403 with zero rows when the coach has blocked the athlete', async () => {
    // Same gate, opposite direction — eitherBlocked is symmetric.
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const blockRes = await blockFromCoach(coach, athlete.id);
    expect(blockRes.status).toBe(200);

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'should not land' });

    expect(res.status).toBe(403);
    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });
});

// ─── First-ever coverage for /block, /unblock, /report ──────────────────────
describe('POST /api/messages/block enforcement on both routes', () => {
  it('blocks both directions on /api/messages after either party calls /block', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    await blockFromAthlete(athlete, coach.id);

    const fromCoach = await request(app)
      .post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: 'blocked direction' });
    expect(fromCoach.status).toBe(403);

    const fromAthlete = await request(app)
      .post('/api/messages')
      .set(athleteAuth(athlete))
      .send({ partnerId: coach.id, content: 'blocked direction' });
    expect(fromAthlete.status).toBe(403);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('blocks both directions on /api/coach/message/:playerId after a block', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    await blockFromAthlete(athlete, coach.id);

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'blocked' });
    expect(res.status).toBe(403);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('/block is idempotent: a second call does not error or duplicate the row', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const first = await blockFromAthlete(athlete, coach.id);
    const second = await blockFromAthlete(athlete, coach.id);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const rows = await db.select().from(schema.messageBlocks);
    expect(rows.length).toBe(1);
  });
});

describe('POST /api/messages/unblock restores both routes', () => {
  it('after unblock, both message routes work again (parent gate still satisfied)', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    await blockFromAthlete(athlete, coach.id);
    await unblockFromAthlete(athlete, coach.id);

    const a = await request(app)
      .post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: 'unblocked, /api/messages' });
    expect(a.status).toBe(201);

    const b = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'unblocked, coach route' });
    expect([200, 201]).toContain(b.status);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(2);
  });
});

describe('POST /api/messages/report', () => {
  it('persists a message_reports row with the reason and returns success', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    const res = await request(app)
      .post('/api/messages/report')
      .set(athleteAuth(athlete))
      .send({ partnerId: coach.id, reason: 'harassment', details: 'inappropriate comments' });

    expect(res.status).toBe(201);

    const reports = await db.select().from(schema.messageReports);
    expect(reports.length).toBe(1);
    expect(reports[0].reporterId).toBe(athlete.id);
    expect(reports[0].reporterRole).toBe('athlete');
    expect(reports[0].reportedId).toBe(coach.id);
    expect(reports[0].reportedRole).toBe('coach');
    expect(reports[0].reason).toBe('harassment');
    expect(reports[0].status).toBe('pending');
  });

  it('a report alone does NOT block messaging and does NOT delete past messages', async () => {
    // Documents the actual current behavior: /report is purely a moderation
    // signal. If product wants it to auto-block, that's a separate change —
    // pin the behavior here so we don't drift silently.
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    // Land one message so we can check it doesn't get scrubbed by /report.
    await db.insert(schema.messages).values({
      coachId: coach.id, athleteId: athlete.id, senderId: coach.id,
      senderType: 'coach', content: 'pre-report', read: false,
    });

    await request(app).post('/api/messages/report').set(athleteAuth(athlete))
      .send({ partnerId: coach.id, reason: 'harassment' });

    // Messaging still flows.
    const after = await request(app)
      .post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: 'post-report send' });
    expect(after.status).toBe(201);

    // Pre-report message is still in the table (soft-delete column null).
    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(2);
    for (const r of rows) expect(r.deletedAt).toBeNull();
  });

  it('rejects /report with an invalid reason as 400, not 500', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    const res = await request(app).post('/api/messages/report').set(athleteAuth(athlete))
      .send({ partnerId: coach.id, reason: 'not-a-real-category' });
    expect(res.status).toBe(400);
  });

  it('rejects /report with a non-numeric partner id as 400, not 500', async () => {
    const athlete = await makeAthlete();
    const res = await request(app).post('/api/messages/report').set(athleteAuth(athlete))
      .send({ partnerId: 'abc', reason: 'harassment' });
    expect(res.status).toBe(400);
  });
});

describe('authz: /block and /report can only be issued as the caller', () => {
  it('/block always writes the row with the caller as blocker — a coach cannot block on behalf of an athlete', async () => {
    // The route ignores any client-supplied "blockerId" and reads it from the
    // auth token. Verify that explicitly by sending one in the body.
    const coach = await makeCoach();
    const athlete = await makeAthlete();

    await request(app)
      .post('/api/messages/block')
      .set(coachAuth(coach))
      // Fake field — should be ignored. Block must be (coach → athlete).
      .send({ partnerId: athlete.id, blockerId: 99999 });

    const rows = await db.select().from(schema.messageBlocks);
    expect(rows.length).toBe(1);
    expect(rows[0].blockerId).toBe(coach.id);
    expect(rows[0].blockerRole).toBe('coach');
  });

  it('/block with a non-numeric partnerId returns 400, not 500', async () => {
    const coach = await makeCoach();
    const res = await request(app).post('/api/messages/block')
      .set(coachAuth(coach))
      .send({ partnerId: 'not-a-number' });
    expect(res.status).toBe(400);
  });

  it('/unblock with a non-numeric partnerId returns 400, not 500', async () => {
    const coach = await makeCoach();
    const res = await request(app).post('/api/messages/unblock')
      .set(coachAuth(coach))
      .send({ partnerId: 'not-a-number' });
    expect(res.status).toBe(400);
  });
});
