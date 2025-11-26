import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';
import multer from 'multer';

const userLogger = logger.child({ module: 'user.controller' });

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

export class UserController {
  // Multer middleware for avatar upload
  static uploadAvatar = upload.single('avatar');

  /**
   * Get current user profile
   * GET /api/v1/users/me
   */
  static async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const profile = await UserService.getUserProfile(req.user.id);

      res.json({
        success: true,
        data: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          emailVerified: profile.emailVerified,
          subscriptionPlan: profile.subscriptionPlan,
          preferences: profile.preferences,
          createdAt: profile.createdAt,
          subscription: (profile as any).subscription?.[0] || null,
          ideaCount: (profile as any)._count?.ideaSessions || 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PATCH /api/v1/users/me
   */
  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { name, email, preferences } = req.body;

      const updatedProfile = await UserService.updateProfile(
        req.user.id,
        {
          name,
          email,
          preferences,
        },
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );

      res.json({
        success: true,
        data: {
          id: updatedProfile.id,
          email: updatedProfile.email,
          name: updatedProfile.name,
          avatar: updatedProfile.avatar,
          emailVerified: updatedProfile.emailVerified,
          preferences: updatedProfile.preferences,
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/v1/users/change-password
   */
  static async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ApiError(400, 'Both current and new passwords are required', 'INVALID_INPUT');
      }

      await UserService.changePassword(
        req.user.id,
        { currentPassword, newPassword },
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload avatar
   * POST /api/v1/users/avatar
   */
  static async handleAvatarUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      if (!req.file) {
        throw new ApiError(400, 'No file uploaded', 'NO_FILE');
      }

      const avatarUrl = await UserService.uploadAvatar(
        req.user.id,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: {
          avatarUrl,
        },
        message: 'Avatar uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account
   * DELETE /api/v1/users/me
   */
  static async deleteAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { password } = req.body;

      if (!password) {
        throw new ApiError(400, 'Password is required for account deletion', 'PASSWORD_REQUIRED');
      }

      await UserService.deleteAccount(
        req.user.id,
        password,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update notification preferences
   * PATCH /api/v1/users/notifications
   */
  static async updateNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const preferences = req.body;

      const updatedUser = await UserService.updateNotificationPreferences(
        req.user.id,
        preferences
      );

      res.json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          emailVerified: updatedUser.emailVerified,
          subscriptionPlan: updatedUser.subscriptionPlan,
          preferences: updatedUser.preferences,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: 'Notification preferences updated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update theme preference
   * PATCH /api/v1/users/theme
   */
  static async updateTheme(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { theme } = req.body;

      if (!['light', 'dark', 'system'].includes(theme)) {
        throw new ApiError(400, 'Invalid theme value', 'INVALID_THEME');
      }

      const updatedUser = await UserService.updateThemePreference(
        req.user.id,
        theme
      );

      res.json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatar: updatedUser.avatar,
          emailVerified: updatedUser.emailVerified,
          subscriptionPlan: updatedUser.subscriptionPlan,
          preferences: updatedUser.preferences,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        message: 'Theme preference updated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/v1/users/stats
   */
  static async getStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const stats = await UserService.getUserStats(req.user.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get audit history
   * GET /api/v1/users/audit-history
   */
  static async getAuditHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await UserService.getAuditHistory(req.user.id, limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}
