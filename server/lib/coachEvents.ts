import { db } from '../db';
import * as schema from '../schema';

export type CoachEventType =
  | 'search_run'
  | 'player_viewed'
  | 'profile_viewed'
  | 'session_ended';

// Fire-and-forget insert into coach_events. Analytics must never block, slow,
// or break a user-facing request, so the caller does not await this and any
// DB failure is swallowed after a console.error.
export function recordCoachEvent(
  coachId: number,
  eventType: CoachEventType,
  metadata?: Record<string, unknown>,
): void {
  if (!Number.isFinite(coachId) || coachId <= 0) return;
  db.insert(schema.coachEvents)
    .values({ coachId, eventType, metadata: metadata ?? null })
    .then(() => undefined)
    .catch((err) => {
      console.error(`[coachEvents] failed to record ${eventType}:`, err);
    });
}
