import express, { Express } from 'express';
import { setupMiddleware } from '../../middleware';
import { setupRoutes } from '../../routes';

/**
 * Create a test app instance
 */
export function createTestApp(): Express {
  const app = express();

  // Setup middleware (includes body parsing, CORS, etc.)
  setupMiddleware(app);

  // Setup routes
  setupRoutes(app);

  return app;
}

/**
 * Helper to make authenticated requests
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}