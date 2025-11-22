import { Request, Response, NextFunction } from 'express';
import { User, Subscription } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';
import { prisma } from '../utils/database';
import { ApiError } from '../utils/errors';
import { cache } from '../utils/redis';
import { CacheKeys, CacheTTL } from '../utils/cache-helpers';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      user?: User & { subscriptions: Subscription[] };
      token?: string;
    }
  }
}

/**
 * Authenticate user from JWT token
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided', 'NO_TOKEN');
    }

    const token = authHeader.substring(7);
    req.token = token;

    // Check token blacklist (for logout) - using production-grade key pattern
    const blacklistKey = CacheKeys.tokenBlacklist(token);
    const isBlacklisted = await cache.exists(blacklistKey);
    if (isBlacklisted) {
      throw new ApiError(401, 'Token has been revoked', 'TOKEN_REVOKED');
    }

    // Determine userId from either our own JWT or Supabase JWT
    let userId: string | null = null;

    // First, try verifying as our own backend-issued JWT (for legacy clients/tools)
    try {
      const payload = AuthService.verifyToken(token, 'access');
      userId = payload.userId;
    } catch (_err) {
      // If Supabase JWT secret is configured, attempt to treat token as Supabase access token
      if (config.supabase.jwtSecret) {
        try {
          const supabasePayload = jwt.verify(token, config.supabase.jwtSecret) as any;
          // Supabase JWT typically encodes user id in `sub`
          userId = (supabasePayload.sub || supabasePayload.user_id || supabasePayload.id) as string | null;
        } catch {
          throw new ApiError(401, 'Invalid token', 'TOKEN_INVALID');
        }
      } else {
        // No Supabase secret configured and backend JWT verification failed
        throw new ApiError(401, 'Invalid token', 'TOKEN_INVALID');
      }
    }

    if (!userId) {
      throw new ApiError(401, 'Invalid token', 'TOKEN_INVALID');
    }

    // Check user cache first - using production-grade key pattern and TTL
    const cacheKey = CacheKeys.user(userId);
    const cachedUser = await cache.get(cacheKey);

    let user: (User & { subscriptions: Subscription[] }) | null;

    if (cachedUser) {
      user = JSON.parse(cachedUser);
    } else {
      // Get user from database
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscriptions: true },
      });

      if (user && !user.deletedAt) {
        // Cache for 2 minutes (120s as per best practices)
      await cache.set(cacheKey, JSON.stringify(user), CacheTTL.USER_PROFILE);
      }
    }

    if (!user || user.deletedAt) {
      throw new ApiError(401, 'User not found', 'USER_NOT_FOUND');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, but that's okay
      return next();
    }

    // Try to authenticate
    await authenticate(req, _res, next);
  } catch {
    // Authentication failed, but that's okay for optional auth
    next();
  }
}

/**
 * Require specific subscription plan
 */
export function requirePlan(plans: Array<'FREE' | 'PRO' | 'ENTERPRISE'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
    }

    // Get the first active subscription or use subscriptionPlan field
    const activeSubscription = req.user.subscriptions?.find(s => s.status === 'ACTIVE');
    const userPlan = activeSubscription?.plan || req.user.subscriptionPlan;

    if (!plans.includes(userPlan as any)) {
      return next(
        new ApiError(
          402,
          `This feature requires ${plans.join(' or ')} plan`,
          'INSUFFICIENT_PLAN',
          { requiredPlans: plans, currentPlan: userPlan }
        )
      );
    }

    next();
  };
}

/**
 * Require email verification
 */
export function requireEmailVerified(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
  }

  if (!req.user.emailVerified) {
    return next(
      new ApiError(403, 'Email verification required', 'EMAIL_NOT_VERIFIED')
    );
  }

  next();
}

/**
 * Admin only middleware
 */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
  }

  // Check if user is admin (you might want to add an isAdmin field to User model)
  // For now, check if email is admin email
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  if (!adminEmails.includes(req.user.email)) {
    return next(new ApiError(403, 'Admin access required', 'ADMIN_REQUIRED'));
  }

  next();
}
