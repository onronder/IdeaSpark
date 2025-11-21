import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { NotificationPlatform } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../utils/database';

const notificationLogger = logger.child({ module: 'notification.controller' });

export class NotificationController {
  /**
   * Register push token
   */
  static async registerToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { token, platform, deviceId, deviceName } = req.body;

      // Validate platform
      if (!Object.values(NotificationPlatform).includes(platform)) {
        throw new ApiError(400, 'Invalid platform', 'INVALID_PLATFORM');
      }

      await NotificationService.registerPushToken({
        userId,
        token,
        platform,
        deviceId,
        deviceName,
      });

      res.json({
        success: true,
        message: 'Push token registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unregister push token
   */
  static async unregisterToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      await NotificationService.unregisterPushToken(token);

      res.json({
        success: true,
        message: 'Push token unregistered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user notifications
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await NotificationService.getUserNotifications(userId, limit, offset);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { notificationId } = req.params;

      if (!notificationId) {
        throw new ApiError(400, 'Notification ID is required', 'MISSING_ID');
      }

      await NotificationService.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;

      await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test notification (dev only)
   */
  static async testNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        throw new ApiError(403, 'Test endpoint disabled in production', 'FORBIDDEN');
      }

      const userId = req.user!.id;
      const { type, data } = req.body;

      await NotificationService.sendNotification({
        userId,
        type: type || 'SYSTEM',
        data: data || { message: 'This is a test notification' },
        saveToDb: true,
      });

      res.json({
        success: true,
        message: 'Test notification sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notification statistics (admin)
   */
  static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This would be admin-only in production
      const stats = await prisma.$transaction(async (tx) => {
        const totalNotifications = await tx.notification.count();
        const unreadNotifications = await tx.notification.count({
          where: { read: false },
        });
        const activeTokens = await tx.notificationToken.count({
          where: { active: true },
        });
        const totalUsers = await tx.user.count();
        const usersWithTokens = await tx.notificationToken.groupBy({
          by: ['userId'],
        });

        return {
          totalNotifications,
          unreadNotifications,
          activeTokens,
          totalUsers,
          usersWithPushEnabled: usersWithTokens.length,
          pushAdoptionRate: (usersWithTokens.length / totalUsers) * 100,
        };
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}