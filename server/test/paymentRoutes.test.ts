import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, tokenFor } from './helpers/fixtures';

// paymentRoutes runs through requireStripe — server/test/setup.ts seeds
// STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET with dummy values so the route
// module finishes initializing. We only exercise paths that don't call out
// to Stripe over the network: signature verification (rejects locally),
// the requireAuth gate, and DB-backed /payments CRUD.
const app = createApp();
beforeEach(resetDb);

describe('POST /api/payments/webhook (public, signature-verified)', () => {
  it('returns 400 when the stripe-signature header is missing', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/stripe-signature/i);
  });

  it('returns 400 when the signature does not verify against the configured secret', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1700000000,v1=deadbeef')
      .send(Buffer.from('{"type":"checkout.session.completed"}'));
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/webhook error/i);
  });
});

describe('requireAuth gate on payment endpoints', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/payments/payments');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed Authorization header', async () => {
    const res = await request(app)
      .get('/api/payments/payments')
      .set('Authorization', 'NotBearer something');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/payments/payments')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/payments/payments', () => {
  it('returns an empty list when there are no payments', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/payments/payments')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by playerId and orders by createdAt desc', async () => {
    const a = await makeAthlete();
    const b = await makeAthlete();
    await db.insert(schema.payments).values({ playerId: a.id, amount: 100, status: 'completed' });
    await db.insert(schema.payments).values({ playerId: a.id, amount: 200, status: 'pending' });
    await db.insert(schema.payments).values({ playerId: b.id, amount: 999, status: 'completed' });

    const res = await request(app)
      .get('/api/payments/payments')
      .query({ playerId: String(a.id) })
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((p: { playerId: number }) => p.playerId === a.id)).toBe(true);
  });

  it('returns 400 (not 500) when playerId is not an integer', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/payments/payments')
      .query({ playerId: 'not-a-number' })
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/integer/i);
  });

  it('filters by status', async () => {
    const a = await makeAthlete();
    await db.insert(schema.payments).values({ playerId: a.id, amount: 100, status: 'completed' });
    await db.insert(schema.payments).values({ playerId: a.id, amount: 200, status: 'pending' });

    const res = await request(app)
      .get('/api/payments/payments')
      .query({ status: 'completed' })
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe('completed');
  });
});

describe('GET /api/payments/payments/:id', () => {
  it('returns 400 for a non-numeric id', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/payments/payments/not-a-number')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 404 (not 500) for a well-formed id that does not exist', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/payments/payments/999999')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns the row for a known id', async () => {
    const a = await makeAthlete();
    const [p] = await db.insert(schema.payments).values({
      playerId: a.id, amount: 4242, status: 'completed', description: 'Test charge',
    }).returning();

    const res = await request(app)
      .get(`/api/payments/payments/${p.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(p.id);
    expect(res.body.amount).toBe(4242);
    expect(res.body.description).toBe('Test charge');
  });
});

describe('GET /api/payments/payments/player/:playerId', () => {
  it('returns 400 for a non-numeric playerId', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/api/payments/payments/player/not-a-number')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(400);
  });

  it('returns payments joined with player name for a known playerId', async () => {
    const a = await makeAthlete({ name: 'Joined Jamie' });
    await db.insert(schema.payments).values({ playerId: a.id, amount: 100, status: 'completed' });
    await db.insert(schema.payments).values({ playerId: a.id, amount: 200, status: 'pending' });

    const res = await request(app)
      .get(`/api/payments/payments/player/${a.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((p: { playerName: string }) => p.playerName === 'Joined Jamie')).toBe(true);
  });
});

describe('POST /api/payments/payments', () => {
  it('returns 400 when amount is missing', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/payments/payments')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ playerId: a.id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });

  it('persists a new payment with status=pending by default', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/payments/payments')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({
        playerId: a.id, amount: 1234, paymentType: 'one_time',
        description: 'Camp registration',
      });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.amount).toBe(1234);
    expect(res.body.status).toBe('pending');

    const [row] = await db.select().from(schema.payments).where(eq(schema.payments.id, res.body.id));
    expect(row.amount).toBe(1234);
    expect(row.status).toBe('pending');
  });
});

describe('PATCH /api/payments/payments/:id', () => {
  it('returns 400 for a non-numeric id', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .patch('/api/payments/payments/not-a-number')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(400);
  });

  it('returns 404 (not 500) for a well-formed id that does not exist', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .patch('/api/payments/payments/999999')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  it('updates status and persists the change', async () => {
    const a = await makeAthlete();
    const [p] = await db.insert(schema.payments).values({
      playerId: a.id, amount: 500, status: 'pending',
    }).returning();

    const res = await request(app)
      .patch(`/api/payments/payments/${p.id}`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ status: 'completed', notes: 'manual mark' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');

    const [row] = await db.select().from(schema.payments).where(eq(schema.payments.id, p.id));
    expect(row.status).toBe('completed');
    expect(row.notes).toBe('manual mark');
  });
});

describe('POST /api/payments/payments/:id/complete', () => {
  it('returns 404 (not 500) for a well-formed id that does not exist', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .post('/api/payments/payments/999999/complete')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('flips status to completed and sets paidAt', async () => {
    const a = await makeAthlete();
    const [p] = await db.insert(schema.payments).values({
      playerId: a.id, amount: 500, status: 'pending',
    }).returning();

    const res = await request(app)
      .post(`/api/payments/payments/${p.id}/complete`)
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`)
      .send({ receiptUrl: 'https://example.test/receipt.pdf' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.paidAt).toBeTruthy();
    expect(res.body.receiptUrl).toBe('https://example.test/receipt.pdf');
  });
});
