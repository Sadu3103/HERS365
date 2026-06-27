import express from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { parseIdParam } from '../lib/parseIdParam';
import { fetchAndExtract, getAIClient } from '../lib/scraper';

const router = express.Router();

// GET /api/coaches/schools — all known programs from DB
router.get('/schools', async (_req, res) => {
  try {
    const teams = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        division: schema.teams.division,
        websiteUrl: schema.programDetails.websiteUrl,
        lastScrapedAt: schema.programDetails.lastScrapedAt,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));

    const staffCounts = await db
      .select({ teamId: schema.programStaff.teamId, count: sql<number>`count(*)::int` })
      .from(schema.programStaff)
      .groupBy(schema.programStaff.teamId);

    const countMap: Record<number, number> = {};
    for (const { teamId, count } of staffCounts) countMap[teamId] = count;

    res.json({ success: true, data: teams.map(t => ({ ...t, fetched: !!t.lastScrapedAt, staffCount: countMap[t.id] ?? 0 })) });
  } catch (error) {
    console.error('[coaches/schools]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schools' });
  }
});

// GET /api/coaches/directory — merged verified registered coaches + scraped staff
router.get('/directory', async (req, res) => {
  try {
    const { search } = req.query;

    const [registered, scraped] = await Promise.all([
      db.select({
        id: schema.coaches.id,
        name: schema.coaches.name,
        title: schema.coaches.division,
        email: schema.coaches.email,
        university: schema.coaches.university,
      }).from(schema.coaches).where(eq(schema.coaches.verifiedStatus, true)),
      db.select({
        id: schema.programStaff.id,
        name: schema.programStaff.name,
        title: schema.programStaff.title,
        email: schema.programStaff.email,
        university: schema.teams.name,
      }).from(schema.programStaff)
        .innerJoin(schema.teams, eq(schema.teams.id, schema.programStaff.teamId)),
    ]);

    const directory = [
      ...registered.map(c => ({ ...c, source: 'registered' as const, verified: true })),
      ...scraped.map(s => ({ ...s, source: 'scraped' as const, verified: false })),
    ];

    const filtered = search
      ? directory.filter(c =>
          c.name?.toLowerCase().includes(String(search).toLowerCase()) ||
          c.university?.toLowerCase().includes(String(search).toLowerCase()) ||
          (c.title || '').toLowerCase().includes(String(search).toLowerCase())
        )
      : directory;

    res.json({ success: true, data: filtered, total: filtered.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch directory' });
  }
});

// GET /api/coaches — all scraped staff from DB
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    const rows = await db
      .select({
        id: schema.programStaff.id,
        name: schema.programStaff.name,
        title: schema.programStaff.title,
        email: schema.programStaff.email,
        phone: schema.programStaff.phone,
        schoolId: schema.programStaff.teamId,
        school: schema.teams.name,
        scrapedAt: schema.programStaff.scrapedAt,
      })
      .from(schema.programStaff)
      .innerJoin(schema.teams, eq(schema.teams.id, schema.programStaff.teamId));

    const staff = search
      ? rows.filter(m =>
          m.name?.toLowerCase().includes(String(search).toLowerCase()) ||
          m.school?.toLowerCase().includes(String(search).toLowerCase()) ||
          m.title?.toLowerCase().includes(String(search).toLowerCase())
        )
      : rows;

    res.json({ success: true, data: staff, totalSchoolsWithData: new Set(rows.map(r => r.schoolId)).size });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch coaches' });
  }
});

// POST /api/coaches/fetch-live — scrape and persist staff for a school
router.post('/fetch-live', async (req, res) => {
  try {
    const { schoolId } = req.body;
    const teamId = parseIdParam(schoolId);
    if (teamId === null) return res.status(400).json({ success: false, error: 'schoolId must be a number' });

    const teamRows = await db.select({ id: schema.teams.id, name: schema.teams.name })
      .from(schema.teams).where(eq(schema.teams.id, teamId)).limit(1);
    if (!teamRows[0]) return res.status(404).json({ success: false, error: 'School not found' });

    const detailRows = await db.select({ websiteUrl: schema.programDetails.websiteUrl })
      .from(schema.programDetails).where(eq(schema.programDetails.teamId, teamId)).limit(1);
    const websiteUrl = detailRows[0]?.websiteUrl;
    if (!websiteUrl) return res.status(404).json({ success: false, error: 'No website URL for this school' });

    if (!getAIClient()) {
      return res.status(503).json({ success: false, error: 'No AI backend configured.' });
    }

    const result = await fetchAndExtract({ id: teamId, name: teamRows[0].name, website: websiteUrl });

    await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, teamId));
    if (result.staff.length > 0) {
      await db.insert(schema.programStaff).values(
        result.staff.map(m => ({ teamId, name: m.name, title: m.title, email: m.email ?? null, phone: m.phone ?? null, scrapedFrom: websiteUrl }))
      );
    }
    await db.update(schema.programDetails)
      .set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.programDetails.teamId, teamId));

    res.json({ success: true, data: { schoolId: teamId, schoolName: teamRows[0].name, staff: result.staff } });
  } catch (error) {
    console.error('[coaches/fetch-live]', error);
    res.status(500).json({ success: false, error: 'Live fetch failed' });
  }
});

// GET /api/coaches/:id — public profile of a registered coach
router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const [row] = await db
      .select({
        id: schema.coaches.id,
        name: schema.coaches.name,
        university: schema.coaches.university,
        division: schema.coaches.division,
        recruitingPositions: schema.coaches.recruitingPositions,
        recruitingStates: schema.coaches.recruitingStates,
        verifiedStatus: schema.coaches.verifiedStatus,
      })
      .from(schema.coaches)
      .where(eq(schema.coaches.id, id))
      .limit(1);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name ?? 'Unknown Coach',
        title: 'Head Coach',
        school: row.university ?? '',
        sport: 'Flag Football',
        division: row.division ?? '',
        recruitingPositions: row.recruitingPositions ?? '',
        recruitingStates: row.recruitingStates ?? '',
        bio: null,
        recruitedAthletes: [],
        verified: row.verifiedStatus ?? false,
      },
    });
  } catch (error) {
    console.error('[coaches/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch coach profile' });
  }
});

export { router as coachesRouter };
