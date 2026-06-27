import express, { type Request } from 'express';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth, type TokenPayload } from '../auth';
import { validateBody, validateParams } from '../middleware/validate';
import { programApplyBody, programApplyParams } from '../middleware/safetySchemas';
import { parseIdParam } from '../lib/parseIdParam';
import { fetchAndExtract, getAIClient } from '../lib/scraper';

const router = express.Router();

function authUser(req: Request): TokenPayload | undefined {
  return (req as Request & { user?: TokenPayload }).user;
}

// GET /api/programs — DB-backed list with optional filters
router.get('/', async (req, res) => {
  try {
    const { search, division, state, scholarship } = req.query;

    const conditions: ReturnType<typeof eq>[] = [eq(schema.teams.type, 'college')];

    if (division && division !== 'All') conditions.push(eq(schema.teams.division, String(division)));
    if (state && state !== 'All') conditions.push(eq(schema.teams.state, String(state)));
    if (search) {
      const q = `%${String(search)}%`;
      conditions.push(
        or(ilike(schema.teams.name, q), ilike(schema.teams.city, q), ilike(schema.teams.conference, q))!,
      );
    }

    const rows = await db
      .select({
        id: schema.teams.id,
        name: schema.teams.name,
        city: schema.teams.city,
        state: schema.teams.state,
        division: schema.teams.division,
        conference: schema.teams.conference,
        hasScholarships: schema.programDetails.hasScholarships,
        websiteUrl: schema.programDetails.websiteUrl,
        lastScrapedAt: schema.programDetails.lastScrapedAt,
        staffCount: sql<number>`(SELECT count(*)::int FROM program_staff WHERE program_staff.team_id = ${schema.teams.id})`,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(and(...conditions));

    let results = rows;
    if (scholarship === 'Yes') results = results.filter(r => r.hasScholarships === true);
    if (scholarship === 'No') results = results.filter(r => r.hasScholarships !== true);

    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    console.error('[programs/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch programs' });
  }
});

// GET /api/programs/me/applications — the athlete's own applications
// registered before /:id so "me" is not parsed as a program id
router.get('/me/applications', requireAuth, async (req, res) => {
  try {
    const athleteId = Number(authUser(req)?.id);
    const rows = await db
      .select({
        id: schema.programApplications.id,
        athleteId: schema.programApplications.athleteId,
        programId: schema.programApplications.programId,
        position: schema.programApplications.position,
        note: schema.programApplications.note,
        status: schema.programApplications.status,
        createdAt: schema.programApplications.createdAt,
        programName: schema.teams.name,
        programDivision: schema.teams.division,
        programState: schema.teams.state,
      })
      .from(schema.programApplications)
      .leftJoin(schema.teams, eq(schema.teams.id, schema.programApplications.programId))
      .where(eq(schema.programApplications.athleteId, athleteId));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[programs/me/applications]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// POST /api/programs/fetch-live — trigger AI scrape for one program (admin/dev use)
router.post('/fetch-live', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.body;
    const id = parseIdParam(teamId);
    if (id === null) return res.status(400).json({ success: false, error: 'teamId is required' });

    if (!getAIClient()) {
      return res.status(503).json({ success: false, error: 'No AI backend configured. Set OLLAMA_BASE_URL or OPENAI_API_KEY.' });
    }

    const teamRows = await db.select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1);
    if (!teamRows[0]) return res.status(404).json({ success: false, error: 'Team not found' });

    const detailRows = await db.select({ websiteUrl: schema.programDetails.websiteUrl })
      .from(schema.programDetails).where(eq(schema.programDetails.teamId, id)).limit(1);
    const websiteUrl = detailRows[0]?.websiteUrl;
    if (!websiteUrl) return res.status(404).json({ success: false, error: 'No website URL for this team' });

    const result = await fetchAndExtract({ id, name: teamRows[0].name, website: websiteUrl });

    await db.delete(schema.programStaff).where(eq(schema.programStaff.teamId, id));
    if (result.staff.length > 0) {
      await db.insert(schema.programStaff).values(
        result.staff.map(m => ({ teamId: id, name: m.name, title: m.title, email: m.email ?? null, phone: m.phone ?? null, scrapedFrom: websiteUrl }))
      );
    }
    await db.update(schema.programDetails)
      .set({ lastScrapedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.programDetails.teamId, id));

    res.json({ success: true, data: { teamId: id, staff: result.staff } });
  } catch (error) {
    console.error('[programs/fetch-live]', error);
    res.status(500).json({ success: false, error: 'Fetch failed' });
  }
});

// GET /api/programs/:id — full program detail + staff
router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const rows = await db
      .select({
        team: schema.teams,
        details: schema.programDetails,
      })
      .from(schema.teams)
      .leftJoin(schema.programDetails, eq(schema.programDetails.teamId, schema.teams.id))
      .where(eq(schema.teams.id, id))
      .limit(1);

    if (!rows[0]) return res.status(404).json({ success: false, error: 'Program not found' });

    const staff = await db.select().from(schema.programStaff).where(eq(schema.programStaff.teamId, id));

    res.json({ success: true, data: { ...rows[0].team, details: rows[0].details, staff } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch program' });
  }
});

// POST /api/programs/:id/applications — identity comes from the JWT, never the body
router.post('/:id/applications', requireAuth, validateParams(programApplyParams), validateBody(programApplyBody), async (req, res) => {
  try {
    const programId = parseIdParam(req.params.id);
    if (programId === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const teamRows = await db.select({ id: schema.teams.id, name: schema.teams.name })
      .from(schema.teams).where(eq(schema.teams.id, programId)).limit(1);
    if (!teamRows[0]) return res.status(404).json({ success: false, error: 'Program not found' });

    const { position, note } = req.body;
    if (!position || !String(position).trim()) {
      return res.status(400).json({ success: false, error: 'Position is required' });
    }

    const athleteId = Number(authUser(req)?.id);

    const existing = await db
      .select({ id: schema.programApplications.id })
      .from(schema.programApplications)
      .where(and(
        eq(schema.programApplications.athleteId, athleteId),
        eq(schema.programApplications.programId, programId),
      ))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'You have already applied to this program' });
    }

    const inserted = await db
      .insert(schema.programApplications)
      .values({ athleteId, programId, position: String(position).trim(), note: note ? String(note).trim() : null })
      .returning();

    res.json({ success: true, data: { ...inserted[0], programName: teamRows[0].name } });
  } catch (error) {
    console.error('[programs/apply]', error);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

export { router as programsRouter };
