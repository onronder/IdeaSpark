import { Express } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { config } from '../config';
import { logger } from '../utils/logger';
import { errorHandler } from './error-handler';
import { notFoundHandler } from './not-found';
import { requestId } from './request-id';
import { rateLimiter } from './rate-limiter';

export function setupMiddleware(app: Express): void {
  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);

  // Sentry request handler (must be first)
  // Note: In production, you would enable Sentry middleware here

  // Request ID middleware
  app.use(requestId);

  // HTTP request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => {
        // Ignore health check endpoints
        return req.url === '/health' || req.url === '/ready';
        },
      },
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn';
        } else if (res.statusCode >= 500 || err) {
          return 'error';
        }
        return 'info';
      },
    })
  );

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? {} : false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is allowed
        if (config.cors.origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parsing
  app.use(cookieParser(config.security.sessionSecret));

  // Compression
  app.use(compression());

  // Sanitize user input
  app.use(mongoSanitize());

  // Prevent HTTP parameter pollution
  app.use(hpp());

  // Rate limiting (apply to all routes)
  app.use(rateLimiter.global);

  // Health check endpoints (before auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy' });
  });

  app.get('/ready', async (_req, res) => {
    const { checkDatabaseHealth } = await import('../utils/database');
    const { checkRedisHealth } = await import('../utils/redis');

    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    if (dbHealthy) {
      res.json({
        status: 'ready',
        checks: {
          database: dbHealthy ? 'up' : 'down',
          redis: redisHealthy ? 'up' : 'down',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        checks: {
          database: dbHealthy ? 'up' : 'down',
          redis: redisHealthy ? 'up' : 'down',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// Setup error handlers (must be called after routes)
export function setupErrorHandlers(app: Express): void {
  // Sentry error handler (must be before other error handlers)
  // Note: In production, you would enable Sentry error handler here

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);
}