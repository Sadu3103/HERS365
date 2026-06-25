import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetDb } from './helpers/db';
import { makeAthlete, makeCoach, tokenFor } from './helpers/fixtures';
import { parseIdParam } from '../lib/parseIdParam';

const app = createApp();
beforeEach(resetDb);

describe('parseIdParam helper', () => {
  it('accepts a positive integer string', () => {
    expect(parseIdParam('42')).toBe(42);
    expect(parseIdParam('1')).toBe(1);
  });

  it('accepts an already coerced positive integer number', () => {
    expect(parseIdParam(42)).toBe(42);
  });

  it('rejects non numeric, negative, zero, NaN, overflow, and bad number', () => {
    expect(parseIdParam('abc')).toBeNull();
    expect(parseIdParam('1.5')).toBeNull();
    expect(parseIdParam('-3')).toBeNull();
    expect(parseIdParam('0')).toBeNull();
    expect(parseIdParam('')).toBeNull();
    expect(parseIdParam('99999999999999999999')).toBeNull();
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam(null)).toBeNull();
    expect(parseIdParam(0)).toBeNull();
    expect(parseIdParam(-1)).toBeNull();
    expect(parseIdParam(1.5)).toBeNull();
    expect(parseIdParam(Number.NaN)).toBeNull();
    expect(parseIdParam(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

const BAD_IDS = ['abc', '-1', '99999999999999999999'];

describe('id route param validation returns 400, not 500', () => {
  it('GET /api/athletes/:id rejects malformed ids', async () => {
    for (const bad of BAD_IDS) {
      const res = await request(app).get(`/api/athletes/${bad}`);
      expect(res.status, `id=${bad}`).toBe(400);
    }
  });

  it('GET /api/coaches/:id rejects malformed ids', async () => {
    for (const bad of BAD_IDS) {
      const res = await request(app).get(`/api/coaches/${bad}`);
      expect(res.status, `id=${bad}`).toBe(400);
    }
  });

  it('GET /api/players/:id rejects malformed ids', async () => {
    for (const bad of BAD_IDS) {
      const res = await request(app).get(`/api/players/${bad}`);
      expect(res.status, `id=${bad}`).toBe(400);
    }
  });

  it('GET /api/coach/players/:id rejects malformed ids', async () => {
    const coach = await makeCoach();
    const token = tokenFor(coach, 'coach');
    for (const bad of BAD_IDS) {
      const res = await request(app)
        .get(`/api/coach/players/${bad}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status, `id=${bad}`).toBe(400);
    }
  });

  it('DELETE /api/messages/:id rejects malformed ids', async () => {
    const athlete = await makeAthlete();
    const token = tokenFor(athlete, 'athlete');
    for (const bad of BAD_IDS) {
      const res = await request(app)
        .delete(`/api/messages/${bad}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status, `id=${bad}`).toBe(400);
    }
  });
});
