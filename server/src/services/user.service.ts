import { User, Prisma } from '@prisma/client';
import { prisma } from '../utils/database';
import { ApiError, NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors';
import { ProfileValidator } from '../utils/profileValidation';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config';

const userLogger = logger.child({ module: 'user.service' });

// User preferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    ideaUpdates: boolean;
    marketing: boolean;
    weeklyDigest: boolean;
  };
  language: string;
  timezone: string;
}

// Profile update DTO
export interface ProfileUpdateInput {
  name?: string;
  email?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

// Password change DTO
export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

// Audit log entry
interface AuditLogEntry {
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            ideaSessions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: ProfileUpdateInput,
    auditInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<User> {
    const existingUser = await this.getUserProfile(userId);

    // Validate email if provided
    if (updates.email) {
      ProfileValidator.validateEmail(updates.email);

      if (updates.email !== existingUser.email) {
        // Check if new email already exists
        const emailExists = await prisma.user.findUnique({
          where: { email: updates.email },
        });

        if (emailExists) {
          throw new ApiError(400, 'Email already in use', 'EMAIL_IN_USE');
        }

        // TODO: Send verification email to new address
        userLogger.info({
          userId,
          oldEmail: existingUser.email,
          newEmail: updates.email,
        }, 'Email change requested');
      }
    }

    // Validate name if provided
    if (updates.name !== undefined && updates.name !== null) {
      ProfileValidator.validateName(updates.name);
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};

    if (updates.name !== undefined) {
      updateData.name = ProfileValidator.sanitizeInput(updates.name || '');
    }

    if (updates.email !== undefined) {
      updateData.email = updates.email;
      updateData.emailVerified = false; // Reset verification on email change
    }

    if (updates.avatar !== undefined) {
      updateData.avatar = updates.avatar;
    }

    if (updates.preferences !== undefined) {
      // Merge with existing preferences
      const currentPrefs = (existingUser.preferences as any) || {};
      updateData.preferences = {
        ...currentPrefs,
        ...updates.preferences,
        notifications: {
          ...currentPrefs.notifications,
          ...updates.preferences.notifications,
        },
      };
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Log audit entry
    await this.createAuditLog({
      userId,
      action: 'PROFILE_UPDATE',
      details: {
        changes: updates,
        timestamp: new Date(),
      },
      ipAddress: auditInfo?.ipAddress,
      userAgent: auditInfo?.userAgent,
    });

    userLogger.info({
      userId,
      changes: Object.keys(updates),
    }, 'Profile updated');

    return updatedUser;
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    passwordData: PasswordChangeInput,
    auditInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const user = await this.getUserProfile(userId);

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      passwordData.currentPassword,
      user.passwordHash
    );

    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password strength
    try {
      ProfileValidator.validatePassword(passwordData.newPassword);
    } catch (error: any) {
      throw new ApiError(400, error.message, 'WEAK_PASSWORD');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(passwordData.newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Invalidate all refresh tokens (force re-login)
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Log audit entry
    await this.createAuditLog({
      userId,
      action: 'PASSWORD_CHANGE',
      details: {
        timestamp: new Date(),
        forcedLogout: true,
      },
      ipAddress: auditInfo?.ipAddress,
      userAgent: auditInfo?.userAgent,
    });

    userLogger.info({ userId }, 'Password changed');
  }

  /**
   * Upload avatar image
   */
  static async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new ApiError(400, 'Invalid file type', 'INVALID_FILE_TYPE');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new ApiError(400, 'File too large (max 5MB)', 'FILE_TOO_LARGE');
    }

    // Generate unique filename
    const fileExtension = mimeType.split('/')[1];
    const fileName = `${userId}_${uuidv4()}.${fileExtension}`;

    // For MVP, store locally (in production, use S3/CloudStorage)
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, fileBuffer);

    // Generate public URL
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Update user avatar
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    // Log audit entry
    await this.createAuditLog({
      userId,
      action: 'AVATAR_UPLOAD',
      details: {
        fileName,
        mimeType,
        size: fileBuffer.length,
      },
    });

    userLogger.info({ userId, fileName }, 'Avatar uploaded');

    return avatarUrl;
  }

  /**
   * Delete user account (soft delete)
   */
  static async deleteAccount(
    userId: string,
    password: string,
    auditInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const user = await this.getUserProfile(userId);

    // Verify password for security
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Perform soft delete
    const deletedAt = new Date();
    const anonymizedEmail = `deleted_${userId}@removed.com`;

    await prisma.$transaction(async (tx) => {
      // Update user to soft deleted state
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: 'Deleted User',
          avatar: null,
          passwordHash: '', // Clear password
          deletedAt,
          preferences: {},
        },
      });

      // Cancel active subscriptions
      await tx.subscription.updateMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: deletedAt,
        },
      });

      // Archive idea sessions
      await tx.ideaSession.updateMany({
        where: { userId },
        data: {
          status: 'ARCHIVED',
          archivedAt: deletedAt,
        },
      });

      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId },
      });
    });

    // Log audit entry
    await this.createAuditLog({
      userId,
      action: 'ACCOUNT_DELETION',
      details: {
        timestamp: deletedAt,
        dataRetention: '30_days', // Keep for 30 days before hard delete
      },
      ipAddress: auditInfo?.ipAddress,
      userAgent: auditInfo?.userAgent,
    });

    // Schedule hard delete job (after retention period)
    // TODO: Implement background job for permanent deletion

    userLogger.info({ userId }, 'Account deleted (soft)');
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<UserPreferences['notifications']>
  ): Promise<User> {
    const user = await this.getUserProfile(userId);

    const currentPrefs = (user.preferences as any) || {};
    const updatedPrefs = {
      ...currentPrefs,
      notifications: {
        ...currentPrefs.notifications,
        ...preferences,
      },
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPrefs,
      },
    });

    // Log audit entry
    await this.createAuditLog({
      userId,
      action: 'NOTIFICATION_PREFERENCES_UPDATE',
      details: preferences,
    });

    userLogger.info({
      userId,
      preferences,
    }, 'Notification preferences updated');

    return updatedUser;
  }

  /**
   * Update theme preference
   */
  static async updateThemePreference(
    userId: string,
    theme: 'light' | 'dark' | 'system'
  ): Promise<User> {
    // Validate theme value
    try {
      ProfileValidator.validateTheme(theme);
    } catch (error: any) {
      throw new ApiError(400, error.message, 'INVALID_THEME');
    }

    const user = await this.getUserProfile(userId);

    const currentPrefs = (user.preferences as any) || {};
    const updatedPrefs = {
      ...currentPrefs,
      theme,
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPrefs,
      },
    });

    // Log audit entry
    await this.createAuditLog({
      userId,
      action: 'THEME_UPDATE',
      details: { theme },
    });

    userLogger.info({
      userId,
      theme,
    }, 'Theme preference updated');

    return updatedUser;
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<any> {
    const stats = await prisma.$transaction(async (tx) => {
      const ideaStats = await tx.ideaSession.aggregate({
        where: { userId },
        _count: {
          _all: true,
        },
      });

      const messageStats = await tx.ideaMessage.aggregate({
        where: {
          ideaSession: {
            userId,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          tokens: true,
        },
      });

      const aiUsageStats = await tx.aIUsageLog.aggregate({
        where: { userId },
        _sum: {
          totalTokens: true,
          costUsd: true,
        },
      });

      const activeIdeas = await tx.ideaSession.count({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      return {
        totalIdeas: ideaStats._count._all || 0,
        activeIdeas,
        totalMessages: messageStats._count._all || 0,
        totalTokens: messageStats._sum.tokens || 0,
        totalAiTokens: aiUsageStats._sum.totalTokens || 0,
        totalCost: aiUsageStats._sum.costUsd || 0,
        memberSince: (await tx.user.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        }))?.createdAt,
      };
    });

    return stats;
  }

  /**
   * Create audit log entry
   */
  private static async createAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          metadata: {
            ...entry.details,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
          },
        },
      });
    } catch (error) {
      userLogger.error({ err: error }, 'Failed to create audit log');
      // Don't throw - audit logging shouldn't break operations
    }
  }

  /**
   * Get user's audit history
   */
  static async getAuditHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }));
  }
}