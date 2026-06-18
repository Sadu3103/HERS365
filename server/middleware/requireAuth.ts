import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../auth';

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedRequest['user'];
    // Mirror userId onto id so routes reading either name resolve the same value.
    req.user = { ...decoded, id: (decoded as any).id ?? (decoded as any).userId };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export default requireAuth;
