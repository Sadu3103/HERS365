import express from 'express';
import { sql, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAdmin } from '../auth';

const router = express.Router();

// GET /api/admin/data/stats
router.get('/stats', requireAdmin, async (_req, res) => {
  try {
    const [
      athleteRes,
      coachRes,
      pendingRes,
      messagesTodayRes,
      newSignupsRes,
      activeSubsRes,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(schema.players),
      db.select({ count: sql<number>`count(*)::int` }).from(schema.coaches),
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.coaches)
        .where(eq(schema.coaches.verifiedStatus, false)),
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.messages)
        .where(sql`created_at >= current_date`),
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.players)
        .where(sql`created_at > now() - interval '7 days'`),
      db.select({ count: sql<number>`count(*)::int` })
        .from(schema.playerSubscriptions)
        .where(eq(schema.playerSubscriptions.status, 'active')),
    ]);

    res.json({
      success: true,
      data: {
        totalAthletes: athleteRes[0]?.count ?? 0,
        totalCoaches: coachRes[0]?.count ?? 0,
        pendingVerifications: pendingRes[0]?.count ?? 0,
        messagesToday: messagesTodayRes[0]?.count ?? 0,
        newSignupsThisWeek: newSignupsRes[0]?.count ?? 0,
        activeSubscriptions: activeSubsRes[0]?.count ?? 0,
      },
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/data/recent-signups
router.get('/recent-signups', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.players)
      .orderBy(desc(schema.players.createdAt))
      .limit(20);

    const data = rows.map(({ passwordHash: _ph, ...rest }) => rest);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/recent-signups]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent signups' });
  }
});

export { router as adminStatsRouter };
