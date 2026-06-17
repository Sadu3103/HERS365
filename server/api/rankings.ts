// @ts-nocheck
import express from 'express';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { position, search, limit = '50', offset = '0' } = req.query;
    const pageLimit = Math.min(Math.max(Number(limit), 1), 100);
    const pageOffset = Math.max(Number(offset), 0);
    const conditions = [eq(schema.players.privacySetting, 'public'), isNotNull(schema.players.g5Rating)];

    if (position && position !== 'All') conditions.push(eq(schema.players.position, String(position)));
    if (search && String(search).trim()) {
      const q = `%${String(search).trim().toLowerCase()}%`;
      conditions.push(sql`lower(${schema.players.name}) like ${q} or lower(coalesce(${schema.players.school}, '')) like ${q}`);
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.players)
      .where(and(...conditions));

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
      .where(and(...conditions))
      .orderBy(desc(schema.players.g5Rating), desc(schema.players.xpPoints))
      .limit(pageLimit)
      .offset(pageOffset);

    let data = rows.map((p, i) => ({
      id: p.id,
      rank: pageOffset + i + 1,
      name: p.name,
      school: p.school ?? '',
      position: p.position ?? '–',
      gpa: p.gpa ?? null,
      gradYear: p.gradYear ?? null,
      rating: Math.min(99, (p.g5Rating ?? 0) * 18 + Math.round((p.xpPoints ?? 0) / 100)),
      change: 0,
      verified: p.verificationStatus === 'verified',
    }));

    res.json({
      success: true,
      data,
      total: Number(countRow?.count ?? 0),
      pagination: { limit: pageLimit, offset: pageOffset },
    });
  } catch (error) {
    console.error('[rankings]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rankings' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid id' });

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
