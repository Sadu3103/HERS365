import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth } from '../auth';

const router = express.Router();
router.use(requireAuth);

function caller(req: express.Request) {
  const u = (req as any).user;
  return { userId: Number(u.userId), role: u.role as string };
}

// Pick the table for the caller's role.
function tableForRole(role: string) {
  if (role === 'coach') return schema.coaches;
  if (role === 'parent') return schema.parents;
  return schema.players;
}

const UPDATABLE_PLAYER_FIELDS = [
  'name', 'position', 'age', 'state', 'city', 'zipCode', 'school',
  'gradYear', 'gpa', 'sport', 'achievements', 'archetype', 'privacySetting', 'bio',
];
const INT_FIELDS = new Set(['age', 'gradYear']);

// GET /api/users/profile — the caller's own row
router.get('/profile', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    const table = tableForRole(role);
    const [row] = await db.select().from(table).where(eq(table.id, userId)).limit(1);
    if (!row) return res.status(404).json({ success: false, error: 'User not found' });
    const { passwordHash, ...safe } = row as any;
    res.json({ success: true, data: { ...safe, role } });
  } catch (err) {
    console.error('[users/profile GET]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile — update own row (players only for now)
router.put('/profile', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    if (role !== 'athlete') {
      return res.status(403).json({ success: false, error: 'Only athletes can edit this profile' });
    }
    const updates: Record<string, any> = {};
    for (const field of UPDATABLE_PLAYER_FIELDS) {
      if (req.body[field] === undefined) continue;
      let value = req.body[field];
      if (INT_FIELDS.has(field) && value !== null && value !== '') {
        const n = parseInt(value, 10);
        value = Number.isNaN(n) ? null : n;
      }
      updates[field] = value;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided' });
    }
    const [row] = await db.update(schema.players).set(updates).where(eq(schema.players.id, userId)).returning();
    const { passwordHash, ...safe } = row as any;
    res.json({ success: true, data: { ...safe, role } });
  } catch (err) {
    console.error('[users/profile PUT]', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// GET /api/users/stats — combine/game-derived numbers for the caller (players only)
router.get('/stats', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    if (role !== 'athlete') return res.json({ success: true, data: {} });
    const [combine] = await db.select().from(schema.combineStats).where(eq(schema.combineStats.playerId, userId)).limit(1);
    res.json({ success: true, data: combine ?? {} });
  } catch (err) {
    console.error('[users/stats]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

const COMBINE_FIELDS = ['season', 'fortyDash', 'shuttle', 'vertical', 'broadJump', 'threeCone'] as const;

// POST /api/users/stats — upsert the caller's combine stats row (athletes only)
router.post('/stats', async (req, res) => {
  try {
    const { userId, role } = caller(req);
    if (role !== 'athlete') return res.status(403).json({ success: false, error: 'Athletes only' });

    const updates: Record<string, string> = {};
    for (const field of COMBINE_FIELDS) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updates[field] = String(req.body[field]);
      }
    }

    const [existing] = await db.select().from(schema.combineStats).where(eq(schema.combineStats.playerId, userId)).limit(1);
    let row;
    if (existing && Object.keys(updates).length === 0) {
      return res.json({ success: true, data: existing });
    }
    if (existing) {
      [row] = await db.update(schema.combineStats).set(updates).where(eq(schema.combineStats.playerId, userId)).returning();
    } else {
      [row] = await db.insert(schema.combineStats).values({ playerId: userId, ...updates }).returning();
    }
    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[users/stats POST]', err);
    res.status(500).json({ success: false, error: 'Failed to save stats' });
  }
});

export { router as usersRouter };
