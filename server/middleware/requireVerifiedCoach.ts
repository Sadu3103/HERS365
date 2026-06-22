import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';

// Blocks unverified coaches from sensitive actions: athlete search, messaging,
// scouting board adds, etc. Mount this AFTER requireAuth on coach-only routers.
//
// Caller may be any auth role; this only enforces the gate when role === 'coach'.
// Athletes and parents pass through unchanged.
export async function requireVerifiedCoach(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role !== 'coach') {
    next();
    return;
  }
  try {
    const [coach] = await db
      .select({ verified: schema.coaches.verifiedStatus })
      .from(schema.coaches)
      .where(eq(schema.coaches.id, Number(user.userId)))
      .limit(1);
    if (!coach || !coach.verified) {
      res.status(403).json({
        success: false,
        error: 'Coach account is pending verification',
        code: 'COACH_PENDING_VERIFICATION',
      });
      return;
    }
    next();
  } catch (err) {
    console.error('[requireVerifiedCoach]', err);
    res.status(500).json({ success: false, error: 'Verification check failed' });
  }
}

export default requireVerifiedCoach;
