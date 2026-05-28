import { Router } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Get all scholarships
router.get('/', async (req, res) => {
  try {
    const scholarships = await db.select().from(schema.scholarships);
    res.json(scholarships);
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    res.status(500).json({ message: 'Error fetching scholarships' });
  }
});

// Get saved scholarships for a player
router.get('/saved/:playerId', async (req, res) => {
  const { playerId } = req.params;
  try {
    const saved = await db
      .select({
        scholarshipId: schema.savedScholarships.scholarshipId,
      })
      .from(schema.savedScholarships)
      .where(eq(schema.savedScholarships.playerId, parseInt(playerId)));
    
    res.json(saved.map(s => s.scholarshipId));
  } catch (error) {
    console.error('Error fetching saved scholarships:', error);
    res.status(500).json({ message: 'Error fetching saved scholarships' });
  }
});

// Save a scholarship
router.post('/save', async (req, res) => {
  const { playerId, scholarshipId } = req.body;
  try {
    // Check if already saved
    const existing = await db
      .select()
      .from(schema.savedScholarships)
      .where(
        and(
          eq(schema.savedScholarships.playerId, playerId),
          eq(schema.savedScholarships.scholarshipId, scholarshipId)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Scholarship already saved' });
    }

    await db.insert(schema.savedScholarships).values({
      playerId,
      scholarshipId,
    });

    res.json({ message: 'Scholarship saved successfully' });
  } catch (error) {
    console.error('Error saving scholarship:', error);
    res.status(500).json({ message: 'Error saving scholarship' });
  }
});

// Unsave a scholarship
router.delete('/save', async (req, res) => {
  const { playerId, scholarshipId } = req.body;
  try {
    await db
      .delete(schema.savedScholarships)
      .where(
        and(
          eq(schema.savedScholarships.playerId, playerId),
          eq(schema.savedScholarships.scholarshipId, scholarshipId)
        )
      );

    res.json({ message: 'Scholarship removed from saved' });
  } catch (error) {
    console.error('Error removing saved scholarship:', error);
    res.status(500).json({ message: 'Error removing saved scholarship' });
  }
});

export default router;
