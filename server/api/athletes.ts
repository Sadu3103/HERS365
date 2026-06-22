import express, { type Request } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth, optionalAuth, type TokenPayload } from '../auth';
import { publicPlayerView } from '../lib/playerPrivacy';
import { validateBody, validateParams } from '../middleware/validate';
import {
  savedSchoolBody,
  savedSchoolParams,
  athletePutBody,
} from '../middleware/safetySchemas';
import { parseIdParam } from '../lib/parseIdParam';
import { parseIntQuery, clampIntQuery } from '../lib/queryParam';

// Cross-user view: strips email/phone/dob/zip/pendingParentEmail/passwordHash
// per the directive 1 rule "minor PII never leaves cross-user endpoints."
const publicAthlete = publicPlayerView;

const router = express.Router();

// Express's Request type doesn't know about the user attached by requireAuth/
// optionalAuth. Reading through this helper keeps a single typed boundary
// instead of sprinkling `as any` at every call site.
function authUser(req: Request): TokenPayload | undefined {
  return (req as Request & { user?: TokenPayload }).user;
}

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
    const { position, state, gradYear, limit, offset } = req.query;
    const conditions = [];
    if (position && position !== 'All') conditions.push(eq(schema.players.position, String(position)));
    if (state && state !== 'All') conditions.push(eq(schema.players.state, String(state)));
    if (gradYear && gradYear !== 'All') {
      const n = parseIntQuery(gradYear);
      if (n === null) return res.status(400).json({ success: false, error: 'gradYear must be an integer' });
      conditions.push(eq(schema.players.gradYear, n));
    }

    const limitNum = clampIntQuery(limit, { default: 20, min: 1, max: 100 });
    const offsetNum = clampIntQuery(offset, { default: 0, min: 0, max: 100000 });

    const rows = await db
      .select()
      .from(schema.players)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(limitNum)
      .offset(offsetNum);

    const data = rows.map(publicAthlete);
    res.json({ success: true, data, pagination: { limit: limitNum, offset: offsetNum } });
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
      .where(eq(schema.savedSchools.athleteId, Number(authUser(req)?.id)));
    res.json({ success: true, data: rows.map(r => r.programId) });
  } catch (error) {
    console.error('[athletes/saved-schools/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch saved schools' });
  }
});

// POST /api/athletes/me/saved-schools
router.post('/me/saved-schools', requireAuth, validateBody(savedSchoolBody), async (req, res) => {
  try {
    const programId = parseIdParam(req.body?.schoolId);
    if (programId === null) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }
    const athleteId = Number(authUser(req)?.id);

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
router.delete('/me/saved-schools/:schoolId', requireAuth, validateParams(savedSchoolParams), async (req, res) => {
  try {
    const programId = parseIdParam(req.params.schoolId);
    if (programId === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const athleteId = Number(authUser(req)?.id);

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
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
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
    const u = authUser(req);
    const isOwner = u?.userId ? Number(u.userId) === id : false;
    const isCoach = u?.role === 'coach';

    // Privacy enforcement
    const isPrivate = athlete.privacySetting === 'private';

    if (isPrivate && !isOwner && !isCoach) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    // Parent-controlled coach discoverability. When the linked parent flips
    // profileVisibility=false the athlete's preferences.coachDiscoverable is
    // set to false (see server/api/parent.ts PUT /settings). Unset or true
    // keeps the existing behavior. Coaches are blocked; the owner and the
    // linked parent are not (this branch only runs for the coach role).
    const prefs = (athlete.preferences ?? {}) as Record<string, unknown>;
    if (isCoach && prefs.coachDiscoverable === false) {
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
router.put('/:id', requireAuth, validateBody(athletePutBody), async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    // A user may only update their own profile
    if (Number(authUser(req)?.id) !== id) {
      return res.status(403).json({ success: false, error: 'You can only edit your own profile' });
    }

    // Whitelist + coerce numeric fields
    const updates: Record<string, unknown> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      let value = req.body[field];
      if (INT_FIELDS.has(field) && value !== null && value !== '') {
        const n = parseInt(String(value), 10);
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