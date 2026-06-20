import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response, NextFunction } from 'express';
import { isTokenBlocklisted } from './redis';

// [D-07] No fallback secret. A weak/known signing key lets anyone forge tokens
// for any user or role. The required-env + min-length guard in index.ts blocks
// startup if this is missing or too short, so by the time any request is signed
// JWT_SECRET is guaranteed present and strong.
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES = (process.env.JWT_EXPIRES || '7d') as string;

// [D-06] Seconds remaining before a token expires — used to set the blocklist
// TTL on logout so the entry self-expires when the token would have anyway.
export function getTokenTtlSeconds(token: string): number {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return 0;
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}

export type UserRole = 'athlete' | 'coach' | 'parent' | 'admin';

export interface TokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  name: string;
  // `id` mirrors `userId` on the request object after auth. The token is signed
  // with `userId`, but a lot of route code reads `req.user.id`. We normalize on
  // the way in (attachUser) so both names always resolve to the same value.
  id?: number;
}

// Single boundary where a decoded token becomes req.user. Aliasing id->userId
// here means every downstream route works whether it reads `id` or `userId`.
function attachUser(req: Request, decoded: TokenPayload): void {
  (req as any).user = { ...decoded, id: decoded.id ?? decoded.userId };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as any);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  try {
    const decoded = verifyToken(token);
    // [D-06] Reject tokens that were explicitly revoked via logout.
    if (await isTokenBlocklisted(token)) {
      res.status(401).json({ error: 'Token has been revoked' });
      return;
    }
    attachUser(req, decoded);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      attachUser(req, verifyToken(token));
    } catch {
      // Optional route: ignore an invalid token and continue unauthenticated
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user as TokenPayload;
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}



export function requireCoach(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user as TokenPayload;
    if (user?.role !== 'coach') {
      res.status(403).json({ error: 'Coach access required' });
      return;
    }
    next();
  });
}

export async function verifyGoogleToken(credential: string): Promise<{
  email: string;
  name: string;
  picture: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not configured');
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error('No email returned from Google');
  return {
    email: payload.email,
    name: payload.name ?? '',
    picture: payload.picture ?? '',
  };
}
