import { prisma } from '../utils/database';
import { firebaseService } from './firebase.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';
import { NotificationType, NotificationPlatform } from '@prisma/client';

const notificationLogger = logger.child({ module: 'notification.service' });

// Notification templates
const NOTIFICATION_TEMPLATES = {
  IDEA_RESPONSE: {
    title: 'AI Response Ready',
    body: 'Your AI has generated new insights for your idea',
  },
  QUOTA_WARNING: {
    title: 'Quota Warning',
    body: 'You have {remaining} messages left in your free tier',
  },
  QUOTA_EXCEEDED: {
    title: 'Quota Exceeded',
    body: 'You\'ve reached your free tier limit. Upgrade to Pro for unlimited messages',
  },
  SUBSCRIPTION_EXPIRING: {
    title: 'Subscription Expiring Soon',
    body: 'Your Pro subscription expires in {days} days',
  },
  SUBSCRIPTION_RENEWED: {
    title: 'Subscription Renewed',
    body: 'Your Pro subscription has been renewed successfully',
  },
  PAYMENT_FAILED: {
    title: 'Payment Failed',
    body: 'We couldn\'t process your payment. Please update your payment method',
  },
  WELCOME: {
    title: 'Welcome to IdeaSpark',
    body: 'Start exploring your ideas with AI-powered insights',
  },
  FEATURE_ANNOUNCEMENT: {
    title: 'New Feature',
    body: '{feature} is now available. Check it out!',
  },
  SYSTEM: {
    title: 'System Update',
    body: '{message}',
  },
};

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  data?: Record<string, any>;
  saveToDb?: boolean;
}

export interface PushTokenRegistration {
  userId: string;
  token: string;
  platform: NotificationPlatform;
  deviceId?: string;
  deviceName?: string;
}

export class NotificationService {
  /**
   * Register or update push token for a user
   */
  static async registerPushToken(registration: PushTokenRegistration): Promise<void> {
    try {
      // Validate token with Firebase
      const isValid = await firebaseService.validateToken(registration.token);

      if (!isValid) {
        throw new ApiError(400, 'Invalid push token', 'INVALID_TOKEN');
      }

      // Check if token already exists
      const existingToken = await prisma.notificationToken.findUnique({
        where: { token: registration.token },
      });

      if (existingToken) {
        // Update existing token
        await prisma.notificationToken.update({
          where: { token: registration.token },
          data: {
            userId: registration.userId,
            platform: registration.platform,
            deviceId: registration.deviceId,
            deviceName: registration.deviceName,
            active: true,
            lastUsedAt: new Date(),
          },
        });

        notificationLogger.info({
          userId: registration.userId,
          platform: registration.platform,
        }, 'Push token updated');
      } else {
        // Create new token
        await prisma.notificationToken.create({
          data: {
            userId: registration.userId,
            token: registration.token,
            platform: registration.platform,
            deviceId: registration.deviceId,
            deviceName: registration.deviceName,
            active: true,
          },
        });

        notificationLogger.info({
          userId: registration.userId,
          platform: registration.platform,
        }, 'Push token registered');
      }

      // Subscribe to user-specific topic
      await firebaseService.subscribeToTopic([registration.token], `user_${registration.userId}`);

      // Subscribe to general topics based on user preferences
      const user = await prisma.user.findUnique({
        where: { id: registration.userId },
        select: { preferences: true, subscriptionPlan: true },
      });

      if (user) {
        // Subscribe to plan-specific topic
        await firebaseService.subscribeToTopic([registration.token], `plan_${user.subscriptionPlan}`);

        // Subscribe to marketing if enabled
        const prefs = user.preferences as any;
        if (prefs?.notifications?.marketing) {
          await firebaseService.subscribeToTopic([registration.token], 'marketing');
        }
      }
    } catch (error: any) {
      notificationLogger.error({ err: error }, 'Failed to register push token');
      throw error;
    }
  }

  /**
   * Unregister push token
   */
  static async unregisterPushToken(token: string): Promise<void> {
    try {
      const notificationToken = await prisma.notificationToken.findUnique({
        where: { token },
      });

      if (!notificationToken) {
        return;
      }

      // Mark token as inactive
      await prisma.notificationToken.update({
        where: { token },
        data: { active: false },
      });

      // Unsubscribe from all topics
      await firebaseService.unsubscribeFromTopic([token], `user_${notificationToken.userId}`);

      notificationLogger.info({
        userId: notificationToken.userId,
      }, 'Push token unregistered');
    } catch (error: any) {
      notificationLogger.error({ err: error }, 'Failed to unregister push token');
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  static async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          preferences: true,
          notificationTokens: {
            where: { active: true },
          },
        },
      });

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      // Check notification preferences
      const prefs = user.preferences as any;
      if (!this.shouldSendNotification(payload.type, prefs?.notifications)) {
        notificationLogger.info({
          userId: payload.userId,
          type: payload.type,
        }, 'Notification skipped due to preferences');
        return;
      }

      // Get notification template
      const template = NOTIFICATION_TEMPLATES[payload.type];
      if (!template) {
        throw new ApiError(400, 'Invalid notification type', 'INVALID_NOTIFICATION_TYPE');
      }

      // Build notification content
      let title = template.title;
      let body = template.body;

      // Replace placeholders in template
      if (payload.data) {
        Object.entries(payload.data).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, String(value));
          body = body.replace(`{${key}}`, String(value));
        });
      }

      // Send to all active tokens
      if (user.notificationTokens.length > 0) {
        const tokens = user.notificationTokens.map(t => t.token);

        const response = await firebaseService.sendMulticastNotification(
          tokens,
          title,
          body,
          {
            type: payload.type,
            ...payload.data,
          }
        );

        // Handle failed tokens
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
              const token = tokens[idx];
              if (token) {
                failedTokens.push(token);
              }
            }
          });

          // Mark failed tokens as inactive
          if (failedTokens.length > 0) {
            await prisma.notificationToken.updateMany({
              where: { token: { in: failedTokens } },
              data: { active: false },
            });
          }
        }
      }

      // Save notification to database if requested
      if (payload.saveToDb) {
        await prisma.notification.create({
          data: {
            userId: payload.userId,
            type: payload.type,
            title,
            body,
            data: payload.data,
          },
        });
      }

      notificationLogger.info({
        userId: payload.userId,
        type: payload.type,
        tokenCount: user.notificationTokens.length,
      }, 'Notification sent');
    } catch (error: any) {
      notificationLogger.error({ err: error }, 'Failed to send notification');
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    data?: Record<string, any>
  ): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendNotification({ userId, type, data, saveToDb: true })
        .catch(error => {
          notificationLogger.error({
            userId,
            error: error.message,
          }, 'Bulk notification failed for user');
        })
    );

    await Promise.all(promises);
  }

  /**
   * Send topic notification
   */
  static async sendTopicNotification(
    topic: string,
    type: NotificationType,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      if (!template) {
        throw new ApiError(400, 'Invalid notification type', 'INVALID_NOTIFICATION_TYPE');
      }

      let title = template.title;
      let body = template.body;

      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, String(value));
          body = body.replace(`{${key}}`, String(value));
        });
      }

      await firebaseService.sendTopicNotification(topic, title, body, { type, ...data });

      notificationLogger.info({ topic, type }, 'Topic notification sent');
    } catch (error: any) {
      notificationLogger.error({ err: error }, 'Failed to send topic notification');
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns the notification
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.notification.deleteMany({
      where: {
        sentAt: { lt: cutoffDate },
        read: true, // Only delete read notifications
      },
    });

    notificationLogger.info({
      count: result.count,
      cutoffDate,
    }, 'Old notifications cleaned up');

    return result.count;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private static shouldSendNotification(
    type: NotificationType,
    preferences?: any
  ): boolean {
    if (!preferences) {
      return true; // Default to sending if no preferences set
    }

    // Check push notification preference
    if (preferences.push === false) {
      return false;
    }

    // Check specific notification type preferences
    switch (type) {
      case 'IDEA_RESPONSE':
        return preferences.ideaUpdates !== false;
      case 'FEATURE_ANNOUNCEMENT':
      case 'SYSTEM':
        return preferences.marketing !== false;
      case 'QUOTA_WARNING':
      case 'QUOTA_EXCEEDED':
      case 'SUBSCRIPTION_EXPIRING':
      case 'SUBSCRIPTION_RENEWED':
      case 'PAYMENT_FAILED':
        return true; // Always send billing-related notifications
      case 'WELCOME':
        return true; // Always send welcome notification
      default:
        return true;
    }
  }

  /**
   * Send notification after AI response
   */
  static async notifyAIResponseReady(
    userId: string,
    ideaSessionId: string,
    ideaTitle: string
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'IDEA_RESPONSE',
      data: {
        ideaSessionId,
        ideaTitle,
      },
      saveToDb: true,
    });
  }

  /**
   * Send quota warning notification
   */
  static async notifyQuotaWarning(userId: string, remaining: number): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'QUOTA_WARNING',
      data: { remaining },
      saveToDb: true,
    });
  }

  /**
   * Send quota exceeded notification
   */
  static async notifyQuotaExceeded(userId: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'QUOTA_EXCEEDED',
      saveToDb: true,
    });
  }
}