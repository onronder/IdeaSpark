import { Request, Response, NextFunction } from 'express';
import { SubscriptionPlan } from '@prisma/client';
import { UserController } from '../user.controller';
import { UserService } from '../../services/user.service';
import { ValidationError, NotFoundError } from '../../utils/errors';

// Mock UserService
jest.mock('../../services/user.service');

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        avatar: null,
        emailVerified: false,
        emailVerifiedAt: null,
        subscriptionPlan: SubscriptionPlan.FREE,
        preferences: null,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        subscriptions: [],
      } as any,
      body: {},
      query: {},
      file: undefined,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      get: jest.fn((name: string) => {
        if (name === 'user-agent') return 'test-agent';
        if (name === 'set-cookie') return undefined;
        return undefined;
      }) as any,
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        emailVerified: false,
        subscriptionPlan: 'FREE',
        preferences: null,
        createdAt: new Date('2024-01-01'),
        _count: { ideaSessions: 5 },
      };

      (UserService.getUserProfile as jest.Mock).mockResolvedValue(mockProfile);

      await UserController.getProfile(req as Request, res as Response, next);

      expect(UserService.getUserProfile).toHaveBeenCalledWith('user-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          avatar: null,
          emailVerified: false,
          subscriptionPlan: 'FREE',
          preferences: null,
          createdAt: mockProfile.createdAt,
          subscription: null,
          ideaCount: 5,
        },
      });
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      (UserService.getUserProfile as jest.Mock).mockRejectedValue(error);

      await UserController.getProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      req.body = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const mockUpdatedProfile = {
        id: 'user-123',
        name: 'Updated Name',
        email: 'updated@example.com',
        avatar: null,
        emailVerified: false,
        preferences: null,
      };

      (UserService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedProfile);

      await UserController.updateProfile(req as Request, res as Response, next);

      expect(UserService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        req.body,
        { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: 'user-123',
          email: 'updated@example.com',
          name: 'Updated Name',
          avatar: null,
          emailVerified: false,
          preferences: null,
        },
        message: 'Profile updated successfully',
      });
    });

    it('should handle validation errors', async () => {
      req.body = { email: 'invalid' };
      const error = new ValidationError('Invalid email format');
      (UserService.updateProfile as jest.Mock).mockRejectedValue(error);

      await UserController.updateProfile(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      req.body = {
        currentPassword: 'oldPass123',
        newPassword: 'newPass456',
      };

      (UserService.changePassword as jest.Mock).mockResolvedValue(undefined);

      await UserController.changePassword(req as Request, res as Response, next);

      expect(UserService.changePassword).toHaveBeenCalledWith(
        'user-123',
        { currentPassword: 'oldPass123', newPassword: 'newPass456' },
        { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should handle incorrect password error', async () => {
      req.body = {
        currentPassword: 'wrongPass',
        newPassword: 'newPass456',
      };

      const error = new ValidationError('Current password is incorrect');
      (UserService.changePassword as jest.Mock).mockRejectedValue(error);

      await UserController.changePassword(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('handleAvatarUpload', () => {
    it('should upload avatar successfully', async () => {
      req.file = {
        filename: 'avatar-123.jpg',
        path: '/uploads/avatar-123.jpg',
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const mockAvatarUrl = '/uploads/avatars/avatar-123.jpg';

      (UserService.uploadAvatar as jest.Mock).mockResolvedValue(mockAvatarUrl);

      await UserController.handleAvatarUpload(req as Request, res as Response, next);

      expect(UserService.uploadAvatar).toHaveBeenCalledWith(
        'user-123',
        req.file.buffer,
        'image/jpeg'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          avatarUrl: mockAvatarUrl,
        },
        message: 'Avatar uploaded successfully',
      });
    });

    it('should handle missing file error', async () => {
      req.file = undefined;

      await UserController.handleAvatarUpload(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No file uploaded',
        })
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      req.body = { password: 'userPassword123' };

      (UserService.deleteAccount as jest.Mock).mockResolvedValue(undefined);

      await UserController.deleteAccount(req as Request, res as Response, next);

      expect(UserService.deleteAccount).toHaveBeenCalledWith(
        'user-123',
        'userPassword123',
        { ipAddress: '127.0.0.1', userAgent: 'test-agent' }
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully',
      });
    });

    it('should handle incorrect password for deletion', async () => {
      req.body = { password: 'wrongPassword' };

      const error = new ValidationError('Password is incorrect');
      (UserService.deleteAccount as jest.Mock).mockRejectedValue(error);

      await UserController.deleteAccount(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateNotifications', () => {
    it('should update notification preferences', async () => {
      req.body = {
        email: true,
        push: false,
        ideaUpdates: true,
      };

      (UserService.updateNotificationPreferences as jest.Mock).mockResolvedValue(undefined);

      await UserController.updateNotifications(req as Request, res as Response, next);

      expect(UserService.updateNotificationPreferences).toHaveBeenCalledWith(
        'user-123',
        req.body
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Notification preferences updated',
      });
    });
  });

  describe('updateTheme', () => {
    it('should update theme preference', async () => {
      req.body = { theme: 'dark' };

      (UserService.updateThemePreference as jest.Mock).mockResolvedValue(undefined);

      await UserController.updateTheme(req as Request, res as Response, next);

      expect(UserService.updateThemePreference).toHaveBeenCalledWith(
        'user-123',
        'dark'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Theme preference updated',
      });
    });

    it('should handle invalid theme value', async () => {
      req.body = { theme: 'invalid' };

      const error = new ValidationError('Invalid theme value');
      (UserService.updateThemePreference as jest.Mock).mockRejectedValue(error);

      await UserController.updateTheme(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalIdeas: 10,
        activeIdeas: 5,
        totalMessages: 100,
        totalTokens: 50000,
        totalCost: 25.5,
        memberSince: '2024-01-01',
      };

      (UserService.getUserStats as jest.Mock).mockResolvedValue(mockStats);

      await UserController.getStats(req as Request, res as Response, next);

      expect(UserService.getUserStats).toHaveBeenCalledWith('user-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
      });
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history with default limit', async () => {
      const mockHistory = [
        { action: 'PROFILE_UPDATED', createdAt: new Date() },
        { action: 'PASSWORD_CHANGED', createdAt: new Date() },
      ];

      (UserService.getAuditHistory as jest.Mock).mockResolvedValue(mockHistory);

      await UserController.getAuditHistory(req as Request, res as Response, next);

      expect(UserService.getAuditHistory).toHaveBeenCalledWith('user-123', 50);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });

    it('should return audit history with custom limit', async () => {
      req.query = { limit: '20' };
      const mockHistory = [{ action: 'PROFILE_UPDATED', createdAt: new Date() }];

      (UserService.getAuditHistory as jest.Mock).mockResolvedValue(mockHistory);

      await UserController.getAuditHistory(req as Request, res as Response, next);

      expect(UserService.getAuditHistory).toHaveBeenCalledWith('user-123', 20);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHistory,
      });
    });
  });
});