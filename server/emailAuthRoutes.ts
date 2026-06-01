// @ts-nocheck
/**
 * Email/password authentication (bcrypt + JWT).
 * Mounted under /api/auth alongside the OAuth router.
 */
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from './db';
import * as schema from './schema';

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(player) {
  return jwt.sign(
    { id: player.id, email: player.email, subscriptionTier: player.subscriptionTier },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

router.post('/register', async (req, res) => {
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
    return res.status(500).json({ error: err.message });
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
    return res.status(500).json({ error: err.message });
  }
});

export default router;
