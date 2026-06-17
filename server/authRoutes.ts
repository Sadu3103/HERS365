import express from 'express';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import * as schema from './schema';
import * as auth from './auth';
import { sendEmailVerificationEmail } from './email';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — try again in 15 minutes' },
});

type FoundUser = {
  id: number;
  email: string;
  passwordHash: string | null;
  name: string;
  role: auth.UserRole;
  emailVerified: boolean;
};

function normalizeRole(role: unknown): auth.UserRole | null {
  if (role === 'athlete' || role === 'coach' || role === 'parent') return role;
  return null;
}

function hashVerificationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function markEmailVerified(userType: auth.UserRole, userId: number) {
  if (userType === 'coach') {
    await db.update(schema.coaches).set({ emailVerified: true }).where(eq(schema.coaches.id, userId));
    return;
  }
  if (userType === 'parent') {
    await db.update(schema.parents).set({ emailVerified: true }).where(eq(schema.parents.id, userId));
    return;
  }
  await db.update(schema.players).set({ emailVerified: true }).where(eq(schema.players.id, userId));
}

async function findUserByEmail(email: string, role: auth.UserRole): Promise<FoundUser | null> {
  const e = email.toLowerCase().trim();
  if (role === 'coach') {
    const [row] = await db.select().from(schema.coaches).where(eq(schema.coaches.email, e)).limit(1);
    if (!row) return null;
    return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name ?? '', role: 'coach', emailVerified: row.emailVerified ?? true };
  }
  if (role === 'parent') {
    const [row] = await db.select().from(schema.parents).where(eq(schema.parents.email, e)).limit(1);
    if (!row) return null;
    return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'parent', emailVerified: row.emailVerified ?? true };
  }
  const [row] = await db.select().from(schema.players).where(eq(schema.players.email, e)).limit(1);
  if (!row) return null;
  return { id: row.id, email: row.email, passwordHash: row.passwordHash, name: row.name, role: 'athlete', emailVerified: row.emailVerified ?? true };
}

async function sendVerificationEmail(userType: auth.UserRole, userId: number, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.delete(schema.emailVerificationTokens)
    .where(and(eq(schema.emailVerificationTokens.userId, userId), eq(schema.emailVerificationTokens.userType, userType)));
  await db.insert(schema.emailVerificationTokens).values({
    userId,
    userType,
    email,
    tokenHash,
    expiresAt,
  });
  await sendEmailVerificationEmail(email, token);
}

function publicUser(user: FoundUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

router.post('/register', async (req, res) => {
  const { email, password, name, role = 'athlete', school, division } = req.body ?? {};
  const userRole = normalizeRole(role);

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (!userRole) {
    return res.status(400).json({ error: 'Choose athlete, parent, or coach' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const normalEmail = (email as string).toLowerCase().trim();

  const existing = await findUserByEmail(normalEmail, userRole);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  try {
    const passwordHash = await auth.hashPassword(password as string);

    if (userRole === 'coach') {
      const [row] = await db.insert(schema.coaches).values({
        email: normalEmail,
        passwordHash,
        name: name as string,
        university: school as string | undefined,
        division: (division as string) || 'D1',
        emailVerified: false,
      }).returning({ id: schema.coaches.id });

      await sendVerificationEmail('coach', row.id, normalEmail);
      return res.status(201).json({
        verificationRequired: true,
        message: 'Verification email sent',
        user: { id: row.id, email: normalEmail, name, role: 'coach', emailVerified: false },
      });
    }

    if (userRole === 'parent') {
      const [row] = await db.insert(schema.parents).values({
        email: normalEmail,
        passwordHash,
        name: name as string,
        emailVerified: false,
      }).returning({ id: schema.parents.id });

      await sendVerificationEmail('parent', row.id, normalEmail);
      return res.status(201).json({
        verificationRequired: true,
        message: 'Verification email sent',
        user: { id: row.id, email: normalEmail, name, role: 'parent', emailVerified: false },
      });
    }

    const [row] = await db.insert(schema.players).values({
      email: normalEmail,
      passwordHash,
      name: name as string,
      emailVerified: false,
    }).returning({ id: schema.players.id });

    await sendVerificationEmail('athlete', row.id, normalEmail);
    return res.status(201).json({
      verificationRequired: true,
      message: 'Verification email sent',
      user: { id: row.id, email: normalEmail, name, role: 'athlete', emailVerified: false },
    });
  } catch (err: any) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password, role = 'athlete' } = req.body ?? {};
  const userRole = normalizeRole(role) || 'athlete';

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = await findUserByEmail((email as string).toLowerCase(), userRole);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }

  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, emailVerified: true });
  res.json({ token, user: publicUser({ ...user, emailVerified: true }) });
});

router.post('/coach/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await findUserByEmail((email as string).toLowerCase(), 'coach');
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  const valid = await auth.comparePassword(password as string, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = auth.signToken({ userId: user.id, email: user.email, role: 'coach', name: user.name, emailVerified: true });
  res.json({ token, user: publicUser({ ...user, emailVerified: true }) });
});

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
      email: normalEmail,
      passwordHash,
      name: name as string,
      university: (university as string) || (school as string | undefined),
      division: (division as string) || 'D1',
      emailVerified: false,
    }).returning({ id: schema.coaches.id });
    await sendVerificationEmail('coach', row.id, normalEmail);
    res.status(201).json({
      verificationRequired: true,
      message: 'Verification email sent',
      user: { id: row.id, email: normalEmail, name, role: 'coach', emailVerified: false },
    });
  } catch (err: any) {
    console.error('[auth/coach/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/google', loginLimiter, async (req, res) => {
  const { credential, role = 'athlete' } = req.body ?? {};
  const userRole = normalizeRole(req.body?.role ?? req.query?.role) || normalizeRole(role) || 'athlete';

  if (!credential) {
    return res.status(400).json({ error: 'Google credential is required' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured on this server' });
  }

  try {
    const google = await auth.verifyGoogleToken(credential as string);
    const normalEmail = google.email.toLowerCase();
    let user = await findUserByEmail(normalEmail, userRole);

    if (!user) {
      let userId: number;
      if (userRole === 'coach') {
        const [row] = await db.insert(schema.coaches).values({
          email: normalEmail,
          name: google.name,
          emailVerified: true,
        }).returning({ id: schema.coaches.id });
        userId = row.id;
      } else if (userRole === 'parent') {
        const [row] = await db.insert(schema.parents).values({
          email: normalEmail,
          passwordHash: '',
          name: google.name,
          emailVerified: true,
        }).returning({ id: schema.parents.id });
        userId = row.id;
      } else {
        const [row] = await db.insert(schema.players).values({
          email: normalEmail,
          name: google.name,
          emailVerified: true,
        }).returning({ id: schema.players.id });
        userId = row.id;
      }
      user = { id: userId, email: normalEmail, passwordHash: null, name: google.name, role: userRole, emailVerified: true };
    } else if (!user.emailVerified) {
      await markEmailVerified(user.role, user.id);
      user = { ...user, emailVerified: true };
    }

    const token = auth.signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, emailVerified: true });
    res.json({ token, user: publicUser({ ...user, emailVerified: true }) });
  } catch (err: any) {
    console.error('[auth/google]', err);
    if (err.message?.includes('Invalid token') || err.message?.includes('Token used too late')) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body ?? {};
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const tokenHash = hashVerificationToken(String(token));
    const [entry] = await db.select()
      .from(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    if (!entry || entry.usedAt || entry.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Verification token is invalid or expired' });
    }

    const userType = normalizeRole(entry.userType);
    if (!userType) {
      return res.status(400).json({ error: 'Invalid verification user type' });
    }

    await db.update(schema.emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.emailVerificationTokens.id, entry.id));
    await markEmailVerified(userType, entry.userId);

    res.json({ success: true, message: 'Email verified' });
  } catch (err: any) {
    console.error('[auth/verify-email]', err);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

router.post('/resend-verification', async (req, res) => {
  const { email, role } = req.body ?? {};
  const userRole = normalizeRole(role);

  if (!email || !userRole) {
    return res.status(400).json({ error: 'email and role are required' });
  }

  try {
    const user = await findUserByEmail(String(email), userRole);
    if (!user || user.emailVerified) {
      return res.json({ success: true, message: 'Verification email sent' });
    }

    await sendVerificationEmail(userRole, user.id, user.email);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (err: any) {
    console.error('[auth/resend-verification]', err);
    res.status(500).json({ error: 'Could not resend verification email' });
  }
});

router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

router.post('/logout', (_req, res) => {
  res.json({ success: true });
});

export default router;
