import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import apiClient, { ApiResponse } from '@/lib/api';
import { useAuth } from "@/contexts/SupabaseAuthContext";

// Import types from the shared types package
import type {
  IdeaSessionDTO,
  IdeaMessageDTO,
  CreateIdeaDTO,
  UpdateIdeaDTO,
  SendMessageDTO,
  UsageSummaryDTO
} from '@ideaspark/types';

// Ideas hooks
export function useIdeas() {
  return useQuery({
    queryKey: ['ideas'],
    queryFn: async () => {
      const response = await apiClient.get<IdeaSessionDTO[]>('/ideas');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useIdea(id: string | null) {
  return useQuery({
    queryKey: ['ideas', id],
    queryFn: async () => {
      if (!id) throw new Error('Idea ID is required');
      const response = await apiClient.get<IdeaSessionDTO>(`/ideas/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateIdeaDTO) => {
      const response = await apiClient.post<IdeaSessionDTO>('/ideas', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIdeaDTO }) => {
      const response = await apiClient.patch<IdeaSessionDTO>(`/ideas/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.id] });
    },
  });
}

// Messages hooks
export function useMessages(ideaId: string | null) {
  return useQuery({
    queryKey: ['messages', ideaId],
    queryFn: async () => {
      if (!ideaId) throw new Error('Idea ID is required');
      const response = await apiClient.get<IdeaMessageDTO[]>(`/ideas/${ideaId}/messages`);
      return response.data || [];
    },
    enabled: !!ideaId,
    // Let consumers decide when to refetch (e.g., ChatScreen polls
    // only while waiting for an AI reply) to avoid unnecessary
    // background traffic and re-renders on every screen.
    staleTime: 10 * 1000,
    keepPreviousData: true,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, content }: { ideaId: string; content: string }) => {
      const response = await apiClient.post<{
        userMessage: IdeaMessageDTO;
        assistantMessage: IdeaMessageDTO;
        remainingReplies: number | null;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          estimatedCost: number;
        };
      }>(`/ideas/${ideaId}/messages`, { content });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.ideaId] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// Usage hooks
export function useUsageSummary() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const response = await apiClient.get<UsageSummaryDTO>('/ideas/usage');
      return response.data;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// User hooks
export function useCurrentUser() {
  const { user, updateUser } = useAuth();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      if (response.data) {
        updateUser(response.data);
      }
      return response.data;
    },
    initialData: user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: async (data: { name?: string; email?: string }) => {
      const response = await apiClient.patch('/users/me', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        updateUser(data);
      }
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

// Password management
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.post('/users/change-password', data);
      return response.data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiClient.post('/auth/reset-password', data);
      return response.data;
    },
  });
}

// Subscription hooks
export function useUpgradePlan() {
  return useMutation({
    mutationFn: async (planId: 'PRO' | 'ENTERPRISE') => {
      const response = await apiClient.post('/billing/checkout', { planId });
      return response.data;
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/billing/cancel');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

// Notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: async (preferences: {
      email?: boolean;
      push?: boolean;
      marketing?: boolean;
      ideaUpdates?: boolean;
      weeklyDigest?: boolean;
    }) => {
      const response = await apiClient.patch('/users/notifications', preferences);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        updateUser(data);
      }
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

// Theme preference
export function useUpdateTheme() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: async (theme: 'light' | 'dark' | 'system') => {
      const response = await apiClient.patch('/users/theme', { theme });
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        updateUser(data);
      }
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

// Account deletion
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (password: string) => {
      const response = await apiClient.delete('/users/me', {
        data: { password },
      });
      return response.data;
    },
  });
}
