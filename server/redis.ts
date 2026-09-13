// Redis caching for session management and token caching
// Required for 50K concurrent user scale.
//
// Redis is OPT-IN: it is only used when REDIS_URL is set (see .env.example,
// where it's commented out for local dev). When REDIS_URL is unset — local
// dev, CI, test — Redis-backed features degrade gracefully (the token
// blocklist simply falls back to "allow", i.e. tokens stay valid until their
// own expiry) instead of trying to connect and hanging.

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
// Once a connection attempt fails we stop retrying for the life of the process
// so an unreachable Redis can't cause a reconnect storm on every request.
let redisUnavailable = false;

// True only when Redis is configured and hasn't already failed to connect.
function redisEnabled(): boolean {
  return !!process.env.REDIS_URL && !redisUnavailable;
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const client: RedisClientType = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 2000,
      // Give up after a couple of quick attempts rather than reconnecting
      // forever (which previously hung the test suite / CI when no Redis ran).
      reconnectStrategy: (retries) => (retries > 2 ? false : Math.min(retries * 100, 500)),
    },
  });
  // Swallow async 'error' events — without a listener node-redis throws and can
  // crash the process. Connection failures are handled at the call sites below.
  client.on('error', () => { /* handled where used */ });

  try {
    await client.connect();
    redisClient = client;
    redisUnavailable = false;
    return redisClient;
  } catch (err) {
    redisUnavailable = true;
    try { await client.disconnect(); } catch { /* ignore */ }
    throw err;
  }
}

// Token caching functions
export async function cacheToken(token: string, userId: string, ttlSeconds: number = 300): Promise<void> {
  if (!redisEnabled()) return;
  try {
    const client = await getRedisClient();
    await client.setEx(`token:${token}`, ttlSeconds, userId);
  } catch (err) {
    console.error('[redis] cacheToken failed:', (err as Error)?.message);
  }
}

export async function getCachedToken(token: string): Promise<string | null> {
  if (!redisEnabled()) return null;
  try {
    const client = await getRedisClient();
    return await client.get(`token:${token}`);
  } catch {
    return null;
  }
}

export async function invalidateToken(token: string): Promise<void> {
  if (!redisEnabled()) return;
  try {
    const client = await getRedisClient();
    await client.del(`token:${token}`);
  } catch (err) {
    console.error('[redis] invalidateToken failed:', (err as Error)?.message);
  }
}

// [D-06] Token blocklist for server-side logout / forced revocation.
// A logged-out (or compromised) JWT is added here with a TTL equal to its
// remaining lifetime, so it self-expires from the blocklist exactly when the
// token would have expired anyway — no unbounded growth.
const BLOCKLIST_PREFIX = 'bl:';

export async function blocklistToken(token: string, ttlSeconds: number): Promise<void> {
  if (!token || ttlSeconds <= 0 || !redisEnabled()) return;
  try {
    const client = await getRedisClient();
    await client.setEx(`${BLOCKLIST_PREFIX}${token}`, ttlSeconds, '1');
  } catch (err) {
    console.error('[redis] blocklistToken failed:', (err as Error)?.message);
  }
}

export async function isTokenBlocklisted(token: string): Promise<boolean> {
  // No Redis configured → blocklist disabled; fail open (token valid until its
  // own expiry). This is what keeps CI/dev from trying to reach a Redis that
  // isn't there.
  if (!redisEnabled()) return false;
  try {
    const client = await getRedisClient();
    const exists = await client.exists(`${BLOCKLIST_PREFIX}${token}`);
    return exists === 1;
  } catch (err) {
    // Fail open on a transient Redis hiccup rather than locking everyone out.
    console.error('[redis] blocklist check failed, allowing token:', (err as Error)?.message);
    return false;
  }
}

// Session caching
export async function cacheSession(sessionId: string, data: object, ttlSeconds: number = 3600): Promise<void> {
  if (!redisEnabled()) return;
  try {
    const client = await getRedisClient();
    await client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.error('[redis] cacheSession failed:', (err as Error)?.message);
  }
}

export async function getSession(sessionId: string): Promise<object | null> {
  if (!redisEnabled()) return null;
  try {
    const client = await getRedisClient();
    const data = await client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
