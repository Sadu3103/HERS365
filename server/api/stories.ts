import express, { type Request } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth, type TokenPayload } from '../auth';

const router = express.Router();

function authUser(req: Request): TokenPayload | undefined {
  return (req as Request & { user?: TokenPayload }).user;
}

// GET /api/stories — approved commitment stories with optional filters
router.get('/', async (req, res) => {
  try {
    const { position, division, gradYear } = req.query;

    let rows = await db
      .select()
      .from(schema.commitmentStories)
      .where(eq(schema.commitmentStories.approved, true))
      .orderBy(desc(schema.commitmentStories.createdAt));

    if (position) rows = rows.filter(r => r.position?.toLowerCase() === String(position).toLowerCase());
    if (division) rows = rows.filter(r => r.commitmentDivision?.toLowerCase() === String(division).toLowerCase());
    if (gradYear) {
      const y = parseInt(String(gradYear), 10);
      if (!isNaN(y)) rows = rows.filter(r => r.gradYear === y);
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[stories/list]', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }
});

// POST /api/stories — athlete submits commitment story (auth required, goes to pending review)
router.post('/', requireAuth, async (req, res) => {
  try {
    const athleteId = Number(authUser(req)?.id);
    const { athleteName, position, commitmentSchool, commitmentDivision, gradYear, storyText, imageUrl, tags } = req.body;

    if (!athleteName?.trim()) return res.status(400).json({ success: false, error: 'athleteName is required' });
    if (!commitmentSchool?.trim()) return res.status(400).json({ success: false, error: 'commitmentSchool is required' });

    const inserted = await db
      .insert(schema.commitmentStories)
      .values({
        athleteId,
        athleteName: athleteName.trim(),
        position: position?.trim() || null,
        commitmentSchool: commitmentSchool.trim(),
        commitmentDivision: commitmentDivision?.trim() || null,
        gradYear: gradYear ? parseInt(String(gradYear), 10) : null,
        storyText: storyText?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        tags: tags || null,
        approved: false,
      })
      .returning();

    res.json({ success: true, data: inserted[0], message: 'Story submitted for review. It will appear publicly once approved.' });
  } catch (error) {
    console.error('[stories/submit]', error);
    res.status(500).json({ success: false, error: 'Failed to submit story' });
  }
});

export { router as storiesRouter };
