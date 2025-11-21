import { useEffect, useCallback } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { useAuth } from './useAuth';

/**
 * Hook for analytics tracking
 */
export function useAnalytics() {
  const { user } = useAuth();

  // Initialize analytics when user changes
  useEffect(() => {
    if (user) {
      analyticsService.identifyUser({
        userId: user.id,
        properties: {
          email: user.email,
          name: user.name,
          subscription_plan: user.subscriptionPlan || 'FREE',
          email_verified: user.emailVerified,
        },
      });

      // Set subscription plan group
      if (user.subscriptionPlan) {
        analyticsService.setUserGroup({
          groupType: 'subscription_plan',
          groupName: user.subscriptionPlan,
        });
      }
    }
  }, [user]);

  // Track event
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      analyticsService.trackEvent({ eventName, properties });
    },
    []
  );

  // Track signup
  const trackSignup = useCallback(
    (params: {
      method?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    }) => {
      analyticsService.trackSignup(params);
    },
    []
  );

  // Track login
  const trackLogin = useCallback((method?: string) => {
    analyticsService.trackLogin(method);
  }, []);

  // Track idea created
  const trackIdeaCreated = useCallback(
    (params: { ideaId: string; category: string }) => {
      analyticsService.trackIdeaCreated(params);
    },
    []
  );

  // Track message sent
  const trackMessageSent = useCallback(
    (params: { ideaId: string; messageLength: number }) => {
      analyticsService.trackMessageSent(params);
    },
    []
  );

  // Track upgrade viewed
  const trackUpgradeViewed = useCallback((source?: string) => {
    analyticsService.trackUpgradeViewed(source);
  }, []);

  // Track subscription purchased
  const trackSubscriptionPurchased = useCallback(
    (params: { plan: string; amount: number; period: 'monthly' | 'yearly' }) => {
      analyticsService.trackSubscriptionPurchased(params);
    },
    []
  );

  // Track error
  const trackError = useCallback(
    (error: Error, context?: string) => {
      analyticsService.trackError({ error, context });
    },
    []
  );

  // Reset analytics
  const resetAnalytics = useCallback(() => {
    analyticsService.reset();
  }, []);

  return {
    trackEvent,
    trackSignup,
    trackLogin,
    trackIdeaCreated,
    trackMessageSent,
    trackUpgradeViewed,
    trackSubscriptionPurchased,
    trackError,
    resetAnalytics,
  };
}
