import { Router } from 'express';
import { db } from './db';
import * as schema from './schema';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// Parse "TYPE|ORG|FEATURED|actual description" encoded in the description field.
// Falls back gracefully if the format is not present.
function parseDescription(raw: string | null | undefined): { type: string; org: string; featured: boolean; desc: string } {
  if (!raw) return { type: 'Showcase', org: 'HERS365', featured: false, desc: '' };
  const parts = raw.split('|');
  if (parts.length >= 4) {
    return {
      type: parts[0],
      org: parts[1],
      featured: parts[2] === 'true',
      desc: parts.slice(3).join('|'),
    };
  }
  return { type: 'Showcase', org: 'HERS365', featured: false, desc: raw };
}

// GET /api/events — return all upcoming events with enriched fields
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(schema.events).orderBy(schema.events.date);
    const data = rows.map((e) => {
      const { type, org, featured, desc } = parseDescription(e.description);
      const locationParts = e.location.split(',').map((s) => s.trim());
      return {
        ...e,
        type,
        org,
        featured,
        description: desc,
        city: locationParts[0] ?? '',
        state: locationParts[1] ?? '',
      };
    });
    res.json(data);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// POST /api/events/register — register a player for an event
router.post('/register', async (req, res) => {
  const { eventId, playerId } = req.body as { eventId?: number; playerId?: number };
  try {
    const existing = await db
      .select()
      .from(schema.eventRegistrations)
      .where(
        and(
          eq(schema.eventRegistrations.eventId, eventId as number),
          eq(schema.eventRegistrations.playerId, playerId as number)
        )
      );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    await db.insert(schema.eventRegistrations).values({
      eventId: eventId as number,
      playerId: playerId as number,
    });

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
