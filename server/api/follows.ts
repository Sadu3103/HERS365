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

function stripPasswordHash<T extends { passwordHash?: string | null }>(player: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _, ...rest } = player;
  return rest;
}

// POST / — follow a player
router.post('/', requireAuth, async (req, res) => {
  try {
    const followerId = Number(authUser(req)?.id);
    const followingId = parseIdParam(req.body?.followingId);
    if (!followingId) {
      return res.status(400).json({ success: false, error: 'followingId is required' });
    }
    if (followerId === followingId) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }

    const existing = await db
      .select({ id: schema.follows.id })
      .from(schema.follows)
      .where(and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId),
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.follows).values({ followerId, followingId });
    }

    res.json({ success: true, data: { following: true } });
  } catch (err) {
    console.error('[follows/post]', err);
    res.status(500).json({ success: false, error: 'Failed to follow player' });
  }
});

// DELETE /:id — unfollow (id = the player being followed)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const followerId = Number(authUser(req)?.id);
    const followingId = parseIdParam(req.params.id);
    if (!followingId) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    await db
      .delete(schema.follows)
      .where(and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId),
      ));

    res.json({ success: true, data: { following: false } });
  } catch (err) {
    console.error('[follows/delete]', err);
    res.status(500).json({ success: false, error: 'Failed to unfollow player' });
  }
});

// GET /check/:id — check if current user follows player :id
router.get('/check/:id', requireAuth, async (req, res) => {
  try {
    const followerId = Number(authUser(req)?.id);
    const followingId = parseIdParam(req.params.id);
    if (!followingId) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const rows = await db
      .select({ id: schema.follows.id })
      .from(schema.follows)
      .where(and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId),
      ))
      .limit(1);

    res.json({ success: true, data: { following: rows.length > 0 } });
  } catch (err) {
    console.error('[follows/check]', err);
    res.status(500).json({ success: false, error: 'Failed to check follow status' });
  }
});

// GET /followers/:id — list followers of player :id (public)
router.get('/followers/:id', async (req, res) => {
  try {
    const playerId = parseIdParam(req.params.id);
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const rows = await db
      .select({ player: schema.players })
      .from(schema.follows)
      .innerJoin(schema.players, eq(schema.follows.followerId, schema.players.id))
      .where(eq(schema.follows.followingId, playerId));

    const data = rows.map(r => stripPasswordHash(r.player));
    res.json({ success: true, data });
  } catch (err) {
    console.error('[follows/followers]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch followers' });
  }
});

// GET /following/:id — list who player :id follows (public)
router.get('/following/:id', async (req, res) => {
  try {
    const playerId = parseIdParam(req.params.id);
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const rows = await db
      .select({ player: schema.players })
      .from(schema.follows)
      .innerJoin(schema.players, eq(schema.follows.followingId, schema.players.id))
      .where(eq(schema.follows.followerId, playerId));

    const data = rows.map(r => stripPasswordHash(r.player));
    res.json({ success: true, data });
  } catch (err) {
    console.error('[follows/following]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch following list' });
  }
});

export { router as followsRouter };
