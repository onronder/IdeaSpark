import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { iapService, PurchaseStatus } from '@/services/iapService';
import { useAuth } from '@/contexts/AuthContext';

// Hook to check subscription status
export function useSubscriptionStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', 'status', user?.id],
    queryFn: async () => {
      // Check local IAP status first
      const localStatus = await iapService.checkSubscriptionStatus();

      // Then verify with backend
      const response = await api.get('/api/v1/subscriptions/status');

      return {
        ...response.data.data,
        localStatus,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to restore purchases
export function useRestorePurchases() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const status = await iapService.restorePurchases();
      return status;
    },
    onSuccess: async (data) => {
      if (data.isActive) {
        // Refresh user data and subscription status
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      }
    },
  });
}

// Hook to get subscription history
export function useSubscriptionHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', 'history', user?.id],
    queryFn: async () => {
      const response = await api.get('/api/v1/subscriptions/history');
      return response.data.data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await api.post(`/api/v1/subscriptions/${subscriptionId}/cancel`);
      return response.data.data;
    },
    onSuccess: async () => {
      // Refresh user data and subscription status
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// Hook to check if user can perform action based on subscription
export function useCanPerformAction() {
  const { user } = useAuth();
  const { data: subscriptionStatus } = useSubscriptionStatus();

  const canCreateIdea = (currentIdeaCount: number): boolean => {
    if (user?.subscriptionPlan === 'PRO') {
      return true;
    }

    // Free plan limits
    const freeIdeaLimit = 3;
    return currentIdeaCount < freeIdeaLimit;
  };

  const canSendMessage = (currentMessageCount: number): boolean => {
    if (user?.subscriptionPlan === 'PRO') {
      return true;
    }

    // Free plan limits
    const freeMessageLimit = 5;
    return currentMessageCount < freeMessageLimit;
  };

  const getRemainingIdeas = (currentIdeaCount: number): number | null => {
    if (user?.subscriptionPlan === 'PRO') {
      return null; // Unlimited
    }

    const freeIdeaLimit = 3;
    return Math.max(0, freeIdeaLimit - currentIdeaCount);
  };

  const getRemainingMessages = (currentMessageCount: number): number | null => {
    if (user?.subscriptionPlan === 'PRO') {
      return null; // Unlimited
    }

    const freeMessageLimit = 5;
    return Math.max(0, freeMessageLimit - currentMessageCount);
  };

  return {
    canCreateIdea,
    canSendMessage,
    getRemainingIdeas,
    getRemainingMessages,
    isPro: user?.subscriptionPlan === 'PRO',
    subscriptionStatus,
  };
}

// Hook to handle subscription-related UI states
export function useSubscriptionUI() {
  const { user } = useAuth();
  const { data: status, isLoading } = useSubscriptionStatus();

  const shouldShowUpgradePrompt = (
    action: 'create_idea' | 'send_message',
    currentCount: number
  ): boolean => {
    if (user?.subscriptionPlan === 'PRO') {
      return false;
    }

    if (action === 'create_idea') {
      return currentCount >= 3;
    }

    if (action === 'send_message') {
      return currentCount >= 5;
    }

    return false;
  };

  const getUpgradeMessage = (action: 'create_idea' | 'send_message'): string => {
    if (action === 'create_idea') {
      return "You've reached your free limit of 3 ideas. Upgrade to Pro for unlimited ideas!";
    }

    if (action === 'send_message') {
      return "You've reached your free limit of 5 messages. Upgrade to Pro for unlimited AI replies!";
    }

    return "Upgrade to Pro for unlimited access!";
  };

  const getBadgeVariant = (): 'free' | 'pro' => {
    return user?.subscriptionPlan === 'PRO' ? 'pro' : 'free';
  };

  const getSubscriptionEndDate = (): Date | null => {
    if (status?.subscription?.currentPeriodEnd) {
      return new Date(status.subscription.currentPeriodEnd);
    }
    return null;
  };

  const isSubscriptionExpiringSoon = (): boolean => {
    const endDate = getSubscriptionEndDate();
    if (!endDate) return false;

    const daysUntilExpiry = Math.floor(
      (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  };

  return {
    isLoading,
    isPro: user?.subscriptionPlan === 'PRO',
    shouldShowUpgradePrompt,
    getUpgradeMessage,
    getBadgeVariant,
    getSubscriptionEndDate,
    isSubscriptionExpiringSoon,
  };
}