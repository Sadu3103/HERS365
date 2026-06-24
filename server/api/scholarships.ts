// @ts-nocheck
import express from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

// GET /api/scholarships — list all scholarships with optional filters
router.get('/', async (req, res) => {
  try {
    const { category, state } = req.query;

    let rows = await db.select().from(schema.scholarships);

    if (category) {
      rows = rows.filter(r => r.category === String(category));
    }
    if (state) {
      rows = rows.filter(r => !r.eligibleStates || r.eligibleStates.toLowerCase().includes(String(state).toLowerCase()));
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch scholarships' });
  }
});

// GET /api/scholarships/saved — athlete's saved scholarship IDs (auth required)
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const playerId = req.user?.id ?? req.user?.userId;
    if (!playerId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const rows = await db
      .select({ scholarshipId: schema.savedScholarships.scholarshipId })
      .from(schema.savedScholarships)
      .where(eq(schema.savedScholarships.playerId, playerId));

    res.json({ success: true, data: rows.map(r => r.scholarshipId) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch saved scholarships' });
  }
});

// POST /api/scholarships/:id/save — save a scholarship (auth required)
router.post('/:id/save', requireAuth, async (req, res) => {
  try {
    const scholarshipId = parseInt(req.params.id, 10);
    if (isNaN(scholarshipId)) return res.status(400).json({ success: false, error: 'Invalid scholarship id' });

    const playerId = req.user?.id ?? req.user?.userId;
    if (!playerId) return res.status(401).json({ success: false, error: 'Authentication required' });

    const existing = await db
      .select({ id: schema.savedScholarships.id })
      .from(schema.savedScholarships)
      .where(and(eq(schema.savedScholarships.playerId, playerId), eq(schema.savedScholarships.scholarshipId, scholarshipId)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Scholarship already saved' });
    }

    await db.insert(schema.savedScholarships).values({ playerId, scholarshipId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save scholarship' });
  }
});

// DELETE /api/scholarships/:id/save — unsave a scholarship (auth required)
router.delete('/:id/save', requireAuth, async (req, res) => {
  try {
    const scholarshipId = parseInt(req.params.id, 10);
    if (isNaN(scholarshipId)) return res.status(400).json({ success: false, error: 'Invalid scholarship id' });

    const playerId = req.user?.id ?? req.user?.userId;
    if (!playerId) return res.status(401).json({ success: false, error: 'Authentication required' });

    await db
      .delete(schema.savedScholarships)
      .where(and(eq(schema.savedScholarships.playerId, playerId), eq(schema.savedScholarships.scholarshipId, scholarshipId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove scholarship' });
  }
});

export { router as scholarshipsRouter };
