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

async function seedNotification(playerId: number, overrides: Partial<typeof schema.notifications.$inferInsert> = {}) {
  const [row] = await db.insert(schema.notifications).values({
    playerId,
    type: 'follow',
    actorName: 'Someone',
    read: false,
    ...overrides,
  }).returning();
  return row;
}

describe('GET /api/notifications', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('returns an empty list with unreadCount=0 for a new athlete', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([]);
    expect(res.body.unreadCount).toBe(0);
  });

  it('returns only the caller’s notifications and counts unread accurately', async () => {
    const me = await makeAthlete();
    const other = await makeAthlete();
    await seedNotification(me.id, { type: 'like', read: false });
    await seedNotification(me.id, { type: 'follow', read: true });
    await seedNotification(other.id, { type: 'comment', read: false });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    for (const n of res.body.notifications) {
      expect(n.playerId).toBe(me.id);
    }
    expect(res.body.unreadCount).toBe(1);
  });
});

describe('POST /api/notifications/mark-read', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/notifications/mark-read');
    expect(res.status).toBe(401);
  });

  it('marks all of the caller’s notifications as read, leaves others alone', async () => {
    const me = await makeAthlete();
    const other = await makeAthlete();
    await seedNotification(me.id, { read: false });
    await seedNotification(me.id, { read: false });
    await seedNotification(other.id, { read: false });

    const res = await request(app)
      .post('/api/notifications/mark-read')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const mine = await db.select().from(schema.notifications).where(eq(schema.notifications.playerId, me.id));
    for (const n of mine) expect(n.read).toBe(true);

    const [theirs] = await db.select().from(schema.notifications).where(eq(schema.notifications.playerId, other.id));
    expect(theirs.read).toBe(false);
  });
});

describe('POST /api/notifications/mark-read/:id', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/notifications/mark-read/1');
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non numeric notification id', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/notifications/mark-read/not-a-number')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(400);
  });

  it('marks the caller’s own notification as read', async () => {
    const athlete = await makeAthlete();
    const n = await seedNotification(athlete.id, { read: false });

    const res = await request(app)
      .post(`/api/notifications/mark-read/${n.id}`)
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`);
    expect(res.status).toBe(200);

    const [persisted] = await db.select().from(schema.notifications).where(eq(schema.notifications.id, n.id));
    expect(persisted.read).toBe(true);
  });

  // Documents a real, currently-present cross-tenant bug — see "Bugs revealed
  // by tests" in the PR description. The endpoint updates by notification id
  // only, with no ownership check, so any authenticated user can flip any
  // other user's notification's read flag. Asserting the current (buggy)
  // behavior so this test starts failing the moment the fix lands, which is
  // exactly when the assertion should be flipped to expect 403/404.
  it('TODO(security): cross-tenant mark-read currently succeeds (no ownership check)', async () => {
    const owner = await makeAthlete();
    const stranger = await makeAthlete();
    const n = await seedNotification(owner.id, { read: false });

    const res = await request(app)
      .post(`/api/notifications/mark-read/${n.id}`)
      .set('Authorization', `Bearer ${tokenFor(stranger, 'athlete')}`);
    // Once the route is fixed to scope by playerId, this should become 403 or
    // 404 and persisted.read should stay false.
    expect(res.status).toBe(200);
    const [persisted] = await db.select().from(schema.notifications).where(eq(schema.notifications.id, n.id));
    expect(persisted.read).toBe(true);
  });
});
