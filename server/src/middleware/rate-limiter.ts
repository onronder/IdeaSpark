import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../config';
import { ApiError } from '../utils/errors';

// Global rate limiter
const global = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.id || req.ip;
  },
  handler: (_req, _res, _next, options) => {
    throw new ApiError(429, options.message as string, 'RATE_LIMITED');
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready';
  },
});

// Strict rate limiter for auth endpoints
const auth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.loginMaxAttempts,
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    // Use email + IP for auth endpoints
    const email = req.body?.email || '';
    return `${email}-${req.ip}`;
  },
  handler: (_req, _res, _next, options) => {
    throw new ApiError(429, options.message as string, 'AUTH_RATE_LIMITED');
  },
});

// Rate limiter for message endpoints
const message = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.messageMax,
  message: 'Too many messages, please wait before sending another',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID for message endpoints
    return (req as any).user?.id || req.ip;
  },
  handler: (_req, _res, _next, options) => {
    throw new ApiError(429, options.message as string, 'MESSAGE_RATE_LIMITED');
  },
});

// Export all rate limiters
export const rateLimiter = {
  global,
  auth,
  message,
};