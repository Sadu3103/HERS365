import express from 'express';
import passport from 'passport';
import { eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import * as schema from './schema';
import * as auth from './auth';
import { blocklistToken } from './redis';
import { configurePassport, isGitHubOAuthConfigured } from './passport';

configurePassport();

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — try again in 15 minutes' },
});

// [D-10] Tighter limit on account creation to stop bots from mass-registering
// fake athlete accounts that pollute coach search and rankings.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 new accounts per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network — try again later' },
});

// ─── Demo-login gate (defense-in-depth, positive non-prod assertion) ─────────
// Two hardcoded seeded accounts are the ONLY ones the client-side "Instant
// Login" button can target. The server-side gate uses a POSITIVE non-prod
// assertion rather than the absence of 'production': the prod runtime in
// this repo does not reliably set NODE_ENV, so a missing/unset env must
// fail closed, NOT default to "non-prod = ok".
//
// To enable demo login, BOTH must hold:
//   1. (APP_ENV ?? NODE_ENV) is exactly 'development' or 'test'.
//      Anything else (including undefined, '', 'production', 'staging',
//      arbitrary strings) returns false.
//   2. process.env.DEMO_ENABLED === 'true'.
//
// Both must be deliberately set, so prod cannot satisfy the gate even if
// DEMO_ENABLED is misconfigured/leaked.
const DEMO_LOGIN_ALLOWLIST = new Set<string>([
  'maya@hers365.com',
  'coach@hers365.com',
]);

const ALLOWED_DEMO_ENVS = new Set<string>(['development', 'test']);

export function isDemoEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return DEMO_LOGIN_ALLOWLIST.has(email.toLowerCase().trim());
}

export function isDemoLoginEnabled(): boolean {
  const envValue = process.env.APP_ENV ?? process.env.NODE_ENV;
  if (!envValue || !ALLOWED_DEMO_ENVS.has(envValue)) return false;
  if (process.env.DEMO_ENABLED !== 'true') return false;
  return true;
}

// Returns true and writes a 403 if the request targets a demo account
// while the demo path is locked down. Returns false otherwise (caller
// continues with the normal credential check).
function rejectIfDemoLocked(email: string, res: express.Response): boolean {
  if (!isDemoEmail(email)) return false;
  if (isDemoLoginEnabled()) return false;
  res.status(403).json({ error: 'Demo login is disabled in this environment' });
  return true;
}

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
  // Admins authenticate through the same default-role login the admin UI posts
  // to (no role field). admin_users keys on `username`, which holds the email.
  const [admin] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.username, e)).limit(1);
  if (admin) {
    return {
      id: admin.id,
      email: admin.username,
      passwordHash: admin.passwordHash,
      name: admin.username,
      role: (admin.role as auth.UserRole) || 'admin',
    };
  }

  // default: athlete
  const [row] = await db.select().from(schema.players).where(eq(schema.players.email, e)).limit(1);
  if (!row) return null;
  return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'athlete' };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, name, role = 'athlete', school, division, dob, parentEmail } = req.body ?? {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const userRole = (role as auth.UserRole) || 'athlete';

  // Athlete signup: DOB is now required so we can enforce COPPA / parent-gate.
  // Server is the source of truth, regardless of what the client sends.
  let parsedDob: Date | null = null;
  if (userRole === 'athlete') {
    if (!dob) {
      return res.status(400).json({ error: 'Date of birth is required for athlete accounts' });
    }
    parsedDob = new Date(dob);
    if (Number.isNaN(parsedDob.getTime())) {
      return res.status(400).json({ error: 'Invalid date of birth' });
    }
    const ageMs = Date.now() - parsedDob.getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears < 13) {
      // COPPA: no direct accounts for under-13s. They need a parent-managed flow,
      // which is intentionally not yet implemented.
      return res.status(400).json({
        error: 'Users under 13 cannot create their own account. Ask a parent to set up a managed account.',
      });
    }
  }

  const normalEmail = (email as string).toLowerCase().trim();
  const normalParentEmail = parentEmail ? (parentEmail as string).toLowerCase().trim() : null;

  const existing = await findUserByEmail(normalEmail, userRole);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  try {
    const passwordHash = await auth.hashPassword(password as string);
    let userId: number;

    if (userRole === 'coach') {
      // Coaches are created in an unverified state. They must be approved by
      // an admin before they can search athletes or send messages.
      const [row] = await db.insert(schema.coaches).values({
        email: normalEmail, passwordHash, name: name as string,
        university: school as string | undefined,
        division: (division as string) || 'D1',
        verifiedStatus: false,
        verificationRequestedAt: new Date(),
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
        dob: parsedDob,
        pendingParentEmail: normalParentEmail,
      }).returning({ id: schema.players.id });
      userId = row.id;
      // Best-effort: kick off a parent invite if an email was provided.
      // The actual invite flow lives in /api/parent/invites (see parent routes).
      if (normalParentEmail) {
        try {
          const existingParent = await db.select().from(schema.parents).where(eq(schema.parents.email, normalParentEmail)).limit(1);
          if (existingParent.length > 0) {
            await db.insert(schema.parentChildRelations).values({
              parentId: existingParent[0].id,
              playerId: userId,
              relationship: 'pending',
            });
          }
          // If the parent isn't a user yet, the pendingParentEmail column carries
          // the address for the invite job to pick up later.
        } catch (linkErr) {
          console.warn('[auth/register] parent link skipped', linkErr);
        }
      }
    }

    const token = auth.signToken({ userId, email: normalEmail, role: userRole, name: name as string });
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

  if (rejectIfDemoLocked(email as string, res)) return;

  const user = await findUserByEmail((email as string).toLowerCase(), (role as auth.UserRole) || 'athlete');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// ─── POST /api/auth/(secure/)coach/login ──────────────────────────────────────
// The coach UI posts here without a role field; force the coach realm.
router.post('/coach/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (rejectIfDemoLocked(email as string, res)) return;
  const user = await findUserByEmail((email as string).toLowerCase(), 'coach');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = auth.signToken({ userId: user.id, email: user.email, role: 'coach', name: user.name });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'coach' } });
});

// ─── POST /api/auth/(secure/)coach/register ───────────────────────────────────
router.post('/coach/register', registerLimiter, async (req, res) => {
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
    // Coaches created via this dedicated endpoint also land unverified.
    const verificationNote = (req.body?.verificationNote as string | undefined) ?? null;
    const [row] = await db.insert(schema.coaches).values({
      email: normalEmail, passwordHash, name: name as string,
      university: (university as string) || (school as string | undefined),
      division: (division as string) || 'D1',
      verifiedStatus: false,
      verificationRequestedAt: new Date(),
      verificationNote: verificationNote ?? undefined,
    }).returning({ id: schema.coaches.id });
    const token = auth.signToken({ userId: row.id, email: normalEmail, role: 'coach', name: name as string });
    res.status(201).json({
      token,
      user: { id: row.id, email: normalEmail, name, role: 'coach', verifiedStatus: false },
      pendingVerification: true,
    });
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
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    console.error('[auth/google]', err);
    if (err.message?.includes('Invalid token') || err.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

// [D-06] Real server-side logout: add the presented token to the Redis blocklist
// (TTL = its remaining lifetime) so it can no longer be used even though it's
// otherwise still within its expiry window. requireAuth rejects blocklisted
// tokens. Also clears the refresh-token cookie if one is present.
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
  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true });
});

router.post('/change-password', auth.requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = (req as any).user as auth.TokenPayload;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const found = await findUserByEmail(user.email, user.role);
  if (!found?.passwordHash) {
    return res.status(400).json({ error: 'Password change is not available for this account' });
  }
  if (!(await auth.comparePassword(String(currentPassword), found.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  try {
    const passwordHash = await auth.hashPassword(String(newPassword));
    const userId = user.userId ?? user.id!;
    const table = user.role === 'coach' ? schema.coaches : user.role === 'parent' ? schema.parents : schema.players;
    await db.update(table).set({ passwordHash }).where(eq(table.id, userId));
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.get('/github', (req, res, next) => {
  if (!isGitHubOAuthConfigured()) {
    return res.status(503).json({ error: 'GitHub OAuth not configured' });
  }
  passport.authenticate('github', { session: false, scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  if (!isGitHubOAuthConfigured()) {
    return res.status(503).json({ error: 'GitHub OAuth not configured' });
  }
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  passport.authenticate('github', { session: false, failureRedirect: `${frontend}/auth?error=github` })(req, res, next);
}, (req, res) => {
  const user = (req as any).user as { userId: number; email: string; name: string; role: auth.UserRole };
  const token = auth.signToken({ userId: user.userId, email: user.email, name: user.name, role: user.role });
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const data = encodeURIComponent(JSON.stringify({
    token,
    user: { id: user.userId, email: user.email, name: user.name, role: user.role },
  }));
  res.redirect(`${frontend}/auth/callback?data=${data}`);
});

export default router;
