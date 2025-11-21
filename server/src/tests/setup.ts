import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-that-is-at-least-32-characters';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/ideaspark_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.SENTRY_DSN = '';
process.env.LOG_LEVEL = 'error';
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-purposes-only';
process.env.APPLE_SHARED_SECRET = 'test-apple-shared-secret';
process.env.APPLE_ENVIRONMENT = 'sandbox';
process.env.GOOGLE_SERVICE_ACCOUNT_KEY = 'test-google-service-account-key.json';
process.env.GOOGLE_PACKAGE_NAME = 'com.ideaspark.app.test';
process.env.SESSION_SECRET = 'test-session-secret-that-is-at-least-32-chars';
process.env.COOKIE_SECRET = 'test-cookie-secret';
process.env.EMAIL_FROM = 'test@ideaspark.com';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.API_VERSION = 'v1';

// Mock logger in test environment to reduce noise
jest.mock('../utils/logger', () => {
  const mockFn = jest.fn();
  const mockChild = jest.fn(() => ({
    info: mockFn,
    error: mockFn,
    warn: mockFn,
    debug: mockFn,
  }));

  return {
    logger: {
      info: mockFn,
      error: mockFn,
      warn: mockFn,
      debug: mockFn,
      child: mockChild,
    },
    requestLogger: jest.fn((_req: any, _res: any, next: any) => next()),
  };
});

// Increase timeout for database operations
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections
  const { prisma } = await import('../utils/database');
  await prisma.$disconnect();

  // Close redis connections
  const { disconnectRedis } = await import('../utils/redis');
  await disconnectRedis();
});