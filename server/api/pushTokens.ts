import express, { type Request } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';
import { requireAuth, type TokenPayload } from '../auth';

const router = express.Router();

const ALLOWED_PLATFORMS = new Set(['ios', 'android', 'web']);

function authUser(req: Request): TokenPayload | undefined {
  return (req as Request & { user?: TokenPayload }).user;
}

// POST /api/push-token — register or refresh a device token.
//
// Accepts athlete OR coach JWTs (decided by user.role). One row per token
// thanks to the UNIQUE constraint on push_tokens.token; a re-register from
// the same device just bumps updated_at and re-binds the owner. Returns 200
// { success: true } on every success path; client treats it fire-and-forget
// (see usePushNotifications).
router.post('/', requireAuth, async (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' });

  const { token, platform } = req.body ?? {};

  if (typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'token is required' });
  }
  if (typeof platform !== 'string' || !ALLOWED_PLATFORMS.has(platform)) {
    return res.status(400).json({ success: false, error: 'platform must be ios, android, or web' });
  }

  const userId = user.role === 'coach' ? null : Number(user.userId ?? user.id);
  const coachId = user.role === 'coach' ? Number(user.userId ?? user.id) : null;

  try {
    await db
      .insert(schema.pushTokens)
      .values({ token: token.trim(), platform, userId, coachId })
      .onConflictDoUpdate({
        target: schema.pushTokens.token,
        set: { userId, coachId, platform, updatedAt: sql`now()` },
      });
    res.json({ success: true });
  } catch (error) {
    console.error('[push-token]', error);
    res.status(500).json({ success: false, error: 'Failed to register push token' });
  }
});

export default router;
