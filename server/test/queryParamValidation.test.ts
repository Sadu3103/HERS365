// Sweeps the routes that previously surfaced 500s when a numeric query
// parameter was malformed. Each test confirms an explicit 400 + a still-working
// happy path with a valid numeric value.

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';

const app = createApp();
beforeEach(resetDb);

describe('GET /api/coach/players/search numeric filters', () => {
  it('returns 400 (not 500) when gradYear is non numeric', async () => {
    await makeAthlete({ name: 'Player', position: 'QB' });
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search?gradYear=abc')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(400);
  });

  it('still filters when gradYear is a valid integer', async () => {
    await makeAthlete({ name: 'Class 2026', position: 'QB', gradYear: 2026 });
    await makeAthlete({ name: 'Class 2027', position: 'QB', gradYear: 2027 });
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search?gradYear=2026')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.players).toHaveLength(1);
    expect(res.body.players[0].name).toBe('Class 2026');
  });

  it('returns 400 when minBreakoutScore is non numeric', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search?minBreakoutScore=abc')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(400);
  });

  it('returns 400 when minGpa is non numeric', async () => {
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search?minGpa=oops')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(400);
  });

  it('silently clamps a malformed limit param to the default rather than 500-ing', async () => {
    await makeAthlete({ name: 'A', position: 'QB' });
    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search?limit=abc')
      .set('Authorization', `Bearer ${tokenFor(coach, 'coach')}`);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(25);
  });
});

describe('GET /api/athletes numeric filters', () => {
  it('returns 400 (not 500) when gradYear is non numeric', async () => {
    const res = await request(app).get('/api/athletes?gradYear=abc');
    expect(res.status).toBe(400);
  });

  it('clamps a malformed limit to the default', async () => {
    const res = await request(app).get('/api/athletes?limit=abc');
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(20);
  });

  it('filters by gradYear when it is a valid integer', async () => {
    await makeAthlete({ name: 'Class 2026', gradYear: 2026 });
    await makeAthlete({ name: 'Class 2027', gradYear: 2027 });
    const res = await request(app).get('/api/athletes?gradYear=2026');
    expect(res.status).toBe(200);
    const names = res.body.data.map((a: { name: string }) => a.name);
    expect(names).toContain('Class 2026');
    expect(names).not.toContain('Class 2027');
  });
});

describe('GET /api/rankings limit param', () => {
  it('clamps a malformed limit to the default rather than 500-ing', async () => {
    await makeAthlete({ name: 'Rated', g5Rating: 5, privacySetting: 'public' });
    const res = await request(app).get('/api/rankings?limit=abc');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
