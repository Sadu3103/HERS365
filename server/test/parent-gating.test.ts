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

// ─── Comprehensive safeguarding test for under-18 + no verified parent ──
//
// The platform's whole safeguarding promise: a coach can't reach a minor
// without a parent in the loop. This block walks the gate explicitly for an
// under-18 athlete (DOB makes them 15) across both message entry points and
// the three states that matter:
//
//   1. No parent linked at all                  → 403
//   2. Parent linked but contact not approved   → 403
//   3. Parent linked AND approved               → 201
//
// If any branch of this regresses, the platform's core safety claim is
// broken. These assertions are the load-bearing sentinels for that claim.

describe('safeguarding: under-18 athlete + no verified parent', () => {
  // Picked an explicit minor DOB so the test name and the data agree. The
  // server-side `hasParentApprovedLink` gate applies regardless of age, but
  // we encode "under 18 = the safeguarded case" in the fixture so future
  // age-aware logic doesn't change the expected outcomes here.
  const UNDER_18_DOB = new Date('2009-04-12');

  it('blocks POST /api/messages from a coach when the under-18 athlete has NO parent linked', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete({ dob: UNDER_18_DOB, age: 15 });

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'hey are you interested' });

    expect(res.status).toBe(403);

    // Belt-and-braces: a 403 with a DB row would still be a real leak even
    // if the response shape says blocked. Confirm nothing landed.
    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('blocks POST /api/coach/message/:playerId for the same case', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete({ dob: UNDER_18_DOB, age: 15 });

    const res = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'hey are you interested' });

    expect(res.status).toBe(403);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('blocks both routes when a parent EXISTS but has not approved contact yet', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete({ dob: UNDER_18_DOB, age: 15 });
    const parent = await makeParent();
    await linkParentChild(parent.id, athlete.id); // linked but no approval

    const a = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'still locked' });
    expect(a.status).toBe(403);

    const b = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'still locked' });
    expect(b.status).toBe(403);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('blocks both routes when an approved request exists WITHOUT a parent attached', async () => {
    // Mirrors the receiver-respond bug we explicitly protect against: a
    // non-parent receiver flipping a request to approved must not unlock
    // the gate.
    const coach = await makeCoach();
    const athlete = await makeAthlete({ dob: UNDER_18_DOB, age: 15 });
    await approveContact(athlete.id, coach.id, null); // parentId null

    const a = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'should not land' });
    expect(a.status).toBe(403);

    const b = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'should not land' });
    expect(b.status).toBe(403);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(0);
  });

  it('allows both routes only after the parent is linked AND has approved contact', async () => {
    const coach = await makeCoach();
    const athlete = await makeAthlete({ dob: UNDER_18_DOB, age: 15 });
    const parent = await makeParent();
    await linkParentChild(parent.id, athlete.id);
    await approveContact(athlete.id, coach.id, parent.id);

    const a = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ partnerId: athlete.id, content: 'happy to chat' });
    expect(a.status).toBe(201);

    const b = await request(app)
      .post(`/api/coach/message/${athlete.id}`)
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`)
      .send({ message: 'follow-up' });
    expect([200, 201]).toContain(b.status);

    const rows = await db.select().from(schema.messages);
    expect(rows.length).toBe(2);
  });
});

describe('POST /api/parent/requests/:id/respond numeric-id hardening', () => {
  it('returns 400 (not 500) for a non-numeric request id', async () => {
    const parent = await makeParent();
    const res = await request(app)
      .post('/api/parent/requests/not-a-number/respond')
      .set('Authorization', `Bearer ${tokenFor(parent, 'parent')}`)
      .send({ action: 'approve' });
    expect(res.status).toBe(400);
  });
});
