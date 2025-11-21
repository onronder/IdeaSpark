import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from './helpers/app.helper';

describe('Health Check Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('IdeaSpark API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.status).toBe('healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1', () => {
    it('should return API endpoints info', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('IdeaSpark API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('ideas');
      expect(response.body.endpoints).toHaveProperty('billing');
      expect(response.body.endpoints).toHaveProperty('admin');
    });
  });
});