import { useEffect, useCallback } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { useAuth } from "@/contexts/SupabaseAuthContext";

/**
 * Hook for analytics tracking
 */
export function useAnalytics() {
  const { user } = useAuth();

  // Initialize analytics and identify user when auth state changes
  useEffect(() => {
    const init = async () => {
      await analyticsService.initialize({ userId: user?.id });

      if (user) {
        await analyticsService.identifyUser({
          userId: user.id,
          properties: {
            email: user.email,
            name: user.name,
            subscription_plan: user.subscriptionPlan || 'FREE',
            email_verified: user.emailVerified,
          },
        });

        if (user.subscriptionPlan) {
          await analyticsService.setUserGroup({
            groupType: 'subscription_plan',
            groupName: user.subscriptionPlan,
          });
        }
      } else {
        await analyticsService.reset();
      }
    };

    init().catch((err) => {
      logger.warn('Analytics init failed', err);
    });
  }, [user?.id]);

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

  // Flush queued events (for testing)
  const flushAnalytics = useCallback(() => {
    analyticsService.flush();
  }, []);

  // Update user consent and ensure identification is in sync
  const setUserConsent = useCallback(
    async (consent: boolean) => {
      try {
        await analyticsService.setUserConsent(consent);

        if (consent && user) {
          await analyticsService.identifyUser({
            userId: user.id,
            properties: {
              email: user.email,
              name: user.name,
              subscription_plan: user.subscriptionPlan || 'FREE',
              email_verified: user.emailVerified,
            },
          });

          if (user.subscriptionPlan) {
            await analyticsService.setUserGroup({
              groupType: 'subscription_plan',
              groupName: user.subscriptionPlan,
            });
          }
        }

        if (!consent) {
          await analyticsService.reset();
        }
      } catch (err) {
        logger.warn('Failed to update analytics consent', err);
      }
    },
    [
      user?.id,
      user?.email,
      user?.name,
      user?.subscriptionPlan,
      user?.emailVerified,
    ]
  );

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
    flushAnalytics,
    setUserConsent,
  };
}
