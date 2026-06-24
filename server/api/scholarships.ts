import express, { type Request } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth, type TokenPayload } from '../auth';
import { parseIdParam } from '../lib/parseIdParam';

const router = express.Router();

function authUser(req: Request): TokenPayload | undefined {
  return (req as Request & { user?: TokenPayload }).user;
}

// GET /api/scholarships — list all, optional ?category= filter, no auth
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const rows = category
      ? await db.select().from(schema.scholarships).where(eq(schema.scholarships.category, String(category)))
      : await db.select().from(schema.scholarships);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[scholarships/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch scholarships' });
  }
});

// GET /api/scholarships/saved — requireAuth, return saved scholarships for current user
// Must be registered before /:id so "saved" is not parsed as an id
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const playerId = Number(authUser(req)?.id);
    const rows = await db
      .select({ scholarship: schema.scholarships })
      .from(schema.savedScholarships)
      .leftJoin(schema.scholarships, eq(schema.savedScholarships.scholarshipId, schema.scholarships.id))
      .where(eq(schema.savedScholarships.playerId, playerId));
    res.json({ success: true, data: rows.map(r => r.scholarship) });
  } catch (err) {
    console.error('[scholarships/saved/list]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch saved scholarships' });
  }
});

// POST /api/scholarships/:id/save — requireAuth, upsert into savedScholarships
router.post('/:id/save', requireAuth, async (req, res) => {
  try {
    const scholarshipId = parseIdParam(req.params.id);
    if (scholarshipId === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const playerId = Number(authUser(req)?.id);

    const existing = await db
      .select({ id: schema.savedScholarships.id })
      .from(schema.savedScholarships)
      .where(and(
        eq(schema.savedScholarships.playerId, playerId),
        eq(schema.savedScholarships.scholarshipId, scholarshipId),
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.savedScholarships).values({ playerId, scholarshipId });
    }

    res.json({ success: true, saved: true });
  } catch (err) {
    console.error('[scholarships/save]', err);
    res.status(500).json({ success: false, error: 'Failed to save scholarship' });
  }
});

// DELETE /api/scholarships/:id/save — requireAuth, remove from savedScholarships
router.delete('/:id/save', requireAuth, async (req, res) => {
  try {
    const scholarshipId = parseIdParam(req.params.id);
    if (scholarshipId === null) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const playerId = Number(authUser(req)?.id);

    await db
      .delete(schema.savedScholarships)
      .where(and(
        eq(schema.savedScholarships.playerId, playerId),
        eq(schema.savedScholarships.scholarshipId, scholarshipId),
      ));

    res.json({ success: true, saved: false });
  } catch (err) {
    console.error('[scholarships/unsave]', err);
    res.status(500).json({ success: false, error: 'Failed to remove saved scholarship' });
  }
});

export { router as scholarshipsRouter };
