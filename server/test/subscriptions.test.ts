import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';

const app = createApp();

beforeEach(async () => {
  await resetDb();
  // resetDb truncates players (CASCADE), which clears player_subscriptions.
  // subscription_plans is independent; clear it explicitly so each test starts
  // with a known catalog.
  await db.delete(schema.subscriptionPlans);
});

async function seedPlan(overrides: Partial<typeof schema.subscriptionPlans.$inferInsert> = {}) {
  const [plan] = await db.insert(schema.subscriptionPlans).values({
    name: 'Pro',
    price: 1999,
    tierLevel: 'pro',
    ...overrides,
  }).returning();
  return plan;
}

describe('GET /api/subscription-plans', () => {
  it('returns plans ordered by price (no auth required)', async () => {
    await seedPlan({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    await seedPlan({ name: 'Free', price: 0, tierLevel: 'free' });
    await seedPlan({ name: 'Elite', price: 4999, tierLevel: 'elite' });

    const res = await request(app).get('/api/subscription-plans');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Free', 'Pro', 'Elite']);
  });
});

describe('POST /api/subscription-plans', () => {
  it('requires an admin token', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/subscription-plans')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    expect(res.status).toBe(403);
  });

  it('returns 401 without any token', async () => {
    const res = await request(app)
      .post('/api/subscription-plans')
      .send({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    const admin = await makeAthlete();
    const res = await request(app)
      .post('/api/subscription-plans')
      .set('Authorization', `Bearer ${tokenFor(admin, 'admin')}`)
      .send({ price: 1999 });
    expect(res.status).toBe(400);
  });

  it('creates a plan for an admin caller', async () => {
    const admin = await makeAthlete();
    const res = await request(app)
      .post('/api/subscription-plans')
      .set('Authorization', `Bearer ${tokenFor(admin, 'admin')}`)
      .send({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.name).toBe('Pro');

    const rows = await db.select().from(schema.subscriptionPlans);
    expect(rows).toHaveLength(1);
    expect(rows[0].tierLevel).toBe('pro');
  });
});

describe('GET /api/player-subscription/:playerId', () => {
  it('returns 400 for a non numeric id', async () => {
    const res = await request(app).get('/api/player-subscription/not-a-number');
    expect(res.status).toBe(400);
  });

  it('returns status:none for a player with no subscription', async () => {
    const athlete = await makeAthlete();
    const res = await request(app).get(`/api/player-subscription/${athlete.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'none', plan: null });
  });

  it('returns the subscription with the joined plan', async () => {
    const athlete = await makeAthlete();
    const plan = await seedPlan({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    await db.insert(schema.playerSubscriptions).values({
      playerId: athlete.id,
      planId: plan.id,
      status: 'active',
    });

    const res = await request(app).get(`/api/player-subscription/${athlete.id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.planId).toBe(plan.id);
    expect(res.body.plan?.id).toBe(plan.id);
    expect(res.body.plan?.name).toBe('Pro');
  });
});

describe('POST /api/player-subscription', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/player-subscription')
      .send({ playerId: 1, planId: 1 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when playerId or planId is missing', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post('/api/player-subscription')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ playerId: athlete.id });
    expect(res.status).toBe(400);
  });

  it('returns 403 when the JWT userId does not match the body playerId', async () => {
    const me = await makeAthlete();
    const other = await makeAthlete();
    const plan = await seedPlan();
    const res = await request(app)
      .post('/api/player-subscription')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`)
      .send({ playerId: other.id, planId: plan.id });
    expect(res.status).toBe(403);
  });

  it('happy path: inserts a subscription and bumps the player tier', async () => {
    const athlete = await makeAthlete();
    const plan = await seedPlan({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    const res = await request(app)
      .post('/api/player-subscription')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ playerId: athlete.id, planId: plan.id, stripeSubscriptionId: 'sub_xyz' });
    expect(res.status).toBe(200);
    expect(res.body.playerId).toBe(athlete.id);
    expect(res.body.planId).toBe(plan.id);
    expect(res.body.status).toBe('active');

    const [persisted] = await db
      .select()
      .from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, athlete.id));
    expect(persisted.stripeSubscriptionId).toBe('sub_xyz');

    const [updatedPlayer] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, athlete.id));
    expect(updatedPlayer.subscriptionTier).toBe('pro');
  });

  it('updates an existing subscription in place rather than duplicating', async () => {
    const athlete = await makeAthlete();
    const planA = await seedPlan({ name: 'Pro', price: 1999, tierLevel: 'pro' });
    const planB = await seedPlan({ name: 'Elite', price: 4999, tierLevel: 'elite' });
    const token = tokenFor(athlete, 'athlete');

    await request(app)
      .post('/api/player-subscription')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: athlete.id, planId: planA.id });

    const res = await request(app)
      .post('/api/player-subscription')
      .set('Authorization', `Bearer ${token}`)
      .send({ playerId: athlete.id, planId: planB.id, stripeSubscriptionId: 'sub_upgrade' });
    expect(res.status).toBe(200);

    const persisted = await db
      .select()
      .from(schema.playerSubscriptions)
      .where(eq(schema.playerSubscriptions.playerId, athlete.id));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].planId).toBe(planB.id);
    expect(persisted[0].stripeSubscriptionId).toBe('sub_upgrade');
  });
});
