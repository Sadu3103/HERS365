import express, { type Request } from 'express';
import { and, eq, gte, sql } from 'drizzle-orm';
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
  'segment', 'skillTier', 'privacySetting', 'profileImage',
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

// GET /api/athletes/me/insights — coach view stats for the authed athlete
router.get('/me/insights', requireAuth, async (req, res) => {
  try {
    const athleteId = Number(authUser(req)?.id);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalViews, uniqueCoaches, recent] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.profileViews)
        .where(and(eq(schema.profileViews.athleteId, athleteId), gte(schema.profileViews.viewedAt, since))),
      db.select({ count: sql<number>`count(distinct viewer_coach_id)::int` })
        .from(schema.profileViews)
        .where(and(eq(schema.profileViews.athleteId, athleteId), gte(schema.profileViews.viewedAt, since))),
      db.select({
          id: schema.profileViews.id,
          viewerType: schema.profileViews.viewerType,
          viewerName: schema.profileViews.viewerName,
          viewerCoachId: schema.profileViews.viewerCoachId,
          viewedAt: schema.profileViews.viewedAt,
          viewerUniversity: schema.coaches.university,
        })
        .from(schema.profileViews)
        .leftJoin(schema.coaches, eq(schema.coaches.id, schema.profileViews.viewerCoachId))
        .where(eq(schema.profileViews.athleteId, athleteId))
        .orderBy(sql`${schema.profileViews.viewedAt} desc`)
        .limit(10),
    ]);

    res.json({
      success: true,
      data: {
        totalViewsLast30d: totalViews[0]?.count ?? 0,
        uniqueCoachesLast30d: uniqueCoaches[0]?.count ?? 0,
        recentViews: recent,
      },
    });
  } catch (error) {
    console.error('[athletes/me/insights]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch insights' });
  }
});

// GET /api/athletes/me/recommendations — programs matching athlete's position
router.get('/me/recommendations', requireAuth, async (req, res) => {
  try {
    const athleteId = Number(authUser(req)?.id);
    const athlete = await db.select({ position: schema.players.position })
      .from(schema.players).where(eq(schema.players.id, athleteId)).limit(1);
    const position = athlete[0]?.position;

    const programs = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        division: schema.teams.division,
        state: schema.teams.state,
        rosterNeeds: schema.programDetails.rosterNeeds,
        hasScholarships: schema.programDetails.hasScholarships,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));

    const matches = position
      ? programs.filter(p => {
          const needs = p.rosterNeeds as string[] | null;
          return needs && needs.some(n => n.toLowerCase().includes(position.toLowerCase()));
        })
      : programs.slice(0, 10);

    res.json({ success: true, data: matches, position: position ?? null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
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

    // Fire-and-forget coach view tracking (u already declared above)
    if (u?.role === 'coach') {
      Promise.all([
        db.insert(schema.profileViews).values({
          athleteId: id,
          viewerType: 'coach',
          viewerName: typeof u.name === 'string' ? u.name : null,
          viewerCoachId: typeof u.id === 'number' ? u.id : null,
        }),
        db.insert(schema.notifications).values({
          playerId: id,
          type: 'coach_interest',
          actorName: typeof u.name === 'string' ? u.name : 'A coach',
        }),
      ]).catch(() => {});
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