import { Express } from 'express';
import { setupErrorHandlers } from '../middleware';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { ideaRoutes } from './idea.routes';
import subscriptionRoutes from './subscription.routes';
import { notificationRoutes } from './notification.routes';
import { analyticsRoutes } from './analytics.routes';
// import { billingRoutes } from './billing.routes';
import { adminRoutes } from './admin.routes';

export function setupRoutes(app: Express): void {
  // API version prefix
  const API_PREFIX = '/api/v1';

  // Health check routes (no prefix, for load balancers/orchestrators)
  app.use('/health', healthRoutes);

  // Mount API route handlers
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/ideas`, ideaRoutes);
  app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
  // app.use(`${API_PREFIX}/billing`, billingRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);

  // Temporary root route
  app.get('/', (_req, res) => {
    res.json({
      name: 'IdeaSpark API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date(),
    });
  });

  // API info route
  app.get(`${API_PREFIX}`, (_req, res) => {
    res.json({
      name: 'IdeaSpark API',
      version: '1.0.0',
      endpoints: {
        auth: `${API_PREFIX}/auth`,
        users: `${API_PREFIX}/users`,
        ideas: `${API_PREFIX}/ideas`,
        billing: `${API_PREFIX}/billing`,
        admin: `${API_PREFIX}/admin`,
      },
    });
  });

  // Setup error handlers (must be after all routes)
  setupErrorHandlers(app);
}