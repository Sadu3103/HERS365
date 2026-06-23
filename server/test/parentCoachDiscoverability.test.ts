import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app';
import { db } from '../db';
import * as schema from '../schema';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, makeParent, linkParentChild, tokenFor } from './helpers/fixtures';

// Parent-controlled coach discoverability.
//
// Behavior:
//   • PUT /api/parent/settings { profileVisibility: false } → for every
//     linked child, set players.preferences.coachDiscoverable = false
//     (merged into the existing JSON so other keys survive).
//   • GET /api/coach/players/search → hides athletes whose
//     preferences.coachDiscoverable === false. Unset OR true stays visible.
//   • GET /api/athletes/:id → coach viewer + coachDiscoverable === false
//     → 403. Owner viewers are unaffected.
//
// Default-preserving: an unset flag means discoverable, so existing
// athletes are unchanged.

const app = createApp();
beforeEach(resetDb);

const coachAuth = (c: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(c, 'coach')}` });
const athleteAuth = (a: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(a, 'athlete')}` });
const parentAuth = (p: { id: number; email: string; name: string | null }) =>
  ({ Authorization: `Bearer ${tokenFor(p, 'parent')}` });

async function getChildPrefs(playerId: number): Promise<Record<string, unknown>> {
  const [row] = await db
    .select({ preferences: schema.players.preferences })
    .from(schema.players)
    .where(eq(schema.players.id, playerId));
  return (row?.preferences as Record<string, unknown> | null) ?? {};
}

describe('PUT /api/parent/settings propagates profileVisibility to children', () => {
  it('writes preferences.coachDiscoverable=false on every linked child when false', async () => {
    const parent = await makeParent();
    const childA = await makeAthlete({ name: 'Linked A' });
    const childB = await makeAthlete({ name: 'Linked B' });
    const unrelated = await makeAthlete({ name: 'Unrelated' });
    await linkParentChild(parent.id, childA.id);
    await linkParentChild(parent.id, childB.id);

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });
    expect(res.status).toBe(200);

    expect(await getChildPrefs(childA.id)).toEqual({ coachDiscoverable: false });
    expect(await getChildPrefs(childB.id)).toEqual({ coachDiscoverable: false });
    // The unrelated athlete keeps its untouched (empty/default) prefs.
    expect(await getChildPrefs(unrelated.id)).toEqual({});
  });

  it('merges into existing child preferences instead of replacing them', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);
    // Seed an unrelated pref so we can prove the merge keeps it.
    await db
      .update(schema.players)
      .set({ preferences: { theme: 'dark', existingKey: 42 } })
      .where(eq(schema.players.id, child.id));

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });
    expect(res.status).toBe(200);

    const prefs = await getChildPrefs(child.id);
    expect(prefs).toEqual({ theme: 'dark', existingKey: 42, coachDiscoverable: false });
  });

  it('toggling back to true restores coachDiscoverable=true', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });
    expect((await getChildPrefs(child.id)).coachDiscoverable).toBe(false);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: true });
    expect((await getChildPrefs(child.id)).coachDiscoverable).toBe(true);
  });

  it('does NOT touch child preferences when the patch omits profileVisibility', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);
    await db
      .update(schema.players)
      .set({ preferences: { theme: 'dark' } })
      .where(eq(schema.players.id, child.id));

    const res = await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ smsAlerts: true });
    expect(res.status).toBe(200);

    // Child prefs are unchanged — no coachDiscoverable key snuck in.
    expect(await getChildPrefs(child.id)).toEqual({ theme: 'dark' });
  });
});

describe('GET /api/coach/players/search honors coachDiscoverable', () => {
  it('excludes children whose parent flipped profileVisibility=false', async () => {
    const parent = await makeParent();
    const hidden = await makeAthlete({ name: 'Hidden Hannah', position: 'QB' });
    const visible = await makeAthlete({ name: 'Visible Vera', position: 'QB' });
    const defaultUnset = await makeAthlete({ name: 'Default Dani', position: 'QB' });
    await linkParentChild(parent.id, hidden.id);

    // Parent flips visibility off — only `hidden` is affected.
    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });

    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search')
      .set(coachAuth(coach));
    expect(res.status).toBe(200);
    const names = res.body.players.map((p: { name: string }) => p.name);
    expect(names).not.toContain('Hidden Hannah');
    expect(names).toContain('Visible Vera');
    expect(names).toContain('Default Dani');
    // Sanity: the unrelated athletes carry the expected ids back.
    expect(res.body.players.find((p: { id: number }) => p.id === visible.id)).toBeTruthy();
    expect(res.body.players.find((p: { id: number }) => p.id === defaultUnset.id)).toBeTruthy();
  });

  it('toggling profileVisibility back to true restores the row in coach search', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Returning Rae', position: 'WR' });
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });

    const coach = await makeCoach();
    const hiddenRes = await request(app)
      .get('/api/coach/players/search')
      .set(coachAuth(coach));
    expect(hiddenRes.body.players.map((p: { name: string }) => p.name)).not.toContain('Returning Rae');

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: true });

    const restoredRes = await request(app)
      .get('/api/coach/players/search')
      .set(coachAuth(coach));
    expect(restoredRes.body.players.map((p: { name: string }) => p.name)).toContain('Returning Rae');
  });

  it('athletes with no flag set stay discoverable (default-preserving)', async () => {
    // No parent involvement at all — a freshly-seeded athlete must be
    // visible to coaches with the new code in place. This locks the
    // promise that the rollout doesn't accidentally hide existing rows.
    const a = await makeAthlete({ name: 'Default Donna', position: 'RB' });
    expect(await getChildPrefs(a.id)).toEqual({});

    const coach = await makeCoach();
    const res = await request(app)
      .get('/api/coach/players/search')
      .set(coachAuth(coach));
    expect(res.status).toBe(200);
    expect(res.body.players.map((p: { name: string }) => p.name)).toContain('Default Donna');
  });
});

describe('GET /api/athletes/:id honors coachDiscoverable for coach viewers', () => {
  it('returns 403 to a coach viewer when coachDiscoverable=false', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Hidden Holly' });
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });

    const coach = await makeCoach();
    const res = await request(app)
      .get(`/api/athletes/${child.id}`)
      .set(coachAuth(coach));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/forbidden/i);
  });

  it('the owner can still view their own hidden profile', async () => {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Owner Olivia' });
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });

    const res = await request(app)
      .get(`/api/athletes/${child.id}`)
      .set(athleteAuth(child));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(child.id);
  });

  it('athletes with no flag set are visible to coaches (default-preserving)', async () => {
    const a = await makeAthlete({ name: 'Default Dorothy' });
    const coach = await makeCoach();
    const res = await request(app)
      .get(`/api/athletes/${a.id}`)
      .set(coachAuth(coach));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(a.id);
  });

  it('toggling back to true restores coach visibility on the detail page', async () => {
    const parent = await makeParent();
    const child = await makeAthlete();
    await linkParentChild(parent.id, child.id);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });
    const coach = await makeCoach();
    expect((await request(app).get(`/api/athletes/${child.id}`).set(coachAuth(coach))).status).toBe(403);

    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: true });
    expect((await request(app).get(`/api/athletes/${child.id}`).set(coachAuth(coach))).status).toBe(200);
  });
});

// The coachDiscoverable gate must not be bypassable through the sibling
// /api/players routes in routes.ts. A coach blocked on /api/athletes/:id and
// /api/coach/players/:id could otherwise pull the same hidden minor's profile,
// stats, and highlight videos here.
describe('routes.ts /api/players endpoints honor coachDiscoverable', () => {
  async function hiddenChild() {
    const parent = await makeParent();
    const child = await makeAthlete({ name: 'Hidden Hana' });
    await linkParentChild(parent.id, child.id);
    await request(app)
      .put('/api/parent/settings')
      .set(parentAuth(parent))
      .send({ profileVisibility: false });
    return child;
  }

  it('blocks a coach on GET /api/players/:id for a hidden athlete', async () => {
    const child = await hiddenChild();
    const coach = await makeCoach();
    expect((await request(app).get(`/api/players/${child.id}`).set(coachAuth(coach))).status).toBe(403);
  });

  it('blocks a coach on GET /api/players/:id/stats for a hidden athlete', async () => {
    const child = await hiddenChild();
    const coach = await makeCoach();
    expect((await request(app).get(`/api/players/${child.id}/stats`).set(coachAuth(coach))).status).toBe(403);
  });

  it('blocks a coach on GET /api/players/:id/highlights for a hidden athlete', async () => {
    const child = await hiddenChild();
    const coach = await makeCoach();
    expect((await request(app).get(`/api/players/${child.id}/highlights`).set(coachAuth(coach))).status).toBe(403);
  });

  it('still serves a discoverable athlete to a coach on all three routes', async () => {
    const a = await makeAthlete({ name: 'Open Olivia' });
    const coach = await makeCoach();
    expect((await request(app).get(`/api/players/${a.id}`).set(coachAuth(coach))).status).toBe(200);
    expect((await request(app).get(`/api/players/${a.id}/stats`).set(coachAuth(coach))).status).toBe(200);
    expect((await request(app).get(`/api/players/${a.id}/highlights`).set(coachAuth(coach))).status).toBe(200);
  });

  it('does not block anonymous or owner access to a coach hidden athlete', async () => {
    const child = await hiddenChild();
    // coachDiscoverable is coach scoped: the public profile still resolves.
    expect((await request(app).get(`/api/players/${child.id}`)).status).toBe(200);
    expect((await request(app).get(`/api/players/${child.id}/stats`)).status).toBe(200);
    // The owner athlete is not a coach, so their own views are untouched.
    expect((await request(app).get(`/api/players/${child.id}`).set(athleteAuth(child))).status).toBe(200);
    expect((await request(app).get(`/api/players/${child.id}/highlights`).set(athleteAuth(child))).status).toBe(200);
  });
});
