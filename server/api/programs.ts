
import express from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// Static program catalog — no programs table yet; user state (saves,
// applications) is what persists to the DB.
const programs = [
  { id: 1, name: 'University of Texas', city: 'Austin', state: 'Texas', division: 'NCAA D1', conference: 'Big 12', hasScholarships: true, programSize: 'Large', coachId: 1, athletesRecruited: 48, winRecord: '12-2', tuitionInState: 11000 },
  { id: 2, name: 'Florida State University', city: 'Tallahassee', state: 'Florida', division: 'NCAA D1', conference: 'ACC', hasScholarships: true, programSize: 'Large', coachId: 2, athletesRecruited: 52, winRecord: '13-1', tuitionInState: 13000 },
  { id: 3, name: 'Azusa Pacific University', city: 'Azusa', state: 'California', division: 'NAIA', conference: 'GSAC', hasScholarships: true, programSize: 'Medium', coachId: 3, athletesRecruited: 24, winRecord: '8-4', tuitionInState: 36000 },
  { id: 4, name: 'Hardin-Simmons University', city: 'Abilene', state: 'Texas', division: 'NCAA D3', conference: 'ASC', hasScholarships: false, programSize: 'Small', coachId: 4, athletesRecruited: 16, winRecord: '7-3', tuitionInState: 30000 },
  { id: 5, name: 'Shorter University', city: 'Rome', state: 'Georgia', division: 'NCAA D2', conference: 'SAC', hasScholarships: true, programSize: 'Medium', coachId: 5, athletesRecruited: 28, winRecord: '9-3', tuitionInState: 18000 },
  { id: 6, name: 'San Diego Mesa College', city: 'San Diego', state: 'California', division: 'JUCO', conference: 'PCAC', hasScholarships: false, programSize: 'Small', coachId: null, athletesRecruited: 12, winRecord: '5-5', tuitionInState: 1500 },
  { id: 7, name: 'Lindenwood University', city: 'St. Charles', state: 'Missouri', division: 'NCAA D1', conference: 'OVC', hasScholarships: true, programSize: 'Large', coachId: 6, athletesRecruited: 40, winRecord: '10-4', tuitionInState: 19000 },
  { id: 8, name: 'Benedictine College', city: 'Atchison', state: 'Kansas', division: 'NAIA', conference: 'HAAC', hasScholarships: true, programSize: 'Small', coachId: 7, athletesRecruited: 20, winRecord: '6-4', tuitionInState: 32000 },
];

// GET /api/programs
router.get('/', (req, res) => {
  try {
    const { state, division, conference, scholarship, size, search } = req.query;
    let results = [...programs];

    if (search) {
      const q = search.toString().toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.conference.toLowerCase().includes(q)
      );
    }
    if (state && state !== 'All') results = results.filter(p => p.state === state);
    if (division && division !== 'All') results = results.filter(p => p.division === division);
    if (conference && conference !== 'All') results = results.filter(p => p.conference === conference);
    if (scholarship && scholarship !== 'All') {
      const wantsScholarship = scholarship === 'Yes';
      results = results.filter(p => p.hasScholarships === wantsScholarship);
    }
    if (size && size !== 'All') results = results.filter(p => p.programSize === size);

    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch programs' });
  }
});

// GET /api/programs/me/applications — the athlete's own applications
// (registered before /:id so "me" is not parsed as a program id)
router.get('/me/applications', requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.programApplications)
      .where(eq(schema.programApplications.athleteId, Number(req.user.id)));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[programs/me/applications]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch applications' });
  }
});

// GET /api/programs/:id
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid program id' });
    }
    const program = programs.find(p => p.id === id);
    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch program' });
  }
});

// POST /api/programs/:id/applications — identity comes from the JWT, never the body
router.post('/:id/applications', requireAuth, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    if (Number.isNaN(programId)) {
      return res.status(400).json({ success: false, error: 'Invalid program id' });
    }

    const program = programs.find(p => p.id === programId);
    if (!program) {
      return res.status(404).json({ success: false, error: 'Program not found' });
    }

    const { position, note } = req.body;
    if (!position || !String(position).trim()) {
      return res.status(400).json({ success: false, error: 'Position is required' });
    }

    const athleteId = Number(req.user.id);

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
      .values({
        athleteId,
        programId,
        position: String(position).trim(),
        note: note ? String(note).trim() : null,
      })
      .returning();

    res.json({ success: true, data: { ...inserted[0], programName: program.name } });
  } catch (error) {
    console.error('[programs/apply]', error);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

export { router as programsRouter };
