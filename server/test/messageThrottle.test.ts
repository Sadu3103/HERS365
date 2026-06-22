import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';
import {
  _resetMessageRateLimitForTests,
  getMessageRateMax,
  getMessageRateWindowMs,
} from '../middleware/messageRateLimit';

// Both message routes hit the moderation API. Stub it to allow-all so the
// only failure mode under test is the throttle.
vi.mock('../lib/moderation', () => ({
  moderateMessage: vi.fn(async () => ({ allowed: true } as const)),
  _resetModerationClientForTests: vi.fn(),
}));

const app = createApp();

// Tighter limit for tests so we don't have to send 20+ requests per case.
// The limit getter reads process.env on every request, so this takes effect
// immediately without remounting the route.
const TEST_MAX = 3;
const ORIGINAL_ENV = { ...process.env };

beforeEach(async () => {
  process.env.MESSAGE_RATE_LIMIT_MAX = String(TEST_MAX);
  process.env.MESSAGE_RATE_LIMIT_WINDOW_MS = '60000';
  await resetDb();
  await _resetMessageRateLimitForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function approveContact(athleteId: number, coachId: number, parentId: number | null) {
  await db.insert(schema.messageRequests).values({
    athleteId, receiverId: coachId, content: 'intro', status: 'approved', parentId,
  });
}

async function openContact(coachId: number, athleteId: number) {
  const parent = await makeParent();
  await linkParentChild(parent.id, athleteId);
  await approveContact(athleteId, coachId, parent.id);
}

const coachAuth = (c: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(c, 'coach')}` });
const athleteAuth = (a: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(a, 'athlete')}` });

describe('messageRateLimit env wiring', () => {
  it('getters re-read env on every call (so tests and ops can change them live)', () => {
    expect(getMessageRateMax()).toBe(TEST_MAX);
    expect(getMessageRateWindowMs()).toBe(60_000);
    process.env.MESSAGE_RATE_LIMIT_MAX = '99';
    expect(getMessageRateMax()).toBe(99);
  });

  it('falls back to safe defaults when env is unset or junk', () => {
    delete process.env.MESSAGE_RATE_LIMIT_MAX;
    expect(getMessageRateMax()).toBe(20);
    process.env.MESSAGE_RATE_LIMIT_MAX = 'not-a-number';
    expect(getMessageRateMax()).toBe(20);
    process.env.MESSAGE_RATE_LIMIT_MAX = '-5';
    expect(getMessageRateMax()).toBe(20);
  });
});

describe('throttle on POST /api/messages', () => {
  it(`returns 429 with a generic body once a sender exceeds ${TEST_MAX} messages in the window`, async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    for (let i = 0; i < TEST_MAX; i++) {
      const ok = await request(app).post('/api/messages')
        .set(coachAuth(coach))
        .send({ partnerId: athlete.id, content: `msg ${i + 1}` });
      expect(ok.status).toBe(201);
    }

    const throttled = await request(app).post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: 'one too many' });

    expect(throttled.status).toBe(429);
    // Generic body — no window / counter math leaked.
    const body = JSON.stringify(throttled.body);
    expect(body).not.toContain('60000');
    expect(body).not.toContain('windowMs');
    expect(body).not.toContain('remaining');

    // Only the allowed sends should have landed.
    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(TEST_MAX);
  });

  it('429 fires BEFORE moderateMessage — throttled requests do not burn an OpenAI call', async () => {
    const { moderateMessage } = await import('../lib/moderation');
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    for (let i = 0; i < TEST_MAX; i++) {
      await request(app).post('/api/messages')
        .set(coachAuth(coach))
        .send({ partnerId: athlete.id, content: `m${i}` });
    }
    const callsBefore = vi.mocked(moderateMessage).mock.calls.length;

    const throttled = await request(app).post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: 'over' });

    expect(throttled.status).toBe(429);
    expect(vi.mocked(moderateMessage).mock.calls.length).toBe(callsBefore);
  });

  it('a different sender is unaffected by another sender hitting the limit', async () => {
    const coachA = await makeCoach();
    const coachB = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coachA.id, athlete.id);
    await openContact(coachB.id, athlete.id);

    // Coach A exhausts the budget.
    for (let i = 0; i < TEST_MAX; i++) {
      await request(app).post('/api/messages')
        .set(coachAuth(coachA))
        .send({ partnerId: athlete.id, content: `from A ${i}` });
    }
    const aThrottled = await request(app).post('/api/messages')
      .set(coachAuth(coachA))
      .send({ partnerId: athlete.id, content: 'A over' });
    expect(aThrottled.status).toBe(429);

    // Coach B is unaffected.
    const bOk = await request(app).post('/api/messages')
      .set(coachAuth(coachB))
      .send({ partnerId: athlete.id, content: 'from B' });
    expect(bOk.status).toBe(201);
  });
});

describe('throttle on POST /api/coach/message/:playerId', () => {
  it('counter is scoped per sender on the coach route too', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    for (let i = 0; i < TEST_MAX; i++) {
      const ok = await request(app).post(`/api/coach/message/${athlete.id}`)
        .set(coachAuth(coach))
        .send({ message: `m${i}` });
      expect([200, 201]).toContain(ok.status);
    }

    const throttled = await request(app).post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: 'too many' });
    expect(throttled.status).toBe(429);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(TEST_MAX);
  });

  it('counter is SHARED between the two routes for one sender (same userId key)', async () => {
    // Documents intentional behavior: the throttle key is the authenticated
    // userId, not the route. A coach can't sidestep the cap by alternating
    // between /api/messages and /api/coach/message/:id.
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    await request(app).post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: '1' });
    await request(app).post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: '2' });
    await request(app).post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: '3' });

    const throttled = await request(app).post(`/api/coach/message/${athlete.id}`)
      .set(coachAuth(coach))
      .send({ message: '4 should be throttled' });
    expect(throttled.status).toBe(429);
  });

  it('athletes and coaches each get their own bucket (role folded into key)', async () => {
    // A coach hitting the limit must not lock out the athlete on the same
    // thread. coach.id and athlete.id come from separate sequences and can
    // share a numeric value (both =1 after RESTART IDENTITY), so the bucket
    // key must include role.
    const coach = await makeCoach();
    const athlete = await makeAthlete();
    await openContact(coach.id, athlete.id);

    for (let i = 0; i < TEST_MAX; i++) {
      await request(app).post('/api/messages')
        .set(coachAuth(coach))
        .send({ partnerId: athlete.id, content: `c${i}` });
    }
    const coachThrottled = await request(app).post('/api/messages')
      .set(coachAuth(coach))
      .send({ partnerId: athlete.id, content: 'c over' });
    expect(coachThrottled.status).toBe(429);

    const athleteOk = await request(app).post('/api/messages')
      .set(athleteAuth(athlete))
      .send({ partnerId: coach.id, content: 'athlete reply' });
    expect(athleteOk.status).toBe(201);
  });
});
