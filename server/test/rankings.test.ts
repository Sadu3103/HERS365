// Regression: rankings board surfaced unrated test accounts at the top.
// Found by /qa on 2026-06-15.
// Report: .gstack/qa-reports/qa-report-localhost-2026-06-15.md
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/rankings', () => {
  it('excludes athletes with no g5Rating (unrated/test accounts)', async () => {
    await makeAthlete({ name: 'Rated Star', position: 'QB', g5Rating: 5, privacySetting: 'public' });
    await makeAthlete({ name: 'Unrated Ghost', g5Rating: null, privacySetting: 'public' });

    const res = await request(app).get('/api/rankings');
    expect(res.status).toBe(200);
    const names = res.body.data.map((p: { name: string }) => p.name);
    expect(names).toContain('Rated Star');
    expect(names).not.toContain('Unrated Ghost');
  });

  it('orders by rating descending and assigns sequential ranks', async () => {
    await makeAthlete({ name: 'Lower', g5Rating: 4, privacySetting: 'public' });
    await makeAthlete({ name: 'Higher', g5Rating: 5, privacySetting: 'public' });

    const res = await request(app).get('/api/rankings');
    expect(res.body.data[0].name).toBe('Higher');
    expect(res.body.data[0].rank).toBe(1);
    expect(res.body.data[0].rating).toBeGreaterThan(res.body.data[1].rating);
  });

  it('filters by position', async () => {
    await makeAthlete({ name: 'QB One', position: 'QB', g5Rating: 5, privacySetting: 'public' });
    await makeAthlete({ name: 'WR One', position: 'WR', g5Rating: 5, privacySetting: 'public' });

    const res = await request(app).get('/api/rankings?position=QB');
    const names = res.body.data.map((p: { name: string }) => p.name);
    expect(names).toEqual(['QB One']);
  });
});

describe('GET /api/rankings/:id numeric-id hardening', () => {
  it('returns 400 (not 500) for a non-numeric id', async () => {
    const res = await request(app).get('/api/rankings/not-a-number');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 400 for a negative id (parseIdParam rejects non-positive)', async () => {
    const res = await request(app).get('/api/rankings/-1');
    expect(res.status).toBe(400);
  });

  it('returns 404 (not 500) for a well-formed id with no player', async () => {
    const res = await request(app).get('/api/rankings/999999');
    expect(res.status).toBe(404);
  });
});
