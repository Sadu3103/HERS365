import express from 'express';
import { asc, desc, eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { clampIntQuery } from '../lib/queryParam';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { position, limit } = req.query;
    const limitNum = clampIntQuery(limit, { default: 50, min: 1, max: 200 });

    const rows = await db
      .select({
        id: schema.players.id,
        name: schema.players.name,
        school: schema.players.school,
        position: schema.players.position,
        gpa: schema.players.gpa,
        gradYear: schema.players.gradYear,
        g5Rating: schema.players.g5Rating,
        xpPoints: schema.players.xpPoints,
        verificationStatus: schema.players.verificationStatus,
      })
      .from(schema.players)
      // Only rated athletes appear on the board. This also keeps unrated test
      // accounts out, and avoids Postgres sorting NULL g5Rating first under DESC.
      .where(and(eq(schema.players.privacySetting, 'public'), isNotNull(schema.players.g5Rating)))
      // Tiebreak order: rating, then activity (XP), then name. The final name
      // sort makes ties deterministic so the board does not reshuffle equal
      // scores between refreshes (which reads as arbitrary to athletes).
      .orderBy(desc(schema.players.g5Rating), desc(schema.players.xpPoints), asc(schema.players.name))
      .limit(limitNum);

    let data = rows.map((p, i) => ({
      id: p.id,
      rank: i + 1,
      name: p.name,
      school: p.school ?? '',
      position: p.position ?? '–',
      gpa: p.gpa ?? null,
      gradYear: p.gradYear ?? null,
      rating: Math.min(99, (p.g5Rating ?? 0) * 18 + Math.round((p.xpPoints ?? 0) / 100)),
      change: 0,
      verified: p.verificationStatus === 'verified',
    }));

    if (position && position !== 'All') {
      data = data.filter(r => r.position === position);
    }

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error('[rankings]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rankings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) return res.status(400).json({ success: false, error: 'Invalid id' });

    const [p] = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, id))
      .limit(1);

    if (!p) return res.status(404).json({ success: false, error: 'Player not found' });

    res.json({
      success: true,
      data: {
        id: p.id,
        name: p.name,
        school: p.school,
        position: p.position,
        gpa: p.gpa,
        gradYear: p.gradYear,
        rating: Math.min(99, (p.g5Rating ?? 0) * 18 + Math.round((p.xpPoints ?? 0) / 100)),
        verified: p.verificationStatus === 'verified',
      },
    });
  } catch (error) {
    console.error('[rankings/:id]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch player ranking' });
  }
});

export { router as rankingsRouter };
