import OpenAI from 'openai';
import { logger } from '../logger';

// Moderation gate for any user-authored text that lands in coach↔athlete
// messaging. Wired in front of every DB insert on /api/messages and
// /api/coach/message/:playerId so a flagged payload can't reach the
// messages table.
//
// Fail-mode policy (POSITIVE non-prod assertion — same shape as the demo
// login gate). The prod runtime in this repo does NOT reliably set
// NODE_ENV='production', so an "if NODE_ENV === 'production'" check would
// degrade to "allow-through" in prod when OPENAI_API_KEY is missing. That
// is unacceptable on a platform that hosts minors. We fail-open ONLY when
// the env is positively a dev or test env; anything else (including unset)
// fails closed if the key is missing.
//
//   - any env + no API key, env NOT explicitly 'development'/'test'
//                              → fail-closed. Prod / staging / unset / typo
//                                env name cannot run unmoderated.
//   - dev or test + no API key → fail-open (allow). Local dev and CI test
//                                runs aren't required to provision a key.
//   - any env + API key set    → call OpenAI moderation; flagged → block.
//   - API call throws          → fail-closed regardless of env.

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

const MODERATION_MODEL = 'omni-moderation-latest';
const NON_PROD_ENVS = new Set<string>(['development', 'test']);

// Exported for tests + audits. Returns true ONLY when the env is positively
// a known non-prod environment; anything else (unset, '', 'production',
// 'staging', arbitrary strings) returns false so the no-key path will block.
export function isNonProdEnv(): boolean {
  const envValue = process.env.APP_ENV ?? process.env.NODE_ENV;
  return !!envValue && NON_PROD_ENVS.has(envValue);
}

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
    if (!isNonProdEnv()) {
      logger.error('[moderation] OPENAI_API_KEY missing and env is not explicitly dev/test — blocking');
      return { allowed: false, reason: 'moderation_unavailable' };
    }
    // Dev / test only: allow through. Tests that need to exercise the
    // rejection path mock this function directly.
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
