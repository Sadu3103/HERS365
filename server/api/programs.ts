// @ts-nocheck
import express from 'express';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../middleware/requireAuth';
import { fetchAndExtract, getAIClient } from '../lib/scraper';

const router = express.Router();

// GET /api/programs — programs from DB with optional filters
router.get('/', async (req, res) => {
  try {
    const { search, division, state } = req.query;

    // Fetch teams with their programDetails and staff counts
    const rows = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        division: schema.teams.division,
        conference: schema.teams.conference,
        city: schema.teams.city,
        state: schema.teams.state,
        websiteUrl: schema.programDetails.websiteUrl,
        hasScholarships: schema.programDetails.hasScholarships,
        lastScrapedAt: schema.programDetails.lastScrapedAt,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.type, 'college'));

    // Fetch staff counts in one query
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

    let results = rows.map(r => ({
      ...r,
      website: r.websiteUrl || '',
      fetched: !!r.lastScrapedAt,
      staffCount: staffCountMap[r.id] || 0,
    }));

    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.state && r.state.toLowerCase().includes(q)) ||
        (r.conference && r.conference.toLowerCase().includes(q))
      );
    }
    if (division && division !== 'All') {
      results = results.filter(r => r.division === String(division));
    }
    if (state && state !== 'All') {
      results = results.filter(r => r.state === String(state));
    }

    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    console.error('[programs/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch programs' });
  }
});

// POST /api/programs/fetch-live — fetch + extract one school, persist to DB
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

    const school = { id: teamId, name: teamRows[0].name, website: websiteUrl };
    const result = await fetchAndExtract(school);

    // Upsert programDetails
    await db
      .update(schema.programDetails)
      .set({
        lastScrapedAt: new Date(),
        scrapedDataRaw: result as any,
        updatedAt: new Date(),
        ...(result.hasScholarships !== null && { hasScholarships: result.hasScholarships }),
      })
      .where(eq(schema.programDetails.teamId, teamId));

    // Replace staff for this school
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

    // Update teams table if scraper found division/conference/city/state
    const teamUpdates: Record<string, any> = {};
    if (result.division) teamUpdates.division = result.division;
    if (result.conference) teamUpdates.conference = result.conference;
    if (result.city) teamUpdates.city = result.city;
    if (result.state) teamUpdates.state = result.state;
    if (Object.keys(teamUpdates).length > 0) {
      await db.update(schema.teams).set(teamUpdates).where(eq(schema.teams.id, teamId));
    }

    res.json({ success: true, data: { ...result, staff: result.staff } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Live fetch failed' });
  }
});

// POST /api/programs/fetch-all — background fetch for all schools without staff
router.post('/fetch-all', async (req, res) => {
  if (!getAIClient()) {
    return res.status(503).json({
      success: false,
      error: 'No AI backend configured. Set OLLAMA_BASE_URL or OPENAI_API_KEY in server/.env.',
    });
  }

  const allSchools = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      websiteUrl: schema.programDetails.websiteUrl,
      lastScrapedAt: schema.programDetails.lastScrapedAt,
    })
    .from(schema.teams)
    .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
    .where(eq(schema.teams.type, 'college'));

  const unfetched = allSchools.filter(s => !s.lastScrapedAt && s.websiteUrl);

  res.json({ success: true, message: `Fetching ${unfetched.length} schools in background` });

  for (const s of unfetched) {
    try {
      const result = await fetchAndExtract({ id: s.id, name: s.name, website: s.websiteUrl! });

      await db
        .update(schema.programDetails)
        .set({ lastScrapedAt: new Date(), scrapedDataRaw: result as any, updatedAt: new Date() })
        .where(eq(schema.programDetails.teamId, s.id));

      if (result.staff.length > 0) {
        await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, s.id));
        await db.insert(schema.programStaff).values(
          result.staff.map(m => ({
            teamId: s.id,
            name: m.name,
            title: m.title,
            email: m.email,
            phone: m.phone,
            scrapedAt: new Date(),
            scrapedFrom: s.websiteUrl!,
          }))
        );
      }
    } catch {
      // Continue on individual failures
    }
    await new Promise(r => setTimeout(r, 500));
  }
});

// GET /api/programs/:id — single program with full details
router.get('/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const rows = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        division: schema.teams.division,
        conference: schema.teams.conference,
        city: schema.teams.city,
        state: schema.teams.state,
        websiteUrl: schema.programDetails.websiteUrl,
        hasScholarships: schema.programDetails.hasScholarships,
        minGpa: schema.programDetails.minGpa,
        rosterNeeds: schema.programDetails.rosterNeeds,
        athleticBenchmarks: schema.programDetails.athleticBenchmarks,
        eligibilityNotes: schema.programDetails.eligibilityNotes,
        majorsList: schema.programDetails.majorsList,
        graduationRate: schema.programDetails.graduationRate,
        studentAthleteSupportNotes: schema.programDetails.studentAthleteSupportNotes,
        lastScrapedAt: schema.programDetails.lastScrapedAt,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.id, teamId))
      .limit(1);

    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Program not found' });

    const staff = await db
      .select()
      .from(schema.programStaff)
      .where(eq(schema.programStaff.teamId, teamId));

    res.json({ success: true, data: { ...rows[0], website: rows[0].websiteUrl || '', fetched: !!rows[0].lastScrapedAt, staff } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch program' });
  }
});

// GET /api/programs/:id/staff — staff for one program
router.get('/:id/staff', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return res.status(400).json({ success: false, error: 'Invalid id' });

    const staff = await db
      .select()
      .from(schema.programStaff)
      .where(eq(schema.programStaff.teamId, teamId));

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// POST /api/programs/:id/applications — submit recruiting interest (auth required)
router.post('/:id/applications', requireAuth, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    if (isNaN(programId)) return res.status(400).json({ success: false, error: 'Invalid program id' });

    const athleteId = req.user?.id ?? req.user?.userId;
    if (!athleteId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const { position, note } = req.body;
    if (!position?.trim()) return res.status(400).json({ success: false, error: 'Position is required' });

    const teamRows = await db
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.id, programId))
      .limit(1);
    if (teamRows.length === 0) return res.status(404).json({ success: false, error: 'Program not found' });

    // Duplicate check
    const existing = await db
      .select({ id: schema.programApplications.id })
      .from(schema.programApplications)
      .where(
        and(
          eq(schema.programApplications.athleteId, athleteId),
          eq(schema.programApplications.programId, programId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'You have already applied to this program' });
    }

    const inserted = await db
      .insert(schema.programApplications)
      .values({ athleteId, programId, position: position.trim(), note: note?.trim() || null })
      .returning();

    res.json({ success: true, data: inserted[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

export { router as programsRouter };
