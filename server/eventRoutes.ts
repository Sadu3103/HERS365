// @ts-nocheck
import { Router } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await db.select().from(schema.events).orderBy(schema.events.date);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Register for an event
router.post('/register', async (req, res) => {
  const { eventId, playerId } = req.body;
  try {
    // Check if already registered
    const existing = await db
      .select()
      .from(schema.eventRegistrations)
      .where(
        and(
          eq(schema.eventRegistrations.eventId, eventId),
          eq(schema.eventRegistrations.playerId, playerId)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    await db.insert(schema.eventRegistrations).values({
      eventId,
      playerId,
    });

    // Update participant count
    await db.execute(
      sql`UPDATE events SET participant_count = participant_count + 1 WHERE id = ${eventId}`
    );

    res.json({ message: 'Registered successfully' });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Error registering for event' });
  }
});

export default router;
