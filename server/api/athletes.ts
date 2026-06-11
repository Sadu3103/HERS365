// @ts-nocheck
import express from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

// Public projection of a player row. Email/zip are contact info for a
// minor — never expose them on athlete endpoints.
function publicAthlete(p: Record<string, unknown>) {
  const { passwordHash, email, zipCode, ...safe } = p;
  return safe;
}

const router = express.Router();

// Fields a user is allowed to set on their own profile via PUT.
// Excludes id, email, passwordHash, subscriptionTier, verificationStatus.
const UPDATABLE_FIELDS = [
  'name', 'sport', 'position', 'age', 'state', 'city', 'zipCode',
  'school', 'gradYear', 'gpa', 'achievements', 'archetype',
  'segment', 'skillTier', 'privacySetting',
];
const INT_FIELDS = new Set(['age', 'gradYear']);

// GET /api/athletes — real DB list with optional filters
router.get('/', async (req, res) => {
  try {
    const { position, state, gradYear, limit = 20, offset = 0 } = req.query;
    const conditions = [];
    if (position && position !== 'All') conditions.push(eq(schema.players.position, String(position)));
    if (state && state !== 'All') conditions.push(eq(schema.players.state, String(state)));
    if (gradYear && gradYear !== 'All') conditions.push(eq(schema.players.gradYear, parseInt(String(gradYear), 10)));

    const rows = await db
      .select()
      .from(schema.players)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(Number(limit))
      .offset(Number(offset));

    const data = rows.map(publicAthlete);
    res.json({ success: true, data, pagination: { limit: Number(limit), offset: Number(offset) } });
  } catch (err) {
    console.error('[athletes/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch athletes' });
  }
});

// GET /api/athletes/:id - Get specific athlete profile (DB-backed)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid athlete id' });
    }

    const rows = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, id))
      .limit(1);

    const athlete = rows[0];
    if (!athlete) {
      return res.status(404).json({ success: false, error: 'Athlete not found' });
    }

    res.json({ success: true, data: publicAthlete(athlete) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch athlete profile' });
  }
});

// PUT /api/athletes/:id - Update own athlete profile (DB-backed, auth required)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid athlete id' });
    }

    // A user may only update their own profile
    if (Number(req.user?.id) !== id) {
      return res.status(403).json({ success: false, error: 'You can only edit your own profile' });
    }

    // Whitelist + coerce numeric fields
    const updates = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      let value = req.body[field];
      if (INT_FIELDS.has(field) && value !== null && value !== '') {
        const n = parseInt(value, 10);
        value = Number.isNaN(n) ? null : n;
      }
      updates[field] = value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided' });
    }

    const updated = await db
      .update(schema.players)
      .set(updates)
      .where(eq(schema.players.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ success: false, error: 'Athlete not found' });
    }

    res.json({ success: true, data: publicAthlete(updated[0]) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update athlete profile' });
  }
});

router.post('/:id/favorite', (_req, res) => {
  res.status(501).json({ success: false, error: 'Favorites not implemented yet' });
});

// In-memory saved schools store keyed by athlete id
const savedSchoolsStore: Record<string, number[]> = {};

// GET /api/athletes/:id/saved-schools
router.get('/:id/saved-schools', (req, res) => {
  try {
    const { id } = req.params;
    const saved = savedSchoolsStore[id] || [];
    res.json({ success: true, data: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch saved schools' });
  }
});

// POST /api/athletes/:id/saved-schools
router.post('/:id/saved-schools', (req, res) => {
  try {
    const { id } = req.params;
    const { schoolId } = req.body;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    if (!savedSchoolsStore[id]) savedSchoolsStore[id] = [];
    const sid = Number(schoolId);
    if (!savedSchoolsStore[id].includes(sid)) {
      savedSchoolsStore[id].push(sid);
    }

    res.json({ success: true, data: savedSchoolsStore[id] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save school' });
  }
});

// DELETE /api/athletes/:id/saved-schools/:schoolId
router.delete('/:id/saved-schools/:schoolId', (req, res) => {
  try {
    const { id, schoolId } = req.params;
    const sid = Number(schoolId);

    if (savedSchoolsStore[id]) {
      savedSchoolsStore[id] = savedSchoolsStore[id].filter(s => s !== sid);
    }

    res.json({ success: true, data: savedSchoolsStore[id] || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove saved school' });
  }
});

export { router as athletesRouter };