import rateLimit, { ipKeyGenerator, MemoryStore } from 'express-rate-limit';
import type { Request } from 'express';

// Per-sender flood guard on coach↔athlete messaging. Mount on both
// POST /api/messages and POST /api/coach/message/:playerId AFTER requireAuth
// so req.user.userId is populated. Place ahead of moderateMessage so a
// throttled request never burns an OpenAI call. Parent-approval and block
// gates can sit before or after — they're cheap selects against the DB.
//
// Defaults: 20 messages per 60s per authenticated userId. Tunable via env so
// we can tighten during an incident without a redeploy.
//
// Storage: in-memory, per process. Fine for the current single-instance
// Railway deploy; revisit (Redis store) when we scale horizontally.

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 20;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Read at request time so tests (and ops) can change the env without
// reloading the module or remounting the routes. The window stays bound to
// what's set at limiter creation — that's a store-init constraint of
// express-rate-limit and the configured 60s is fine for all current callers.
export function getMessageRateMax(): number {
  return parsePositiveInt(process.env.MESSAGE_RATE_LIMIT_MAX, DEFAULT_MAX);
}
export function getMessageRateWindowMs(): number {
  return parsePositiveInt(process.env.MESSAGE_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
}

// Snapshots, exposed for diagnostics / tests that want to assert the values
// the limiter is reading right now.
export const MESSAGE_RATE_WINDOW_MS = getMessageRateWindowMs();
export const MESSAGE_RATE_MAX = getMessageRateMax();

// Held by reference so tests can flush counters in beforeEach without
// reinstantiating the limiter (which would require remounting the routes).
const messageRateStore = new MemoryStore();

export const messageRateLimit = rateLimit({
  windowMs: MESSAGE_RATE_WINDOW_MS,
  // Function form so the limit is re-read from env on every request. Lets a
  // test set process.env.MESSAGE_RATE_LIMIT_MAX before exercising the route
  // even though the module loaded with the default in place.
  limit: () => getMessageRateMax(),
  store: messageRateStore,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  // Per-sender counter. Falls back to IPv6-safe IP key if the route is ever
  // mounted without auth (defense in depth — should never happen, since both
  // routes sit behind requireAuth). Role is folded into the key so that
  // coach.id=1 and athlete.id=1 (distinct sequences, same numeric id) don't
  // collide on a single bucket.
  keyGenerator: (req: Request) => {
    const u = (req as { user?: { userId?: number | string; role?: string } }).user;
    if (u?.userId != null) return `${u.role ?? 'user'}:${u.userId}`;
    return `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  // Generic body — don't leak window math or counter state to the caller.
  message: { success: false, error: 'Too many messages — slow down and try again shortly.' },
});

// Exposed for tests: clear the in-memory counter store between cases. The
// limiter itself stays mounted; only the per-key state is wiped.
export async function _resetMessageRateLimitForTests(): Promise<void> {
  await messageRateStore.resetAll();
}

export default messageRateLimit;
