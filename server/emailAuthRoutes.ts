/**
 * Email/password authentication (bcrypt + JWT).
 * Mounted under /api/auth alongside the OAuth router.
 */
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import * as schema from './schema';
import { sendPasswordResetEmail } from './email';

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// [D-10] Cap account creation at 5 per IP per hour to block bulk fake signups.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this network — try again later' },
});

type TokenPlayer = {
  id: number;
  email: string;
  subscriptionTier: string | null;
};

function signToken(player: TokenPlayer): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return jwt.sign(
    { id: player.id, email: player.email, subscriptionTier: player.subscriptionTier },
    secret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

router.post('/register', registerLimiter, async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.email, email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const inserted = await db
      .insert(schema.players)
      .values({ email, passwordHash, name: name || email.split('@')[0] })
      .returning();

    const player = inserted[0];
    const token = signToken(player);

    return res.status(201).json({
      token,
      user: {
        id: player.id,
        email: player.email,
        name: player.name,
        subscriptionTier: player.subscriptionTier,
      },
    });
  } catch (err) {
    console.error('[email-auth/register] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const rows = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.email, email))
      .limit(1);

    const player = rows[0];
    if (!player || !player.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, player.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(player);

    return res.json({
      token,
      user: {
        id: player.id,
        email: player.email,
        name: player.name,
        subscriptionTier: player.subscriptionTier,
      },
    });
  } catch (err) {
    console.error('[email-auth/login] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

// In-memory reset token store — swap for DB table in production
const resetTokens = new Map<string, { playerId: number; expiresAt: number }>();

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const rows = await db.select().from(schema.players).where(eq(schema.players.email, email)).limit(1);
    // Always respond 200 to prevent email enumeration
    if (!rows.length) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    resetTokens.set(token, { playerId: rows[0].id, expiresAt: Date.now() + 60 * 60 * 1000 }); // 1h TTL
    await sendPasswordResetEmail(email, token);
    return res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    console.error('[email-auth/forgot-password] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(schema.players).set({ passwordHash }).where(eq(schema.players.id, entry.playerId));
    resetTokens.delete(token);
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[email-auth/reset-password] 500:', err);
    return res.status(500).json({ error: 'Authentication request failed, please try again' });
  }
});

export default router;
