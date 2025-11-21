import bcrypt from 'bcryptjs';
import { UserService } from '../user.service';
import { ValidationError, NotFoundError } from '../../utils/errors';

// Mock the database module
jest.mock('../../utils/database', () => {
  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    ideaSession: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      updateMany: jest.fn(),
    },
    ideaMessage: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    aIUsageLog: {
      aggregate: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    subscription: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    $disconnect: jest.fn(),
  };
  return { prisma: mockPrisma };
});

// Mock bcrypt
jest.mock('bcryptjs');

// Get the mocked prisma for use in tests
const { prisma: mockPrisma } = jest.requireMock('../../utils/database');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'avatar-url',
        emailVerified: true,
        subscriptionPlan: 'PRO',
        preferences: { theme: 'dark' },
        createdAt: new Date(),
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await UserService.getUserProfile('user-123');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: expect.objectContaining({
          subscriptions: expect.any(Object),
          _count: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getUserProfile('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'updated@example.com',
        name: 'Updated Name',
      };

      const updates = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      // First call for getUserProfile, second call for email existence check (should return null)
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await UserService.updateProfile('user-123', updates);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const updates = {
        email: 'invalid-email',
      };

      await expect(
        UserService.updateProfile('user-123', updates)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate name length', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const updates = {
        name: 'A'.repeat(101), // Exceeds max length
      };

      await expect(
        UserService.updateProfile('user-123', updates)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-123',
        passwordHash: 'old-hash',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      mockPrisma.user.update.mockResolvedValue({ success: true });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await UserService.changePassword('user-123', {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'old-hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          passwordHash: 'new-hash',
          passwordChangedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw error if current password is incorrect', async () => {
      const mockUser = {
        id: 'user-123',
        passwordHash: 'old-hash',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        UserService.changePassword('user-123', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
        })
      ).rejects.toThrow();
    });

    it('should validate new password strength', async () => {
      const mockUser = {
        id: 'user-123',
        passwordHash: 'old-hash',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        UserService.changePassword('user-123', {
          currentPassword: 'oldPassword',
          newPassword: 'weak',
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete account successfully', async () => {
      const mockUser = {
        id: 'user-123',
        passwordHash: 'password-hash',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const result = await callback(mockPrisma);
        return result;
      });

      await UserService.deleteAccount('user-123', 'correctPassword');

      // Verify the transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = {
        id: 'user-123',
        passwordHash: 'password-hash',
        subscriptions: [],
        _count: { ideaSessions: 0 },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        UserService.deleteAccount('user-123', 'wrongPassword')
      ).rejects.toThrow();
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockUser = {
        id: 'user-123',
        createdAt: new Date('2024-01-01'),
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockPrisma.ideaSession.aggregate.mockResolvedValue({
          _count: { _all: 10 },
        });
        mockPrisma.ideaMessage.aggregate.mockResolvedValue({
          _count: { _all: 50 },
          _sum: { tokens: 1000 },
        });
        mockPrisma.aIUsageLog.aggregate.mockResolvedValue({
          _sum: {
            totalTokens: 10000,
            costUsd: 5.5,
          },
        });
        mockPrisma.ideaSession.count.mockResolvedValue(2);
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);

        return callback(mockPrisma);
      });

      const stats = await UserService.getUserStats('user-123');

      expect(stats.totalIdeas).toBe(10);
      expect(stats.activeIdeas).toBe(2);
      expect(stats.totalMessages).toBe(50);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const preferences = {
        email: true,
        push: false,
        ideaUpdates: true,
        marketing: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        preferences: { theme: 'dark' },
        subscriptions: [],
        _count: { ideaSessions: 0 },
      });

      mockPrisma.user.update.mockResolvedValue({ success: true });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await UserService.updateNotificationPreferences('user-123', preferences);

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('updateThemePreference', () => {
    it('should update theme preference', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        preferences: { notifications: { email: true } },
        subscriptions: [],
        _count: { ideaSessions: 0 },
      });

      mockPrisma.user.update.mockResolvedValue({ success: true });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await UserService.updateThemePreference('user-123', 'dark');

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should validate theme value', async () => {
      await expect(
        UserService.updateThemePreference('user-123', 'invalid' as any)
      ).rejects.toThrow();
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          action: 'PROFILE_UPDATED',
          metadata: {},
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          action: 'PASSWORD_CHANGED',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await UserService.getAuditHistory('user-123', 10);

      expect(result).toEqual(mockAuditLogs);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});