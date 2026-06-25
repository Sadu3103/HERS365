import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

// GET / — list all badges (public)
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(schema.badges);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[badges/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

// GET /:playerId — badges earned by a player (public)
router.get('/:playerId', async (req, res) => {
  try {
    const playerId = parseIdParam(req.params.playerId);
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Invalid playerId' });
    }

    const rows = await db
      .select({
        id: schema.badges.id,
        name: schema.badges.name,
        description: schema.badges.description,
        icon: schema.badges.icon,
        category: schema.badges.category,
        earnedAt: schema.playerBadges.earnedAt,
      })
      .from(schema.playerBadges)
      .innerJoin(schema.badges, eq(schema.playerBadges.badgeId, schema.badges.id))
      .where(eq(schema.playerBadges.playerId, playerId));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[badges/player]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch player badges' });
  }
});

export { router as badgesRouter };
