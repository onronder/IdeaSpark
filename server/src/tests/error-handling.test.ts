import request from 'supertest';
import { Express } from 'express';
import { SubscriptionPlan } from '@prisma/client';
import { createTestApp } from './helpers/app.helper';
import { createAuthenticatedUser, cleanupTestUsers, TestUser } from './helpers/auth.helper';

describe('Error Handling', () => {
  let app: Express;
  const testUsers: TestUser[] = [];

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(async () => {
    if (testUsers.length > 0) {
      await cleanupTestUsers(testUsers.map(u => u.id));
      testUsers.length = 0;
    }
  });

  describe('404 Handler', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Route not found');
    });

    it('should handle non-existent routes with POST', async () => {
      const response = await request(app)
        .post('/api/v1/nonexistent')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Route not found');
    });
  });

  describe('Validation Errors', () => {
    it('should handle Zod validation errors', async () => {
      const user = await createAuthenticatedUser();
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          // Missing required fields
          description: 'short', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid json}');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Errors', () => {
    it('should handle missing token', async () => {
      const response = await request(app).get('/api/v1/ideas');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('No token provided');
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/ideas')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid token format');
    });

    it('should handle malformed JWT', async () => {
      const response = await request(app)
        .get('/api/v1/ideas')
        .set('Authorization', 'Bearer malformed.jwt.token');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid token');
    });

    it('should handle expired token', async () => {
      // Create an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: '123', email: 'test@example.com', type: 'access' },
        process.env.JWT_SECRET || 'test-jwt-secret-key',
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/v1/ideas')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Token has expired');
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle quota exceeded error', async () => {
      const user = await createAuthenticatedUser({
        subscriptionPlan: SubscriptionPlan.FREE,
      });
      testUsers.push(user);

      // Create first idea to use up quota
      await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'First Idea',
          description: 'This uses up the free quota for ideas',
          category: 'BUSINESS',
        });

      // Try to create second idea
      const response = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'Second Idea',
          description: 'This should fail due to quota limits',
          category: 'TECHNOLOGY',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.type).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('quota exceeded');
    });

    it('should handle resource not found', async () => {
      const user = await createAuthenticatedUser();
      testUsers.push(user);

      const response = await request(app)
        .get('/api/v1/ideas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.type).toBe('NOT_FOUND');
      expect(response.body.error.message).toContain('Idea session not found');
    });
  });

  describe('Request Size Limits', () => {
    it('should handle payload too large', async () => {
      const user = await createAuthenticatedUser();
      testUsers.push(user);

      // Create a very large payload
      const largeContent = 'x'.repeat(10000); // 10KB of text

      const response = await request(app)
        .post('/api/v1/ideas')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          title: 'Large Idea',
          description: largeContent,
          category: 'BUSINESS',
        });

      // Should fail due to Zod validation (max 2000 chars)
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('must not exceed');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});