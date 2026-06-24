import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import eventRouter from '../eventRoutes';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

// eventRoutes is not yet wired into createApp(). To exercise the real router
// code end-to-end (real handlers, real db) we mount it on a small test app
// with the same json middleware the prod app would apply.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventRouter);
  return app;
}

const app = buildApp();
beforeEach(resetDb);

async function seedEvent(overrides: Partial<typeof schema.events.$inferInsert> = {}) {
  const [row] = await db.insert(schema.events).values({
    name: 'Combine',
    date: new Date('2026-07-04'),
    location: 'Atlanta',
    ...overrides,
  }).returning();
  return row;
}

describe('GET /api/events', () => {
  it('returns an empty list when there are no events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns events ordered by date ascending', async () => {
    await seedEvent({ name: 'Later',   date: new Date('2026-12-01') });
    await seedEvent({ name: 'Earlier', date: new Date('2026-07-04') });
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Earlier');
    expect(res.body[1].name).toBe('Later');
  });
});

describe('POST /api/events/register', () => {
  it('registers a player for an event and increments participant_count', async () => {
    const ev = await seedEvent({ participantCount: 3 });
    const athlete = await makeAthlete();

    const res = await request(app)
      .post('/api/events/register')
      .send({ eventId: ev.id, playerId: athlete.id });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/registered/i);

    const regs = await db
      .select()
      .from(schema.eventRegistrations)
      .where(eq(schema.eventRegistrations.eventId, ev.id));
    expect(regs).toHaveLength(1);
    expect(regs[0].playerId).toBe(athlete.id);

    const [after] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, ev.id));
    expect(after.participantCount).toBe(4);
  });

  it('returns 400 when the same player tries to register twice', async () => {
    const ev = await seedEvent({ participantCount: 0 });
    const athlete = await makeAthlete();
    await db.insert(schema.eventRegistrations).values({ eventId: ev.id, playerId: athlete.id });

    const res = await request(app)
      .post('/api/events/register')
      .send({ eventId: ev.id, playerId: athlete.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);

    // The duplicate attempt must NOT inflate participant_count.
    const [after] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, ev.id));
    expect(after.participantCount).toBe(0);
  });

  it('keeps registrations scoped per player (same event, different players is allowed)', async () => {
    const ev = await seedEvent({ participantCount: 0 });
    const a = await makeAthlete();
    const b = await makeAthlete();

    const r1 = await request(app)
      .post('/api/events/register')
      .send({ eventId: ev.id, playerId: a.id });
    const r2 = await request(app)
      .post('/api/events/register')
      .send({ eventId: ev.id, playerId: b.id });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const regs = await db
      .select()
      .from(schema.eventRegistrations)
      .where(eq(schema.eventRegistrations.eventId, ev.id));
    expect(regs).toHaveLength(2);

    const [after] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, ev.id));
    expect(after.participantCount).toBe(2);
  });
});
