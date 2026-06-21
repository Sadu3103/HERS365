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

async function seedHighlight(playerId: number, overrides: Partial<typeof schema.playerHighlights.$inferInsert> = {}) {
  const [row] = await db.insert(schema.playerHighlights).values({
    playerId,
    videoUrl: 'https://cdn/clip.mp4',
    thumbnailUrl: 'https://cdn/thumb.jpg',
    category: 'game',
    season: '2025',
    ...overrides,
  }).returning();
  return row;
}

describe('GET /api/players/:id/highlights', () => {
  it('requires authentication', async () => {
    const athlete = await makeAthlete();
    const res = await request(app).get(`/api/players/${athlete.id}/highlights`);
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non numeric player id', async () => {
    const viewer = await makeAthlete();
    const res = await request(app)
      .get('/api/players/not-a-number/highlights')
      .set('Authorization', `Bearer ${tokenFor(viewer, 'athlete')}`);
    expect(res.status).toBe(400);
  });

  it('caps free-tier callers at 3 highlights for a free-tier athlete', async () => {
    const free = await makeAthlete(); // subscriptionTier defaults to 'free'
    for (let i = 0; i < 5; i++) {
      await seedHighlight(free.id, { videoUrl: `https://cdn/${i}.mp4` });
    }

    const viewer = await makeAthlete();
    const res = await request(app)
      .get(`/api/players/${free.id}/highlights`)
      .set('Authorization', `Bearer ${tokenFor(viewer, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    for (const h of res.body) {
      expect(h.locked).toBe(false);
    }
  });

  it('returns all highlights for a paid-tier athlete', async () => {
    const pro = await makeAthlete({ subscriptionTier: 'pro' });
    for (let i = 0; i < 5; i++) {
      await seedHighlight(pro.id, { videoUrl: `https://cdn/pro-${i}.mp4` });
    }

    const viewer = await makeAthlete();
    const res = await request(app)
      .get(`/api/players/${pro.id}/highlights`)
      .set('Authorization', `Bearer ${tokenFor(viewer, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
  });

  it('returns an empty list for a player with no highlights', async () => {
    const athlete = await makeAthlete();
    const viewer = await makeAthlete();
    const res = await request(app)
      .get(`/api/players/${athlete.id}/highlights`)
      .set('Authorization', `Bearer ${tokenFor(viewer, 'athlete')}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/players/:id/highlights', () => {
  it('requires authentication', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post(`/api/players/${athlete.id}/highlights`)
      .send({ videoUrl: 'https://cdn/a.mp4' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non numeric player id', async () => {
    const me = await makeAthlete();
    const res = await request(app)
      .post('/api/players/not-a-number/highlights')
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`)
      .send({ videoUrl: 'https://cdn/a.mp4' });
    expect(res.status).toBe(400);
  });

  it('blocks one user from posting a highlight to another user with 403', async () => {
    const me = await makeAthlete();
    const victim = await makeAthlete();
    const res = await request(app)
      .post(`/api/players/${victim.id}/highlights`)
      .set('Authorization', `Bearer ${tokenFor(me, 'athlete')}`)
      .send({ videoUrl: 'https://cdn/forged.mp4', category: 'game', season: '2025' });
    expect(res.status).toBe(403);

    const victimsHighlights = await db
      .select()
      .from(schema.playerHighlights)
      .where(eq(schema.playerHighlights.playerId, victim.id));
    expect(victimsHighlights).toHaveLength(0);
  });

  it('happy path: inserts a highlight for the calling player', async () => {
    const athlete = await makeAthlete();
    const res = await request(app)
      .post(`/api/players/${athlete.id}/highlights`)
      .set('Authorization', `Bearer ${tokenFor(athlete, 'athlete')}`)
      .send({
        videoUrl: 'https://cdn/clip.mp4',
        thumbnailUrl: 'https://cdn/thumb.jpg',
        category: 'training',
        season: '2025',
      });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.playerId).toBe(athlete.id);
    expect(res.body.videoUrl).toBe('https://cdn/clip.mp4');

    const persisted = await db
      .select()
      .from(schema.playerHighlights)
      .where(eq(schema.playerHighlights.playerId, athlete.id));
    expect(persisted).toHaveLength(1);
    expect(persisted[0].category).toBe('training');
  });
});
