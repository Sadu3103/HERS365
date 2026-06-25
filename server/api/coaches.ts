import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

// GET /api/coaches/:id — public profile; email and password are never returned
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
