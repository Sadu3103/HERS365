import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { db } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
import type { TokenPayload } from '../auth';

export function requireTier(minTier: number): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: TokenPayload }).user;
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const subs = await db
        .select({
          tierLevel: schema.subscriptionPlans.tierLevel,
        })
        .from(schema.playerSubscriptions)
        .leftJoin(schema.subscriptionPlans, eq(schema.playerSubscriptions.planId, schema.subscriptionPlans.id))
        .where(eq(schema.playerSubscriptions.playerId, Number(user.userId)))
        .limit(1);

      const tierLevel = subs[0]?.tierLevel ? parseInt(subs[0].tierLevel, 10) : 0;

      if (tierLevel < minTier) {
        res.status(403).json({ error: 'Subscription upgrade required', requiredTier: minTier, currentTier: tierLevel });
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: 'Failed to verify subscription tier' });
    }
  };
}
