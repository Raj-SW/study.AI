import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * Auth middleware stub for development.
 * In production, replace with JWT verification (decode token → userId, no DB call here).
 *
 * For dev: reads userId from x-user-id header and upserts a User row so that
 * the projects FK (projects.user_id → users.id) is always satisfied.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!userId) {
    return next(new UnauthorizedError('Missing x-user-id header'));
  }

  try {
    // Ensure user exists in DB — idempotent, safe to call on every request
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@dev.local` },
    });
  } catch (err) {
    return next(err);
  }

  req.user = { id: userId };
  next();
}
