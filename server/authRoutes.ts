import express from 'express';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import * as schema from './schema';
import * as auth from './auth';
import { blocklistToken } from './redis';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — try again in 15 minutes' },
});

// ─── DB helpers ──────────────────────────────────────────────────────────────

type FoundUser = {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string;
  role: auth.UserRole;
};

async function findUserByEmail(email: string, role: auth.UserRole): Promise<FoundUser | null> {
  const e = email.toLowerCase().trim();
  if (role === 'coach') {
    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.email, e)).limit(1);
    if (!row) return null;
    return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name ?? '', role: 'coach' };
  }
  if (role === 'parent') {
    const [row] = await db.select().from(schema.parents).where(eq(schema.parents.email, e)).limit(1);
    if (!row) return null;
    return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'parent' };
  }
  // default: athlete
  const [row] = await db.select().from(schema.players).where(eq(schema.players.email, e)).limit(1);
  if (!row) return null;
  return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'athlete' };
}

async function findUserById(id: number, role: auth.UserRole): Promise<FoundUser | null> {
  if (role === 'coach') {
    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.id, id)).limit(1);
    return row ? { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name ?? '', role: 'coach' } : null;
  }
  if (role === 'parent') {
    const [row] = await db.select().from(schema.parents).where(eq(schema.parents.id, id)).limit(1);
    return row ? { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'parent' } : null;
  }
  const [row] = await db.select().from(schema.players).where(eq(schema.players.id, id)).limit(1);
  return row ? { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'athlete' } : null;
}

// ─── [D-05] Refresh-token helpers ─────────────────────────────────────────────
const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: REFRESH_COOKIE_PATH,
    maxAge: auth.REFRESH_TOKEN_TTL_MS,
  };
}

// Issue a fresh refresh token: persist its hash, set the httpOnly cookie.
async function issueRefreshCookie(res: express.Response, req: express.Request, userId: number, role: auth.UserRole): Promise<void> {
  const raw = auth.generateRefreshTokenRaw();
  await db.insert(schema.refreshTokens).values({
    userId,
    userType: role,
    tokenHash: auth.hashRefreshToken(raw),
    expiresAt: new Date(Date.now() + auth.REFRESH_TOKEN_TTL_MS),
    ipAddress: req.ip ?? null,
    userAgent: (req.headers['user-agent'] as string) ?? null,
  });
  res.cookie(REFRESH_COOKIE, raw, refreshCookieOptions());
}

// Read the refresh token out of the Cookie header without needing cookie-parser.
function readRefreshCookie(req: express.Request): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === REFRESH_COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { email, password, name, role = 'athlete', school, division } = req.body ?? {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalEmail = (email as string).toLowerCase().trim();
  const userRole = (role as auth.UserRole) || 'athlete';

  const existing = await findUserByEmail(normalEmail, userRole);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  try {
    const passwordHash = await auth.hashPassword(password as string);
    let userId: number;

    if (userRole === 'coach') {
      const [row] = await db.insert(schema.coaches).values({
        email: normalEmail, passwordHash, name: name as string,
        university: school as string | undefined,
        division: (division as string) || 'D1',
      }).returning({ id: schema.coaches.id });
      userId = row.id;
    } else if (userRole === 'parent') {
      const [row] = await db.insert(schema.parents).values({
        email: normalEmail, passwordHash, name: name as string,
      }).returning({ id: schema.parents.id });
      userId = row.id;
    } else {
      const [row] = await db.insert(schema.players).values({
        email: normalEmail, passwordHash, name: name as string,
      }).returning({ id: schema.players.id });
      userId = row.id;
    }

    const token = auth.signToken({ userId, email: normalEmail, role: userRole, name: name as string });
    await issueRefreshCookie(res, req, userId, userRole);
    res.status(201).json({ token, user: { id: userId, email: normalEmail, name, role: userRole } });
  } catch (err: any) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password, role = 'athlete' } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await findUserByEmail((email as string).toLowerCase(), (role as auth.UserRole) || 'athlete');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
  await issueRefreshCookie(res, req, user.id, user.role);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// ─── POST /api/auth/(secure/)coach/login ──────────────────────────────────────
// The coach UI posts here without a role field; force the coach realm.
router.post('/coach/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await findUserByEmail((email as string).toLowerCase(), 'coach');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = auth.signToken({ userId: user.id, email: user.email, role: 'coach', name: user.name });
  await issueRefreshCookie(res, req, user.id, 'coach');
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'coach' } });
});

// ─── POST /api/auth/(secure/)coach/register ───────────────────────────────────
router.post('/coach/register', async (req, res) => {
  const { email, password, name, school, university, division } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const normalEmail = (email as string).toLowerCase().trim();
  const existing = await findUserByEmail(normalEmail, 'coach');
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }
  try {
    const passwordHash = await auth.hashPassword(password as string);
    const [row] = await db.insert(schema.coaches).values({
      email: normalEmail, passwordHash, name: name as string,
      university: (university as string) || (school as string | undefined),
      division: (division as string) || 'D1',
    }).returning({ id: schema.coaches.id });
    const token = auth.signToken({ userId: row.id, email: normalEmail, role: 'coach', name: name as string });
    await issueRefreshCookie(res, req, row.id, 'coach');
    res.status(201).json({ token, user: { id: row.id, email: normalEmail, name, role: 'coach' } });
  } catch (err: any) {
    console.error('[auth/coach/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/google ────────────────────────────────────────────────────

router.post('/google', loginLimiter, async (req, res) => {
  const { credential, role = 'athlete' } = req.body ?? {};

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured on this server' });
  }

  try {
    const google = await auth.verifyGoogleToken(credential as string);
    const normalEmail = google.email.toLowerCase();
    const userRole = (role as auth.UserRole) || 'athlete';

    let user = await findUserByEmail(normalEmail, userRole);

    if (!user) {
      let userId: number;
      if (userRole === 'coach') {
        const [row] = await db.insert(schema.coaches).values({
          email: normalEmail, name: google.name,
        }).returning({ id: schema.coaches.id });
        userId = row.id;
      } else if (userRole === 'parent') {
        const [row] = await db.insert(schema.parents).values({
          email: normalEmail, passwordHash: '', name: google.name,
        }).returning({ id: schema.parents.id });
        userId = row.id;
      } else {
        const [row] = await db.insert(schema.players).values({
          email: normalEmail, name: google.name,
        }).returning({ id: schema.players.id });
        userId = row.id;
      }
      user = { id: userId, email: normalEmail, passwordHash: null, name: google.name, role: userRole };
    }

    const token = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    await issueRefreshCookie(res, req, user.id, user.role);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    console.error('[auth/google]', err);
    if (err.message?.includes('Invalid token') || err.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

// [D-05] Exchange a valid refresh-token cookie for a new short-lived access
// token. Rotates the refresh token (revokes the old, issues a new one) so a
// stolen refresh token is single-use.
router.post('/refresh', async (req, res) => {
  const raw = readRefreshCookie(req);
  if (!raw) return res.status(401).json({ error: 'No refresh token' });

  try {
    const [row] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, auth.hashRefreshToken(raw)))
      .limit(1);

    if (!row || row.isRevoked || new Date(row.expiresAt) <= new Date()) {
      res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await findUserById(row.userId, row.userType as auth.UserRole);
    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }

    // Rotate: revoke the used token, issue a fresh one.
    await db
      .update(schema.refreshTokens)
      .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'rotated', lastUsedAt: new Date() })
      .where(eq(schema.refreshTokens.id, row.id));
    await issueRefreshCookie(res, req, user.id, user.role);

    const token = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error('[auth/refresh]', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

// [D-06] Blocklist the presented access token (TTL = its remaining lifetime) so
//        it can't be reused before expiry. requireAuth rejects blocklisted tokens.
// [D-05] Also revoke the refresh token so it can't mint new access tokens, and
//        clear the cookie.
router.post('/logout', auth.requireAuth, async (req, res) => {
  const header = req.headers.authorization ?? '';
  const [, token] = header.split(' ');
  try {
    const ttl = auth.getTokenTtlSeconds(token);
    if (ttl > 0) await blocklistToken(token, ttl);
  } catch (err) {
    console.error('[auth/logout] blocklist failed:', err);
    // Don't fail the logout — the client still drops its token.
  }

  const raw = readRefreshCookie(req);
  if (raw) {
    try {
      await db
        .update(schema.refreshTokens)
        .set({ isRevoked: true, revokedAt: new Date(), revokedReason: 'user_logout' })
        .where(eq(schema.refreshTokens.tokenHash, auth.hashRefreshToken(raw)));
    } catch (err) {
      console.error('[auth/logout] refresh revoke failed:', err);
    }
  }

  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  res.json({ success: true });
});

export default router;
