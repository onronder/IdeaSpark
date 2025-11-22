import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useUserProfile,
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
  useUpdateNotifications,
  useUpdateTheme,
  useUserStats,
} from '../useProfile';
import api from '@/lib/api';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from '@/contexts/ToastContext';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('@/services/api');
jest.mock('@/contexts/AuthContext');
jest.mock('@/contexts/ToastContext');
jest.mock('expo-image-picker');

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProfile hooks', () => {
  let mockToast: any;
  let mockAuth: any;

  beforeEach(() => {
    mockToast = {
      success: jest.fn(),
      error: jest.fn(),
    };
    mockAuth = {
      user: { id: 'user-123' },
      refreshUser: jest.fn(),
      signOut: jest.fn(),
    };

    (useToast as jest.Mock).mockReturnValue(mockToast);
    (useAuth as jest.Mock).mockReturnValue(mockAuth);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        emailVerified: true,
        subscriptionPlan: 'FREE',
        preferences: {},
        createdAt: '2024-01-01',
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockProfile },
      });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProfile);
      expect(api.get).toHaveBeenCalledWith('/api/v1/users/me');
    });

    it('should not fetch if user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        refreshUser: jest.fn(),
        signOut: jest.fn(),
      });

      const { result } = renderHook(() => useUserProfile(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isIdle).toBe(true);
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = { name: 'Updated Name' };
      const mockResponse = { id: 'user-123', name: 'Updated Name' };

      (api.patch as jest.Mock).mockResolvedValue({
        data: { data: mockResponse },
      });

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(updateData);
      });

      expect(api.patch).toHaveBeenCalledWith('/api/v1/users/me', updateData);
      expect(mockAuth.refreshUser).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Success',
        'Profile updated successfully'
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      (api.patch as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'Test' });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('useChangePassword', () => {
    it('should change password and force logout', async () => {
      jest.useFakeTimers();

      (api.post as jest.Mock).mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          currentPassword: 'old123',
          newPassword: 'new456',
        });
      });

      expect(api.post).toHaveBeenCalledWith('/api/v1/users/change-password', {
        currentPassword: 'old123',
        newPassword: 'new456',
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'Password Changed',
        'Your password has been updated. Please log in again.'
      );

      // Fast-forward timer to trigger logout
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockAuth.signOut).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle invalid password error', async () => {
      const error = {
        response: {
          data: { code: 'INVALID_PASSWORD' },
        },
      };
      (api.post as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            currentPassword: 'wrong',
            newPassword: 'new456',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        'Invalid Password',
        'Current password is incorrect'
      );
    });
  });

  describe('useDeleteAccount', () => {
    it('should delete account and logout', async () => {
      jest.useFakeTimers();

      (api.delete as jest.Mock).mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('password123');
      });

      expect(api.delete).toHaveBeenCalledWith('/api/v1/users/me', {
        data: { password: 'password123' },
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'Account Deleted',
        'Your account has been successfully deleted'
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockAuth.signOut).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('useUpdateNotifications', () => {
    it('should update notification preferences', async () => {
      const prefs = { email: true, push: false };
      (api.patch as jest.Mock).mockResolvedValue({ data: { data: {} } });

      const { result } = renderHook(() => useUpdateNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(prefs);
      });

      expect(api.patch).toHaveBeenCalledWith('/api/v1/users/notifications', prefs);
      expect(mockToast.success).toHaveBeenCalledWith(
        'Success',
        'Notification preferences updated'
      );
    });
  });

  describe('useUpdateTheme', () => {
    it('should update theme preference', async () => {
      (api.patch as jest.Mock).mockResolvedValue({
        data: { data: { theme: 'dark' } },
      });

      const { result } = renderHook(() => useUpdateTheme(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('dark');
      });

      expect(api.patch).toHaveBeenCalledWith('/api/v1/users/theme', {
        theme: 'dark',
      });
    });
  });

  describe('useUserStats', () => {
    it('should fetch user statistics', async () => {
      const mockStats = {
        totalIdeas: 10,
        activeIdeas: 5,
        totalMessages: 100,
        totalTokens: 50000,
        totalCost: 25.5,
        memberSince: '2024-01-01',
      };

      (api.get as jest.Mock).mockResolvedValue({
        data: { data: mockStats },
      });

      const { result } = renderHook(() => useUserStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(api.get).toHaveBeenCalledWith('/api/v1/users/stats');
    });
  });
});