import { Server } from 'http';
import { logger } from './logger';
import { disconnectDatabase } from './database';
import { disconnectRedis } from './redis';

let isShuttingDown = false;

export function gracefulShutdown(server: Server) {
  // Handle SIGTERM (Docker stop)
  process.on('SIGTERM', () => shutdown(server, 'SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => shutdown(server, 'SIGINT'));
}

async function shutdown(server: Server, signal: string) {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during server close');
    }

    try {
      // Close database connections
      await disconnectDatabase();

      // Close Redis connections
      await disconnectRedis();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}
