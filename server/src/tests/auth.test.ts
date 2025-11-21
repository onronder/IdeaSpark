import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from './helpers/app.helper';
import {
  createTestUser,
  createAuthenticatedUser,
  cleanupTestUsers,
  TestUser,
} from './helpers/auth.helper';
import { prisma } from '../utils/database';
import bcrypt from 'bcryptjs';

describe('Auth Endpoints', () => {
  let app: Express;
  const testUsers: TestUser[] = [];

  beforeAll(() => {
    app = createTestApp();
  });

  afterEach(async () => {
    // Clean up test users after each test
    if (testUsers.length > 0) {
      await cleanupTestUsers(testUsers.map((u) => u.id));
      testUsers.length = 0;
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Clean up
      testUsers.push(response.body.data.user);
    });

    it('should fail with duplicate email', async () => {
      const user = await createTestUser({ email: 'existing@example.com' });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'AnotherPassword123!',
          name: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weakpass@example.com',
          password: 'weak',
          name: 'Weak Pass User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Password must be at least');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123!',
          name: 'Invalid Email User',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email');
    });

    it('should handle marketing attribution', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'marketing@example.com',
          password: 'SecurePassword123!',
          name: 'Marketing User',
          marketingAttribution: {
            source: 'google',
            medium: 'cpc',
            campaign: 'summer-2024',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify marketing data was saved
      const attribution = await prisma.marketingAttribution.findFirst({
        where: { userId: response.body.data.user.id },
      });

      expect(attribution).toBeTruthy();
      expect(attribution?.utmSource).toBe('google');
      expect(attribution?.utmMedium).toBe('cpc');
      expect(attribution?.utmCampaign).toBe('summer-2024');

      testUsers.push(response.body.data.user);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const user = await createTestUser({
        email: 'login@example.com',
        plainPassword: 'CorrectPassword123!',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'CorrectPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should fail with incorrect password', async () => {
      const user = await createTestUser({
        email: 'wrongpass@example.com',
        plainPassword: 'CorrectPassword123!',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrongpass@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should fail with deleted user', async () => {
      const user = await createTestUser({
        email: 'deleted@example.com',
        deletedAt: new Date(),
        plainPassword: 'ValidPassword123!',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'ValidPassword123!',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Account is disabled');
    });

    it('should track device fingerprint', async () => {
      const user = await createTestUser({
        email: 'device@example.com',
        plainPassword: 'DevicePassword123!',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'device@example.com',
          password: 'DevicePassword123!',
          deviceFingerprint: 'test-device-fingerprint-123',
        });

      expect(response.status).toBe(200);

      // Verify device fingerprint was saved
      const refreshToken = await prisma.refreshToken.findFirst({
        where: { userId: user.id },
      });

      expect(refreshToken?.deviceFingerprint).toBe('test-device-fingerprint-123');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'refresh@example.com',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: user.refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.refreshToken).not.toBe(user.refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid token');
    });

    it('should fail with expired refresh token', async () => {
      const user = await createAuthenticatedUser({
        email: 'expired@example.com',
      });
      testUsers.push(user);

      // Manually expire the token
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: user.refreshToken,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Token has expired');
    });

    it('should fail with revoked refresh token', async () => {
      const user = await createAuthenticatedUser({
        email: 'revoked@example.com',
      });
      testUsers.push(user);

      // Revoke the token
      await prisma.refreshToken.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: user.refreshToken,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Token has been revoked');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'logout@example.com',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({
          refreshToken: user.refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');

      // Verify token was revoked
      const refreshToken = await prisma.refreshToken.findFirst({
        where: { token: user.refreshToken },
      });

      expect(refreshToken?.revokedAt).toBeTruthy();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          refreshToken: 'some-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should get current user successfully', async () => {
      const user = await createAuthenticatedUser({
        email: 'me@example.com',
        name: 'Current User',
      });
      testUsers.push(user);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe('me@example.com');
      expect(response.body.data.name).toBe('Current User');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid token');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should initiate password reset successfully', async () => {
      const user = await createTestUser({
        email: 'forgot@example.com',
      });
      testUsers.push(user);

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'forgot@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset email sent');

      // Verify token was created
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
      });

      expect(resetToken).toBeTruthy();
      expect(resetToken?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should succeed silently with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Returns success to prevent email enumeration
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset email sent');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const user = await createTestUser({
        email: 'reset@example.com',
        plainPassword: 'OldPassword123!',
      });
      testUsers.push(user);

      // Create reset token
      const token = 'test-reset-token-123';
      const hashedToken = await bcrypt.hash(token, 10);
      await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: token,
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      const isValid = await bcrypt.compare(
        'NewPassword123!',
        updatedUser!.passwordHash
      );
      expect(isValid).toBe(true);

      // Verify token was deleted
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
      });
      expect(resetToken).toBeNull();
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired');
    });

    it('should fail with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'some-token',
          newPassword: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Password must be at least');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit auth endpoints', async () => {
      const promises = [];

      // Make 6 requests (rate limit is 5)
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: `ratelimit${i}@example.com`,
              password: 'Password123!',
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0]?.body.error.message).toContain('Too many requests');
    });
  });
});