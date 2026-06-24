// @ts-nocheck
import express from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { fetchAndExtract, getAIClient } from '../lib/scraper';

const router = express.Router();

// GET /api/coaches/schools — list of known schools from DB
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
      .select({
        teamId: schema.programStaff.teamId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.programStaff)
      .groupBy(schema.programStaff.teamId);

    const staffCountMap: Record<number, number> = {};
    for (const { teamId, count } of staffCounts) {
      staffCountMap[teamId] = count;
    }

    const list = teams.map(t => ({
      ...t,
      website: t.websiteUrl || '',
      fetched: !!t.lastScrapedAt,
      staffCount: staffCountMap[t.id] || 0,
      fetchedAt: t.lastScrapedAt ?? null,
    }));

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('[coaches/schools]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schools' });
  }
});

// GET /api/coaches — all scraped staff from DB with optional search
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
        website: schema.programDetails.websiteUrl,
        scrapedAt: schema.programStaff.scrapedAt,
      })
      .from(schema.programStaff)
      .innerJoin(schema.teams, eq(schema.teams.id, schema.programStaff.teamId))
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.programStaff.teamId));

    let staff = rows;
    if (search) {
      const q = String(search).toLowerCase();
      staff = staff.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.school?.toLowerCase().includes(q) ||
        m.title?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: staff, totalSchoolsWithData: new Set(rows.map(r => r.schoolId)).size });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch coaches' });
  }
});

// POST /api/coaches/fetch-live — fetch a school and persist staff to DB
router.post('/fetch-live', async (req, res) => {
  try {
    const { schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ success: false, error: 'schoolId is required' });

    const teamId = parseInt(String(schoolId), 10);
    if (isNaN(teamId)) return res.status(400).json({ success: false, error: 'schoolId must be a number' });

    const teamRows = await db
      .select({ id: schema.teams.id, name: schema.teams.name })
      .from(schema.teams)
      .where(eq(schema.teams.id, teamId))
      .limit(1);
    if (teamRows.length === 0) return res.status(404).json({ success: false, error: 'School not found' });

    const detailRows = await db
      .select({ websiteUrl: schema.programDetails.websiteUrl })
      .from(schema.programDetails)
      .where(eq(schema.programDetails.teamId, teamId))
      .limit(1);
    const websiteUrl = detailRows[0]?.websiteUrl;
    if (!websiteUrl) return res.status(404).json({ success: false, error: 'No website URL for this school' });

    if (!getAIClient()) {
      return res.status(503).json({
        success: false,
        error: 'No AI backend configured. Set OLLAMA_BASE_URL (local) or OPENAI_API_KEY (production) in server/.env.',
      });
    }

    const result = await fetchAndExtract({ id: teamId, name: teamRows[0].name, website: websiteUrl });

    await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, teamId));
    if (result.staff.length > 0) {
      await db.insert(schema.programStaff).values(
        result.staff.map(m => ({
          teamId,
          name: m.name,
          title: m.title,
          email: m.email,
          phone: m.phone,
          scrapedAt: new Date(),
          scrapedFrom: websiteUrl,
        }))
      );
    }

    await db
      .update(schema.programDetails)
      .set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.programDetails.teamId, teamId));

    res.json({ success: true, data: { schoolId: teamId, schoolName: teamRows[0].name, staff: result.staff, fetchedAt: result.fetchedAt } });
  } catch (error: any) {
    if (error?.status === 401) {
      return res.status(401).json({ success: false, error: 'OpenAI API key is invalid.' });
    }
    res.status(500).json({ success: false, error: 'Live fetch failed: ' + (error?.message || 'Unknown error') });
  }
});

// GET /api/coaches/directory — merged verified registered coaches + scraped staff
router.get('/directory', async (req, res) => {
  try {
    const { search } = req.query;

    const [registeredCoaches, scrapedStaff] = await Promise.all([
      db.select({
        id: schema.coaches.id,
        name: schema.coaches.name,
        title: schema.coaches.division,
        email: schema.coaches.email,
        university: schema.coaches.university,
        verified: schema.coaches.verifiedStatus,
      }).from(schema.coaches).where(eq(schema.coaches.verifiedStatus, true)),
      db.select({
        id: schema.programStaff.id,
        name: schema.programStaff.name,
        title: schema.programStaff.title,
        email: schema.programStaff.email,
        university: schema.teams.name,
        verified: schema.programStaff.teamId, // non-null = came from scrape, not verified account
      }).from(schema.programStaff)
        .innerJoin(schema.teams, eq(schema.teams.id, schema.programStaff.teamId)),
    ]);

    const directory = [
      ...registeredCoaches.map(c => ({ ...c, source: 'registered' as const, verified: true })),
      ...scrapedStaff.map(s => ({ ...s, source: 'scraped' as const, verified: false })),
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

// GET /api/coaches/:schoolId — staff for a specific school from DB
router.get('/:schoolId', async (req, res) => {
  try {
    const schoolId = parseInt(req.params.schoolId, 10);
    if (isNaN(schoolId)) return res.status(400).json({ success: false, error: 'Invalid school id' });

    const staff = await db
      .select()
      .from(schema.programStaff)
      .where(eq(schema.programStaff.teamId, schoolId));

    if (staff.length === 0) {
      return res.status(404).json({ success: false, error: 'No data fetched for this school yet.' });
    }

    const teamRows = await db
      .select({ name: schema.teams.name })
      .from(schema.teams)
      .where(eq(schema.teams.id, schoolId))
      .limit(1);

    res.json({
      success: true,
      data: {
        schoolId,
        schoolName: teamRows[0]?.name || 'Unknown',
        staff,
        fetchedAt: staff[0]?.scrapedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch school coaches' });
  }
});

export { router as coachesRouter };
