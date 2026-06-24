import express from 'express';
import { and, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { clampIntQuery } from '../lib/queryParam';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

// GET /api/leagues - List leagues with optional ?state=&format=&search= filters
router.get('/', async (req, res) => {
  try {
    const { state, format, search, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 50, min: 1, max: 200 });

    const conditions = [];

    if (state && state !== 'All') {
      conditions.push(eq(schema.leagues.state, String(state)));
    }

    if (format && format !== 'All') {
      conditions.push(eq(schema.leagues.format, String(format)));
    }

    if (search) {
      const term = `%${String(search)}%`;
      conditions.push(
        or(
          ilike(schema.leagues.name, term),
          ilike(schema.leagues.city, term),
          ilike(schema.leagues.state, term),
        )
      );
    }

    const rows = await db
      .select()
      .from(schema.leagues)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(limitNum);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[leagues/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leagues' });
  }
});

// GET /api/leagues/:id - Get one league
router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const rows = await db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.id, id))
      .limit(1);

    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('[leagues/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch league' });
  }
});

export { router as leaguesRouter };
