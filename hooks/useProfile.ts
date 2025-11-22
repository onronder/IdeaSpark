import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useErrorHandler } from '@/hooks/useErrorHandler';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// Profile data interface
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  emailVerified: boolean;
  subscriptionPlan: string;
  preferences: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: {
      email: boolean;
      push: boolean;
      ideaUpdates: boolean;
      marketing: boolean;
      weeklyDigest: boolean;
    };
    language?: string;
    timezone?: string;
  };
  createdAt: string;
  subscription?: any;
  ideaCount?: number;
}

// User statistics interface
export interface UserStats {
  totalIdeas: number;
  activeIdeas: number;
  totalMessages: number;
  totalTokens: number;
  totalAiTokens: number;
  totalCost: number;
  memberSince: string;
}

// Hook to fetch user profile
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<UserProfile> => {
      const response = await api.get('/api/v1/users/me');
      return response.data.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { handleError, logger } = useErrorHandler('useUpdateProfile');

  return useMutation({
    mutationFn: async (data: {
      name?: string;
      email?: string;
      preferences?: Partial<UserProfile['preferences']>;
    }) => {
      const response = await api.patch('/api/v1/users/me', data);
      return response.data.data;
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Success', 'Profile updated successfully');
      logger.info('Profile updated');
    },
    onError: (error: any) => {
      handleError(error, 'Failed to update profile');
    },
  });
}

// Hook to change password
export function useChangePassword() {
  const toast = useToast();
  const { signOut } = useAuth();
  const { handleError, logger } = useErrorHandler('useChangePassword');

  return useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const response = await api.post('/api/v1/users/change-password', data);
      return response.data;
    },
    onSuccess: async () => {
      toast.success(
        'Password Changed',
        'Your password has been updated. Please log in again.'
      );
      logger.info('Password changed, logging out');
      // Force logout after password change
      setTimeout(() => {
        signOut();
      }, 2000);
    },
    onError: (error: any) => {
      if (error.response?.data?.code === 'INVALID_PASSWORD') {
        toast.error('Invalid Password', 'Current password is incorrect');
      } else {
        handleError(error, 'Failed to change password');
      }
    },
  });
}

// Hook to upload avatar
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { handleError, logger } = useErrorHandler('useUploadAvatar');

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        toast.error(
          'Permission Denied',
          'We need camera roll permissions to upload an avatar'
        );
        return null;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      logger.error('Image picker error', error);
      return null;
    }
  };

  const uploadAvatar = useMutation({
    mutationFn: async (imageUri: string) => {
      // Create form data
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // For web, convert base64 to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('avatar', blob, 'avatar.jpg');
      } else {
        // For mobile
        formData.append('avatar', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        } as any);
      }

      const response = await api.post('/api/v1/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data;
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Success', 'Avatar updated successfully');
      logger.info('Avatar uploaded');
    },
    onError: (error: any) => {
      handleError(error, 'Failed to upload avatar');
    },
  });

  return {
    pickImage,
    uploadAvatar,
    isUploading: uploadAvatar.isPending,
  };
}

// Hook to delete account
export function useDeleteAccount() {
  const toast = useToast();
  const { signOut } = useAuth();
  const { handleError, logger } = useErrorHandler('useDeleteAccount');

  return useMutation({
    mutationFn: async (password: string) => {
      const response = await api.delete('/api/v1/users/me', {
        data: { password },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        'Account Deleted',
        'Your account has been successfully deleted'
      );
      logger.info('Account deleted');
      // Force logout after deletion
      setTimeout(() => {
        signOut();
      }, 2000);
    },
    onError: (error: any) => {
      if (error.response?.data?.code === 'INVALID_PASSWORD') {
        toast.error('Invalid Password', 'Password is incorrect');
      } else {
        handleError(error, 'Failed to delete account');
      }
    },
  });
}

// Hook to update notification preferences
export function useUpdateNotifications() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('useUpdateNotifications');

  return useMutation({
    mutationFn: async (preferences: Partial<UserProfile['preferences']['notifications']>) => {
      const response = await api.patch('/api/v1/users/notifications', preferences);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Success', 'Notification preferences updated');
      logger.info('Notifications updated');
    },
    onError: (error: any) => {
      handleError(error, 'Failed to update notifications');
    },
  });
}

// Hook to update theme preference
export function useUpdateTheme() {
  const queryClient = useQueryClient();
  const { handleError, logger } = useErrorHandler('useUpdateTheme');

  return useMutation({
    mutationFn: async (theme: 'light' | 'dark' | 'system') => {
      const response = await api.patch('/api/v1/users/theme', { theme });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      logger.info('Theme updated', { theme: data.theme });
    },
    onError: (error: any) => {
      handleError(error, 'Failed to update theme');
    },
  });
}

// Hook to get user statistics
export function useUserStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: async (): Promise<UserStats> => {
      const response = await api.get('/api/v1/users/stats');
      return response.data.data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to get audit history
export function useAuditHistory(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['auditHistory', user?.id, limit],
    queryFn: async () => {
      const response = await api.get('/api/v1/users/audit-history', {
        params: { limit },
      });
      return response.data.data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}