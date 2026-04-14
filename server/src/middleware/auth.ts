import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userDisplayName?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || 'dev_secret';

  try {
    const payload = jwt.verify(token, secret) as { userId: string; displayName: string };
    req.userId = payload.userId;
    req.userDisplayName = payload.displayName;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
