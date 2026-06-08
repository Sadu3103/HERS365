// @ts-nocheck
import { db } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

export function requireTier(minTier: number) {
  return async (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const subs = await db
        .select({
          tierLevel: schema.subscriptionPlans.tierLevel,
        })
        .from(schema.playerSubscriptions)
        .leftJoin(schema.subscriptionPlans, eq(schema.playerSubscriptions.planId, schema.subscriptionPlans.id))
        .where(eq(schema.playerSubscriptions.playerId, user.userId))
        .limit(1);

      const tierLevel = subs[0]?.tierLevel ? parseInt(subs[0].tierLevel, 10) : 0;

      if (tierLevel < minTier) {
        return res.status(403).json({ error: 'Subscription upgrade required', requiredTier: minTier, currentTier: tierLevel });
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to verify subscription tier' });
    }
  };
}
