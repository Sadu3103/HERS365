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

async function seedPost(playerId: number, overrides: Partial<typeof schema.posts.$inferInsert> = {}) {
  const [row] = await db.insert(schema.posts).values({
    playerId,
    content: 'hello world',
    mediaUrl: null,
    mediaType: null,
    ...overrides,
  }).returning();
  return row;
}

describe('GET /api/posts', () => {
  it('is publicly accessible and returns an empty list when nothing is seeded', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns posts joined with player metadata, newest first', async () => {
    const a = await makeAthlete({ name: 'Alice', position: 'QB', school: 'Westview' });
    const b = await makeAthlete({ name: 'Bea', position: 'WR', school: 'Eastside' });
    const older = await seedPost(a.id, { content: 'older', category: 'training' });
    // Force a deterministic ordering rather than relying on insert timing.
    await db.update(schema.posts)
      .set({ createdAt: new Date('2024-01-01T00:00:00Z') })
      .where(eq(schema.posts.id, older.id));
    await seedPost(b.id, { content: 'newer', category: 'game' });

    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].content).toBe('newer');
    expect(res.body[0].playerName).toBe('Bea');
    expect(res.body[0].playerPosition).toBe('WR');
    expect(res.body[1].content).toBe('older');
    expect(res.body[1].playerName).toBe('Alice');
  });

  it('paginates with ?limit and ?before (keyset cursor)', async () => {
    const a = await makeAthlete({ name: 'Pag' });
    const p1 = await seedPost(a.id, { content: 'p1' });
    const p2 = await seedPost(a.id, { content: 'p2' });
    const p3 = await seedPost(a.id, { content: 'p3' });
    // newest-first ordering => p3, p2, p1

    const page1 = await request(app).get('/api/posts').query({ limit: 2 });
    expect(page1.status).toBe(200);
    expect(page1.body).toHaveLength(2);
    expect(page1.body[0].id).toBe(p3.id);
    expect(page1.body[1].id).toBe(p2.id);

    const lastId = page1.body[page1.body.length - 1].id;
    const page2 = await request(app).get('/api/posts').query({ limit: 2, before: lastId });
    expect(page2.status).toBe(200);
    expect(page2.body).toHaveLength(1);
    expect(page2.body[0].id).toBe(p1.id);
  });

  it('rejects a non-numeric before cursor with 400', async () => {
    const res = await request(app).get('/api/posts').query({ before: 'abc' });
    expect(res.status).toBe(400);
  });

  it('does not leak PII fields like email/passwordHash/dob via the join', async () => {
    const a = await makeAthlete({ email: 'leaky@test.local', dob: new Date('2010-01-01'), zipCode: '90001' });
    await seedPost(a.id, { content: 'hi' });
    const res = await request(app).get('/api/posts');
    const body = JSON.stringify(res.body);
    for (const needle of ['leaky@test.local', 'passwordHash', 'password_hash', '2010-01-01', '90001']) {
      expect(body, `leaked: ${needle}`).not.toContain(needle);
    }
  });
});

describe('POST /api/posts', () => {
  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content: 'hi' });
    expect(res.status).toBe(401);
  });

  it('inserts a post owned by the calling player and awards nilPoints', async () => {
    const athlete = await makeAthlete();
    const startPoints = athlete.nilPoints ?? 0;

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({ content: 'first post', mediaUrl: 'https://cdn/example.mp4', mediaType: 'video' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.playerId).toBe(athlete.id);
    expect(res.body.content).toBe('first post');

    const [persisted] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, res.body.id));
    expect(persisted.playerId).toBe(athlete.id);
    expect(persisted.content).toBe('first post');
    expect(persisted.mediaUrl).toBe('https://cdn/example.mp4');

    const [after] = await db
      .select({ nilPoints: schema.players.nilPoints })
      .from(schema.players)
      .where(eq(schema.players.id, athlete.id));
    expect(after.nilPoints).toBe(startPoints + 10);
  });

  it('always attributes a new post to the JWT user, even if the body lies about playerId', async () => {
    const me = await makeAthlete();
    const victim = await makeAthlete();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`)
      .send({ content: 'impersonating', playerId: victim.id });
    expect(res.status).toBe(200);
    expect(res.body.playerId).toBe(me.id);

    const victimsPosts = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.playerId, victim.id));
    expect(victimsPosts).toHaveLength(0);
  });
});
