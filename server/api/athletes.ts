
import express from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth, optionalAuth } from '../auth';

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

// Saved schools — /me routes resolve the athlete from the JWT and must be
// registered before /:id so "me" is not parsed as an id.

// GET /api/athletes/me/saved-schools
router.get('/me/saved-schools', requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select({ programId: schema.savedSchools.programId })
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, Number(req.user?.userId)));
    res.json({ success: true, data: rows.map(r => r.programId) });
  } catch (error) {
    console.error('[athletes/saved-schools/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch saved schools' });
  }
});

// POST /api/athletes/me/saved-schools
router.post('/me/saved-schools', requireAuth, async (req, res) => {
  try {
    const programId = parseInt(req.body?.schoolId, 10);
    if (Number.isNaN(programId)) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }
    const athleteId = Number(req.user?.userId);

    const existing = await db
      .select({ id: schema.savedSchools.id })
      .from(schema.savedSchools)
      .where(and(
        eq(schema.savedSchools.athleteId, athleteId),
        eq(schema.savedSchools.programId, programId),
      ))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(schema.savedSchools).values({ athleteId, programId });
    }

    const rows = await db
      .select({ programId: schema.savedSchools.programId })
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athleteId));
    res.json({ success: true, data: rows.map(r => r.programId) });
  } catch (error) {
    console.error('[athletes/saved-schools/add]', error);
    res.status(500).json({ success: false, error: 'Failed to save school' });
  }
});

// DELETE /api/athletes/me/saved-schools/:schoolId
router.delete('/me/saved-schools/:schoolId', requireAuth, async (req, res) => {
  try {
    const programId = parseInt(req.params.schoolId as string, 10);
    if (Number.isNaN(programId)) {
      return res.status(400).json({ success: false, error: 'Invalid school id' });
    }
    const athleteId = Number(req.user?.userId);

    await db
      .delete(schema.savedSchools)
      .where(and(
        eq(schema.savedSchools.athleteId, athleteId),
        eq(schema.savedSchools.programId, programId),
      ));

    const rows = await db
      .select({ programId: schema.savedSchools.programId })
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athleteId));
    res.json({ success: true, data: rows.map(r => r.programId) });
  } catch (error) {
    console.error('[athletes/saved-schools/remove]', error);
    res.status(500).json({ success: false, error: 'Failed to remove saved school' });
  }
});

// GET /api/athletes/:id - Get specific athlete profile (DB-backed)
router.get('/:id',optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
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

    //Privacy Check
    const isOwner = req.user?.userId ? Number(req.user.userId) === id : false;
    const isCoach = req.user?.role === 'coach';

    // Privacy enforcement
    const isPrivate = athlete.privacySetting === 'private';

    if (isPrivate && !isOwner && !isCoach) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    res.json({ success: true, data: publicAthlete(athlete) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch athlete profile' });
  }
});

// PUT /api/athletes/:id - Update own athlete profile (DB-backed, auth required)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid athlete id' });
    }

    // A user may only update their own profile
    if (Number(req.user?.id) !== id) {
      return res.status(403).json({ success: false, error: 'You can only edit your own profile' });
    }

    // Whitelist + coerce numeric fields
    const updates: Record<string,any> = {};
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

export { router as athletesRouter };