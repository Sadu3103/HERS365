import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES = (process.env.JWT_EXPIRES || '7d') as string;

export type UserRole = 'athlete' | 'coach' | 'parent' | 'admin';

export interface TokenPayload {
  userId: number;
  id?: number;
  email: string;
  role: UserRole;
  name: string;
  emailVerified?: boolean;
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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  try {
    const decoded = verifyToken(token);
    (req as any).user = { ...decoded, id: decoded.id ?? decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
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

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
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
