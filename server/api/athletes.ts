// @ts-nocheck
import express from 'express';
import { and, eq, desc, gte, sql, countDistinct } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../middleware/requireAuth';
import jwt from 'jsonwebtoken';

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

    const data = rows.map(({ passwordHash, ...safe }) => safe);
    res.json({ success: true, data, pagination: { limit: Number(limit), offset: Number(offset) } });
  } catch (err) {
    console.error('[athletes/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch athletes' });
  }
});

// GET /api/athletes/:id - Get specific athlete profile (DB-backed)
// Fire-and-forget: if request comes from a verified coach JWT, record the profile view.
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

    // Non-blocking coach view tracking
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const role = decoded.role || decoded.type;
        if (role === 'coach' && decoded.id) {
          const coachId = Number(decoded.id);
          const coachName = decoded.name || decoded.university || 'Coach';
          // Fire-and-forget — don't await
          Promise.all([
            db.insert(schema.profileViews).values({ athleteId: id, viewerType: 'coach', viewerName: coachName, viewerCoachId: coachId }),
            db.insert(schema.notifications).values({ playerId: id, type: 'coach_interest', actorName: coachName }),
          ]).catch(() => {});
        }
      } catch { /* invalid token — just skip */ }
    }

    const { passwordHash, ...safe } = athlete;
    res.json({ success: true, data: safe });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch athlete profile' });
  }
});

// GET /api/athletes/:id/insights — profile view stats (auth, own profile only)
router.get('/:id/insights', requireAuth, async (req, res) => {
  try {
    const athleteId = parseInt(req.params.id, 10);
    if (isNaN(athleteId)) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    if (Number(req.user?.id) !== athleteId && Number(req.user?.userId) !== athleteId) {
      return res.status(403).json({ success: false, error: 'You can only view your own insights' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalViews, uniqueCoaches, recentViews] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.profileViews)
        .where(and(eq(schema.profileViews.athleteId, athleteId), gte(schema.profileViews.viewedAt, thirtyDaysAgo))),
      db.select({ count: sql<number>`count(distinct viewer_coach_id)::int` })
        .from(schema.profileViews)
        .where(and(eq(schema.profileViews.athleteId, athleteId), eq(schema.profileViews.viewerType, 'coach'))),
      db.select()
        .from(schema.profileViews)
        .where(eq(schema.profileViews.athleteId, athleteId))
        .orderBy(desc(schema.profileViews.viewedAt))
        .limit(10),
    ]);

    res.json({
      success: true,
      data: {
        totalViewsLast30Days: totalViews[0]?.count || 0,
        uniqueCoachViews: uniqueCoaches[0]?.count || 0,
        recentViews,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch insights' });
  }
});

// GET /api/athletes/:id/recommendations — program matches based on position
router.get('/:id/recommendations', requireAuth, async (req, res) => {
  try {
    const athleteId = parseInt(req.params.id, 10);
    if (isNaN(athleteId)) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    const playerRows = await db.select({ position: schema.players.position })
      .from(schema.players).where(eq(schema.players.id, athleteId)).limit(1);
    const position = playerRows[0]?.position;

    // Return all programs if no position, otherwise filter by rosterNeeds
    const programs = await db
      .select({
        id: schema.teams.id, name: schema.teams.name,
        division: schema.teams.division, conference: schema.teams.conference,
        city: schema.teams.city, state: schema.teams.state,
        hasScholarships: schema.programDetails.hasScholarships,
        rosterNeeds: schema.programDetails.rosterNeeds,
        websiteUrl: schema.programDetails.websiteUrl,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));

    const matches = position
      ? programs.filter(p => {
          const needs = p.rosterNeeds as any;
          if (!needs?.positions) return true; // no restriction known
          return (needs.positions as string[]).some(pos =>
            pos.toLowerCase().includes(position.toLowerCase()) || position.toLowerCase().includes(pos.toLowerCase())
          );
        })
      : programs;

    res.json({ success: true, data: matches, position: position || null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
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

    const { passwordHash, ...safe } = updated[0];
    res.json({ success: true, data: safe });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update athlete profile' });
  }
});

router.post('/:id/favorite', (_req, res) => {
  res.status(501).json({ success: false, error: 'Favorites not implemented yet' });
});

// GET /api/athletes/:id/saved-schools — DB-backed
router.get('/:id/saved-schools', async (req, res) => {
  try {
    const athleteId = parseInt(req.params.id, 10);
    if (isNaN(athleteId)) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    const rows = await db
      .select({ teamId: schema.savedSchools.teamId })
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athleteId));

    res.json({ success: true, data: rows.map(r => r.teamId) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch saved schools' });
  }
});

// POST /api/athletes/:id/saved-schools — DB-backed
router.post('/:id/saved-schools', async (req, res) => {
  try {
    const athleteId = parseInt(req.params.id, 10);
    if (isNaN(athleteId)) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    const { schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });

    const teamId = parseInt(String(schoolId), 10);
    if (isNaN(teamId)) return res.status(400).json({ success: false, error: 'schoolId must be a number' });

    // Upsert: ignore if already saved
    const existing = await db
      .select({ id: schema.savedSchools.id })
      .from(schema.savedSchools)
      .where(and(eq(schema.savedSchools.athleteId, athleteId), eq(schema.savedSchools.teamId, teamId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.savedSchools).values({ athleteId, teamId });
    }

    const rows = await db
      .select({ teamId: schema.savedSchools.teamId })
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athleteId));

    res.json({ success: true, data: rows.map(r => r.teamId) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save school' });
  }
});

// DELETE /api/athletes/:id/saved-schools/:schoolId — DB-backed
router.delete('/:id/saved-schools/:schoolId', async (req, res) => {
  try {
    const athleteId = parseInt(req.params.id, 10);
    const teamId = parseInt(req.params.schoolId, 10);
    if (isNaN(athleteId) || isNaN(teamId)) return res.status(400).json({ success: false, error: 'Invalid id' });

    await db
      .delete(schema.savedSchools)
      .where(and(eq(schema.savedSchools.athleteId, athleteId), eq(schema.savedSchools.teamId, teamId)));

    const rows = await db
      .select({ teamId: schema.savedSchools.teamId })
      .from(schema.savedSchools)
      .where(eq(schema.savedSchools.athleteId, athleteId));

    res.json({ success: true, data: rows.map(r => r.teamId) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove saved school' });
  }
});

// GET /api/athletes/:id/applications — athlete's recruiting applications with school names
router.get('/:id/applications', requireAuth, async (req, res) => {
  try {
    const athleteId = parseInt(req.params.id, 10);
    if (isNaN(athleteId)) return res.status(400).json({ success: false, error: 'Invalid athlete id' });

    if (Number(req.user?.id) !== athleteId && Number(req.user?.userId) !== athleteId) {
      return res.status(403).json({ success: false, error: 'You can only view your own applications' });
    }

    const rows = await db
      .select({
        id: schema.programApplications.id,
        programId: schema.programApplications.programId,
        programName: schema.teams.name,
        position: schema.programApplications.position,
        note: schema.programApplications.note,
        status: schema.programApplications.status,
        createdAt: schema.programApplications.createdAt,
      })
      .from(schema.programApplications)
      .leftJoin(schema.teams, eq(schema.teams.id, schema.programApplications.programId))
      .where(eq(schema.programApplications.athleteId, athleteId))
      .orderBy(desc(schema.programApplications.createdAt));

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

export { router as athletesRouter };