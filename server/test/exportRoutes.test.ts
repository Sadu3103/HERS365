import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { db } from '../db';
import * as schema from '../schema';
import exportRouter from '../exportRoutes';
import { signToken } from '../auth';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, tokenFor } from './helpers/fixtures';

// exportRoutes is not wired into createApp() — it's mounted ad-hoc by admin
// tooling. Following the same pattern as eventRoutes.test.ts, we mount it on
// a minimal test app to exercise the real handler against the real db.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/export', exportRouter);
  return app;
}

const app = buildApp();
beforeEach(resetDb);

function adminToken() {
  // signToken accepts the admin role directly; the export routes only check
  // role === 'admin', they don't look the user up in any users table.
  return signToken({ userId: 1, email: 'admin@test.local', role: 'admin', name: 'Admin' });
}

describe('GET /export/players', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/export/players');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed Authorization header', async () => {
    const res = await request(app)
      .get('/export/players')
      .set('Authorization', 'NotBearer token');
    expect(res.status).toBe(401);
  });

  it('returns 403 for an authenticated athlete (non-admin)', async () => {
    const a = await makeAthlete();
    const res = await request(app)
      .get('/export/players')
      .set('Authorization', `Bearer ${tokenFor(a, 'athlete')}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('returns 403 for an authenticated coach', async () => {
    const c = await makeCoach();
    const res = await request(app)
      .get('/export/players')
      .set('Authorization', `Bearer ${tokenFor(c, 'coach')}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for an authenticated parent', async () => {
    const p = await makeParent();
    const res = await request(app)
      .get('/export/players')
      .set('Authorization', `Bearer ${tokenFor(p, 'parent')}`);
    expect(res.status).toBe(403);
  });

  it('returns CSV with only the header row when there are no players', async () => {
    const res = await request(app)
      .get('/export/players')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*hers365_players_export\.csv/);

    const lines = res.text.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('ID,Name,Position,Age,State,Parent Name,Parent Email,Parent Phone,Created At');
  });

  it('exports one CSV row per player when no payments exist (left join keeps player)', async () => {
    const a1 = await makeAthlete({ name: 'Alice Atlas', position: 'QB', age: 16, state: 'GA' });
    const a2 = await makeAthlete({ name: 'Bea Boone', position: 'WR', age: 15, state: 'TX' });

    const res = await request(app)
      .get('/export/players')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);

    const lines = res.text.split('\n');
    // header + 2 player rows
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('ID,Name');

    // Players are ordered by createdAt desc, so a2 (more recently inserted)
    // should come first. We assert on contents, not row order, to avoid
    // flake if the createdAt resolution ties.
    const body = lines.slice(1).join('\n');
    expect(body).toContain(`${a1.id},"Alice Atlas","QB",16,"GA"`);
    expect(body).toContain(`${a2.id},"Bea Boone","WR",15,"TX"`);
    // Empty parent cells must render as empty quoted strings, not "undefined".
    expect(body).not.toContain('undefined');
    expect(body).not.toContain('null');
  });

  it('joins parent contact info from payments and deduplicates a player with multiple payments', async () => {
    const a = await makeAthlete({ name: 'Cara Coal', position: 'DB', age: 17, state: 'FL' });

    // Two payments for the same player: the second carries parent contact.
    // The handler dedupes by player id and prefers the row with parentEmail.
    await db.insert(schema.payments).values({
      playerId: a.id,
      amount: 1000,
      parentName: null,
      parentEmail: null,
      parentPhone: null,
    });
    await db.insert(schema.payments).values({
      playerId: a.id,
      amount: 2000,
      parentName: 'Pat Coal',
      parentEmail: 'pat@coal.test',
      parentPhone: '555.0100',
    });

    const res = await request(app)
      .get('/export/players')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);

    const lines = res.text.split('\n');
    // 1 header + 1 player row (dedup must collapse the two payments).
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Cara Coal"');
    expect(lines[1]).toContain('"Pat Coal"');
    expect(lines[1]).toContain('"pat@coal.test"');
    expect(lines[1]).toContain('"555.0100"');
  });
});
