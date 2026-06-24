// @ts-nocheck
import express from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../middleware/requireAuth';

const router = express.Router();

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
    if (gradYear) rows = rows.filter(r => r.gradYear === parseInt(String(gradYear), 10));

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }
});

// POST /api/stories — athlete submits their commitment story (auth required)
router.post('/', requireAuth, async (req, res) => {
  try {
    const athleteId = req.user?.id ?? req.user?.userId;
    if (!athleteId) return res.status(401).json({ success: false, error: 'Authentication required' });

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
    res.status(500).json({ success: false, error: 'Failed to submit story' });
  }
});

export { router as storiesRouter };
