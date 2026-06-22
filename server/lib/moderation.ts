import OpenAI from 'openai';
import { logger } from '../logger';

// Moderation gate for any user-authored text that lands in coach↔athlete
// messaging. Wired in front of every DB insert on /api/messages and
// /api/coach/message/:playerId so a flagged payload can't reach the
// messages table.
//
// Fail-mode policy:
//   - prod + no API key       → fail-closed (block, log error). The platform
//                               hosts minors; we don't ship messages without
//                               a moderation pass once we're in prod.
//   - non-prod + no API key   → fail-open (allow). Tests and local dev
//                               aren't required to provision an OpenAI key.
//   - API call throws         → fail-closed. Don't risk shipping unsafe
//                               content because the moderation service is
//                               having a bad day.

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

const MODERATION_MODEL = 'omni-moderation-latest';

let cachedClient: OpenAI | null = null;
function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new OpenAI({ apiKey: key });
  return cachedClient;
}

// Exposed for tests: lets the next-call client be rebuilt after env mutation.
export function _resetModerationClientForTests(): void {
  cachedClient = null;
}

export async function moderateMessage(text: string): Promise<ModerationResult> {
  const oai = getClient();
  if (!oai) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[moderation] OPENAI_API_KEY missing in production — blocking');
      return { allowed: false, reason: 'moderation_unavailable' };
    }
    // Dev / test: allow through. Tests that need to exercise the rejection
    // path mock this function directly.
    return { allowed: true };
  }

  try {
    const res = await oai.moderations.create({
      model: MODERATION_MODEL,
      input: text,
    });
    const r = res.results[0];
    if (r?.flagged) {
      const flaggedCategories = Object.entries(r.categories ?? {})
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      const reason = flaggedCategories.length > 0
        ? `flagged:${flaggedCategories.join(',')}`
        : 'flagged';
      return { allowed: false, reason };
    }
    return { allowed: true };
  } catch (err) {
    logger.error('[moderation] api call failed — fail-closed', err instanceof Error ? err : { err: String(err) });
    return { allowed: false, reason: 'moderation_failed' };
  }
}
