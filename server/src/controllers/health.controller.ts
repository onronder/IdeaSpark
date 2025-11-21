import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { cache } from '../utils/redis';
import { logger } from '../utils/logger';

const healthLogger = logger.child({ module: 'health.controller' });

export class HealthController {
  /**
   * Basic health check
   * GET /health
   */
  static async basicHealth(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * Detailed health check with service status
   * GET /health/detailed
   */
  static async detailedHealth(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const services: Record<string, string> = {};

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      services.database = 'connected';
    } catch (error) {
      healthLogger.error({ err: error }, 'Database health check failed');
      services.database = 'disconnected';
    }

    // Check Redis
    try {
      await cache.set('health_check', 'ok', 5);
      const result = await cache.get('health_check');
      services.redis = result === 'ok' ? 'connected' : 'error';
    } catch (error) {
      healthLogger.error({ err: error }, 'Redis health check failed');
      services.redis = 'disconnected';
    }

    // Overall status
    const allHealthy = Object.values(services).every(status => status === 'connected');
    const responseTime = Date.now() - startTime;

    const response = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
      env: process.env.NODE_ENV,
    };

    res.status(allHealthy ? 200 : 503).json(response);
  }

  /**
   * Readiness probe
   * GET /health/ready
   */
  static async readiness(_req: Request, res: Response): Promise<void> {
    try {
      // Check critical services
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      healthLogger.error({ err: error }, 'Readiness check failed');
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Service is not ready to accept traffic',
      });
    }
  }

  /**
   * Liveness probe
   * GET /health/live
   */
  static async liveness(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}
