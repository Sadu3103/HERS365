import express from 'express';
import { and, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { clampIntQuery } from '../lib/queryParam';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

// GET /api/teams - List teams with optional ?type=&search= filters
router.get('/', async (req, res) => {
  try {
    const { type, search, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 50, min: 1, max: 200 });

    const conditions = [];

    if (type && type !== 'All') {
      conditions.push(eq(schema.teams.type, String(type)));
    }

    if (search) {
      const term = `%${String(search)}%`;
      conditions.push(
        or(
          ilike(schema.teams.name, term),
          ilike(schema.teams.city, term),
          ilike(schema.teams.state, term),
        )
      );
    }

    const rows = await db
      .select()
      .from(schema.teams)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(limitNum);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[teams/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/:id - Get one team
router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const rows = await db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.id, id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[teams/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

export { router as teamsRouter };
