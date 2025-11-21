import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import { createServer } from 'http';
import { config } from './config';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { logger } from './utils/logger';
import { initSentry } from './utils/sentry';
import { connectDatabase } from './utils/database';
import { connectRedis } from './utils/redis';
import { gracefulShutdown } from './utils/shutdown';
import { analyticsService } from './services/analytics.service';
import { firebaseService } from './services/firebase.service';

// Initialize Sentry error tracking
initSentry();

const app = express();
const server = createServer(app);

async function startServer() {
  try {
    // Connect to database (CRITICAL - must succeed)
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis (OPTIONAL - graceful degradation)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn({ error }, 'Redis connection failed - continuing without cache');
      // Don't throw - server can work without Redis
    }

    // Initialize Firebase (for push notifications) - OPTIONAL
    try {
      await firebaseService.initialize();
      logger.info('Firebase service initialized');
    } catch (error) {
      logger.warn({ error }, 'Firebase initialization failed - push notifications disabled');
    }

    // Initialize Analytics - OPTIONAL
    try {
      await analyticsService.initialize();
      logger.info('Analytics service initialized');
    } catch (error) {
      logger.warn({ error }, 'Analytics initialization failed - analytics disabled');
    }

    // Setup middleware
    setupMiddleware(app);

    // Setup routes
    setupRoutes(app);

    // Start server
    server.listen(config.port, config.host, () => {
      logger.info(`Server running on http://${config.host}:${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    // Setup graceful shutdown
    gracefulShutdown(server);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();