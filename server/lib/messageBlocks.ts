import { and, eq, or } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../schema';

// Returns true if either party has an active block against the other. Both
// message-send routes (POST /api/messages and POST /api/coach/message/:id)
// must call this AFTER the parent-approval gate and BEFORE the moderation
// gate so a blocked coach cannot reach a minor through either path.
export async function eitherBlocked(
  aId: number, aRole: string, bId: number, bRole: string,
): Promise<boolean> {
  const [row] = await db.select({ id: schema.messageBlocks.id })
    .from(schema.messageBlocks)
    .where(or(
      and(
        eq(schema.messageBlocks.blockerId, aId),
        eq(schema.messageBlocks.blockerRole, aRole),
        eq(schema.messageBlocks.blockedId, bId),
        eq(schema.messageBlocks.blockedRole, bRole),
      ),
      and(
        eq(schema.messageBlocks.blockerId, bId),
        eq(schema.messageBlocks.blockerRole, bRole),
        eq(schema.messageBlocks.blockedId, aId),
        eq(schema.messageBlocks.blockedRole, aRole),
      ),
    ))
    .limit(1);
  return Boolean(row);
}
