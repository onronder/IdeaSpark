import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../utils/database';
import { createAuthenticatedUser, cleanupTestUsers } from '../helpers/auth.helper';
import { NotificationPlatform, NotificationType } from '@prisma/client';
import { firebaseService } from '../../services/firebase.service';

// Mock Firebase service
jest.mock('../../services/firebase.service', () => ({
  firebaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    validateToken: jest.fn().mockResolvedValue(true),
    subscribeToTopic: jest.fn().mockResolvedValue(undefined),
    unsubscribeFromTopic: jest.fn().mockResolvedValue(undefined),
    sendMulticastNotification: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    }),
    sendNotification: jest.fn().mockResolvedValue('mock-message-id'),
    sendTopicNotification: jest.fn().mockResolvedValue('mock-message-id'),
  },
}));

describe('Notification Integration Tests', () => {
  let authUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Initialize Firebase mock
    await firebaseService.initialize();
  });

  beforeEach(async () => {
    // Create authenticated test user
    authUser = await createAuthenticatedUser();
    authToken = authUser.accessToken!;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.notification.deleteMany({
      where: { userId: authUser.id },
    });

    await prisma.notificationToken.deleteMany({
      where: { userId: authUser.id },
    });

    await cleanupTestUsers([authUser.id]);
  });

  describe('POST /api/v1/notifications/register', () => {
    it('should register a push token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'ExponentPushToken[test-token-123]',
          platform: NotificationPlatform.IOS,
          deviceId: 'test-device-123',
          deviceName: 'iPhone 14 Pro',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Push token registered successfully');

      // Verify token was saved to database
      const token = await prisma.notificationToken.findUnique({
        where: { token: 'ExponentPushToken[test-token-123]' },
      });

      expect(token).toBeDefined();
      expect(token?.userId).toBe(authUser.id);
      expect(token?.platform).toBe(NotificationPlatform.IOS);
      expect(token?.deviceId).toBe('test-device-123');
      expect(token?.deviceName).toBe('iPhone 14 Pro');
      expect(token?.active).toBe(true);

      // Verify Firebase subscription was called
      expect(firebaseService.subscribeToTopic).toHaveBeenCalledWith(
        ['ExponentPushToken[test-token-123]'],
        `user_${authUser.id}`
      );
    });

    it('should update existing token if already registered', async () => {
      const token = 'ExponentPushToken[test-token-456]';

      // Create initial token
      await prisma.notificationToken.create({
        data: {
          userId: authUser.id,
          token,
          platform: NotificationPlatform.ANDROID,
          deviceId: 'old-device',
          deviceName: 'Old Device',
          active: true,
        },
      });

      // Register again with updated info
      const response = await request(app)
        .post('/api/v1/notifications/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token,
          platform: NotificationPlatform.IOS,
          deviceId: 'new-device',
          deviceName: 'New Device',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify token was updated
      const updatedToken = await prisma.notificationToken.findUnique({
        where: { token },
      });

      expect(updatedToken?.platform).toBe(NotificationPlatform.IOS);
      expect(updatedToken?.deviceId).toBe('new-device');
      expect(updatedToken?.deviceName).toBe('New Device');
    });

    it('should reject invalid platform', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'ExponentPushToken[test-token-789]',
          platform: 'INVALID_PLATFORM',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid token', async () => {
      // Mock Firebase validation to return false
      (firebaseService.validateToken as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/v1/notifications/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'invalid-token',
          platform: NotificationPlatform.IOS,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/notifications/register')
        .send({
          token: 'ExponentPushToken[test-token]',
          platform: NotificationPlatform.IOS,
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/notifications/unregister', () => {
    it('should unregister a push token successfully', async () => {
      const token = 'ExponentPushToken[test-token-unregister]';

      // Create token first
      await prisma.notificationToken.create({
        data: {
          userId: authUser.id,
          token,
          platform: NotificationPlatform.IOS,
          active: true,
        },
      });

      const response = await request(app)
        .post('/api/v1/notifications/unregister')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Push token unregistered successfully');

      // Verify token was marked as inactive
      const updatedToken = await prisma.notificationToken.findUnique({
        where: { token },
      });

      expect(updatedToken?.active).toBe(false);

      // Verify Firebase unsubscription was called
      expect(firebaseService.unsubscribeFromTopic).toHaveBeenCalledWith(
        [token],
        `user_${authUser.id}`
      );
    });

    it('should handle unregistering non-existent token', async () => {
      const response = await request(app)
        .post('/api/v1/notifications/unregister')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: 'non-existent-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await prisma.notification.createMany({
        data: [
          {
            userId: authUser.id,
            type: NotificationType.IDEA_RESPONSE,
            title: 'AI Response Ready',
            body: 'Your AI has generated new insights',
            read: false,
          },
          {
            userId: authUser.id,
            type: NotificationType.QUOTA_WARNING,
            title: 'Quota Warning',
            body: 'You have 2 messages left',
            read: true,
          },
          {
            userId: authUser.id,
            type: NotificationType.WELCOME,
            title: 'Welcome',
            body: 'Welcome to IdeaSpark',
            read: false,
          },
        ],
      });
    });

    it('should fetch user notifications', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.unreadCount).toBe(2);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .query({ limit: 2, offset: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(2);
      expect(response.body.data.total).toBe(3);
    });

    it('should only return user-specific notifications', async () => {
      // Create another user with notifications
      const otherUser = await createAuthenticatedUser();

      await prisma.notification.create({
        data: {
          userId: otherUser.id,
          type: NotificationType.SYSTEM,
          title: 'System',
          body: 'Other user notification',
          read: false,
        },
      });

      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.notifications).toHaveLength(3);
      expect(
        response.body.data.notifications.every((n: any) => n.userId === authUser.id)
      ).toBe(true);

      // Clean up
      await cleanupTestUsers([otherUser.id]);
    });
  });

  describe('PATCH /api/v1/notifications/:notificationId/read', () => {
    let notification: any;

    beforeEach(async () => {
      notification = await prisma.notification.create({
        data: {
          userId: authUser.id,
          type: NotificationType.IDEA_RESPONSE,
          title: 'Test',
          body: 'Test notification',
          read: false,
        },
      });
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .patch(`/api/v1/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification marked as read');

      // Verify notification was updated
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });

      expect(updated?.read).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });

    it('should not allow marking another user notification as read', async () => {
      const otherUser = await createAuthenticatedUser();

      const otherNotification = await prisma.notification.create({
        data: {
          userId: otherUser.id,
          type: NotificationType.SYSTEM,
          title: 'Test',
          body: 'Test',
          read: false,
        },
      });

      await request(app)
        .patch(`/api/v1/notifications/${otherNotification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Clean up
      await cleanupTestUsers([otherUser.id]);
    });

    it('should reject invalid notification ID', async () => {
      await request(app)
        .patch('/api/v1/notifications/invalid-id/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    beforeEach(async () => {
      await prisma.notification.createMany({
        data: [
          {
            userId: authUser.id,
            type: NotificationType.IDEA_RESPONSE,
            title: 'Notification 1',
            body: 'Body 1',
            read: false,
          },
          {
            userId: authUser.id,
            type: NotificationType.QUOTA_WARNING,
            title: 'Notification 2',
            body: 'Body 2',
            read: false,
          },
          {
            userId: authUser.id,
            type: NotificationType.WELCOME,
            title: 'Notification 3',
            body: 'Body 3',
            read: false,
          },
        ],
      });
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All notifications marked as read');

      // Verify all notifications were updated
      const notifications = await prisma.notification.findMany({
        where: { userId: authUser.id },
      });

      expect(notifications.every((n) => n.read === true)).toBe(true);
      expect(notifications.every((n) => n.readAt !== null)).toBe(true);
    });
  });

  describe('POST /api/v1/notifications/test (dev only)', () => {
    it('should send test notification in development', async () => {
      // Skip if not in test/development mode
      if (process.env.NODE_ENV === 'production') {
        return;
      }

      // Register a push token first
      await prisma.notificationToken.create({
        data: {
          userId: authUser.id,
          token: 'ExponentPushToken[test-token]',
          platform: NotificationPlatform.IOS,
          active: true,
        },
      });

      const response = await request(app)
        .post('/api/v1/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: NotificationType.SYSTEM,
          data: { message: 'Test notification' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test notification sent');

      // Verify notification was saved
      const notification = await prisma.notification.findFirst({
        where: {
          userId: authUser.id,
          type: NotificationType.SYSTEM,
        },
      });

      expect(notification).toBeDefined();
    });
  });

  describe('GET /api/v1/notifications/stats', () => {
    beforeEach(async () => {
      // Create test data
      await prisma.notification.createMany({
        data: [
          {
            userId: authUser.id,
            type: NotificationType.IDEA_RESPONSE,
            title: 'Test 1',
            body: 'Body 1',
            read: false,
          },
          {
            userId: authUser.id,
            type: NotificationType.QUOTA_WARNING,
            title: 'Test 2',
            body: 'Body 2',
            read: true,
          },
        ],
      });

      await prisma.notificationToken.create({
        data: {
          userId: authUser.id,
          token: 'ExponentPushToken[test]',
          platform: NotificationPlatform.IOS,
          active: true,
        },
      });
    });

    it('should return notification statistics', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalNotifications');
      expect(response.body.data).toHaveProperty('unreadNotifications');
      expect(response.body.data).toHaveProperty('activeTokens');
      expect(response.body.data).toHaveProperty('pushAdoptionRate');
    });
  });
});
