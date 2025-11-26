import * as amplitude from '@amplitude/analytics-react-native';
import { logger } from '@/hooks/useLogger';
logger.setComponent('AnalyticsService');

import * as Device from 'expo-device';
import { logger } from '@/hooks/useLogger';
logger.setComponent('AnalyticsService');

import Constants from 'expo-constants';
import { logger } from '@/hooks/useLogger';
logger.setComponent('AnalyticsService');

import { Platform } from 'react-native';
import { logger } from '@/hooks/useLogger';
logger.setComponent('AnalyticsService');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/hooks/useLogger';
logger.setComponent('AnalyticsService');


/**
 * Analytics Service
 * Handles event tracking, user identification, and analytics for the mobile app
 */
class AnalyticsService {
  private isInitialized = false;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private userConsent = false;

  /**
   * Initialize analytics service
   */
  async initialize(params?: { userId?: string; userConsent?: boolean }): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check for user consent (GDPR/CCPA compliance)
      const consentStored = await AsyncStorage.getItem('analyticsConsent');
      this.userConsent = params?.userConsent ?? (consentStored === 'true');

      if (!this.userConsent) {
        logger.info('Analytics consent not granted');
        return;
      }

      // Get Amplitude API key from environment
      // Prefer EXPO_PUBLIC_AMPLITUDE_API_KEY so the same name is used
      // across mobile and backend, but fall back to AMPLITUDE_API_KEY
      // (legacy) and expo extra config for flexibility.
      const amplitudeApiKey =
        process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY ||
        process.env.AMPLITUDE_API_KEY ||
        Constants.expoConfig?.extra?.amplitudeApiKey;

      if (!amplitudeApiKey) {
        logger.warn('Amplitude API key not configured');
        return;
      }

      // Generate or retrieve session ID
      this.sessionId = await this.getOrCreateSessionId();

      // Polyfill a minimal global document object so Amplitude's
      // cookie-based storage checks don't crash in React Native.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalScope: any = globalThis || global;
        if (globalScope && !globalScope.document) {
          globalScope.document = { cookie: '' };
        } else if (globalScope && typeof globalScope.document.cookie === 'undefined') {
          globalScope.document.cookie = '';
        }
      } catch {
        // If polyfill fails, we still proceed; the SDK may fall back to local/memory storage.
      }

      // Initialize Amplitude
      // The SDK logs an internal cookie test error in some dev setups,
      // which shows as a red screen in React Native because it uses console.error.
      // Temporarily silence just that specific log during initialization.
      const originalConsoleError = console.error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error = (...args: any[]) => {
        // Ignore the noisy internal cookie test error from the Amplitude SDK
        // that can appear in some React Native dev setups.
        const shouldIgnore = args.some(
          (arg) =>
            typeof arg === 'string' &&
            arg.includes('Failed to set cookie for key: AMP_TEST')
        );

        if (shouldIgnore) {
          return;
        }

        // Forward all other errors
        // eslint-disable-next-line prefer-spread
        originalConsoleError.apply(console, args as never);
      };

      try {
        // Initialize Amplitude using official pattern
        await amplitude.init(amplitudeApiKey, params?.userId, {
          logLevel: amplitude.Types.LogLevel.Debug, // Debug logging for troubleshooting
          flushIntervalMillis: 1000, // Flush every second
          flushQueueSize: 5, // Flush after 5 events (lower for testing)
          trackingOptions: {
            ipAddress: false, // Don't track IP for privacy
          },
        }).promise;

        logger.info('✅ Amplitude initialized successfully');
      } catch (err) {
        logger.warn('Amplitude init failed', err);
      } finally {
        console.error = originalConsoleError;
      }

      if (params?.userId) {
        this.userId = params.userId;
      }

      this.isInitialized = true;
      logger.info('Analytics initialized');
    } catch (error) {
      logger.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Get or create a session ID
   */
  private async getOrCreateSessionId(): Promise<string> {
    let sessionId = await AsyncStorage.getItem('analyticsSessionId');

    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem('analyticsSessionId', sessionId);
    }

    return sessionId;
  }

  /**
   * Set user consent for analytics tracking
   */
  async setUserConsent(consent: boolean): Promise<void> {
    this.userConsent = consent;
    await AsyncStorage.setItem('analyticsConsent', consent.toString());

    if (consent && !this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Track an event
   */
  async trackEvent(params: {
    eventName: string;
    properties?: Record<string, any>;
  }): Promise<void> {
    if (!this.isInitialized || !this.userConsent) {
      return;
    }

    try {
      const { eventName, properties = {} } = params;

      // Add platform metadata
      const enrichedProperties = {
        ...properties,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        deviceModel: Device.modelName || 'Unknown',
        sessionId: this.sessionId,
      };

      await amplitude.track(eventName, enrichedProperties).promise;

      logger.info('✅ Event tracked successfully:', eventName);
      logger.info('📊 Event properties:', JSON.stringify(enrichedProperties, null, 2));
    } catch (error) {
      logger.error('Failed to track event:', error);
    }
  }

  /**
   * Identify user with properties
   */
  async identifyUser(params: {
    userId: string;
    properties?: Record<string, any>;
  }): Promise<void> {
    if (!this.isInitialized || !this.userConsent) {
      return;
    }

    try {
      const { userId, properties = {} } = params;

      this.userId = userId;

      const identifyObj = new amplitude.Identify();

      // Set user properties
      Object.entries(properties).forEach(([key, value]) => {
        identifyObj.set(key, value);
      });

      // Add device properties
      identifyObj.set('platform', Platform.OS);
      identifyObj.set('deviceModel', Device.modelName || 'Unknown');
      identifyObj.set('appVersion', Constants.expoConfig?.version || '1.0.0');

      await amplitude.identify(identifyObj, { user_id: userId }).promise;

      logger.info('User identified:', userId);
    } catch (error) {
      logger.error('Failed to identify user:', error);
    }
  }

  /**
   * Set user group (e.g., subscription plan)
   */
  async setUserGroup(params: {
    groupType: string;
    groupName: string;
  }): Promise<void> {
    if (!this.isInitialized || !this.userConsent) {
      return;
    }

    try {
      const { groupType, groupName } = params;

      await amplitude.setGroup(groupType, groupName).promise;

      logger.info('User group set:', groupType, groupName);
    } catch (error) {
      logger.error('Failed to set user group:', error);
    }
  }

  /**
   * Track revenue event
   */
  async trackRevenue(params: {
    amount: number;
    productId: string;
    quantity?: number;
    revenueType?: string;
  }): Promise<void> {
    if (!this.isInitialized || !this.userConsent) {
      return;
    }

    try {
      const { amount, productId, quantity = 1, revenueType } = params;

      const revenueEvent = new amplitude.Revenue()
        .setProductId(productId)
        .setPrice(amount)
        .setQuantity(quantity);

      if (revenueType) {
        revenueEvent.setRevenueType(revenueType);
      }

      await amplitude.revenue(revenueEvent).promise;

      logger.info('Revenue tracked:', amount, productId);
    } catch (error) {
      logger.error('Failed to track revenue:', error);
    }
  }

  /**
   * Track user signup
   */
  async trackSignup(params: {
    method?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }): Promise<void> {
    await this.trackEvent({
      eventName: 'user_signup',
      properties: {
        method: params.method || 'email',
        utm_source: params.utmSource,
        utm_medium: params.utmMedium,
        utm_campaign: params.utmCampaign,
      },
    });
  }

  /**
   * Track user login
   */
  async trackLogin(method?: string): Promise<void> {
    await this.trackEvent({
      eventName: 'user_login',
      properties: { method: method || 'email' },
    });
  }

  /**
   * Track idea creation
   */
  async trackIdeaCreated(params: {
    ideaId: string;
    category: string;
  }): Promise<void> {
    await this.trackEvent({
      eventName: 'idea_created',
      properties: {
        idea_id: params.ideaId,
        category: params.category,
      },
    });
  }

  /**
   * Track AI message sent
   */
  async trackMessageSent(params: {
    ideaId: string;
    messageLength: number;
  }): Promise<void> {
    const bucket =
      params.messageLength < 50
        ? 'short'
        : params.messageLength < 200
        ? 'medium'
        : params.messageLength < 500
        ? 'long'
        : 'very_long';

    await this.trackEvent({
      eventName: 'message_sent',
      properties: {
        idea_id: params.ideaId,
        message_length: params.messageLength,
        message_length_bucket: bucket,
      },
    });
  }

  /**
   * Track subscription upgrade view
   */
  async trackUpgradeViewed(source?: string): Promise<void> {
    await this.trackEvent({
      eventName: 'upgrade_viewed',
      properties: { source: source || 'unknown' },
    });
  }

  /**
   * Track subscription purchase
   */
  async trackSubscriptionPurchased(params: {
    plan: string;
    amount: number;
    period: 'monthly' | 'yearly';
  }): Promise<void> {
    await this.trackEvent({
      eventName: 'subscription_purchased',
      properties: {
        plan: params.plan,
        amount: params.amount,
        period: params.period,
      },
    });

    // Also track as revenue
    await this.trackRevenue({
      amount: params.amount,
      productId: `${params.plan}_${params.period}`,
      revenueType: 'subscription',
    });
  }

  /**
   * Track error
   */
  async trackError(params: {
    error: Error;
    context?: string;
  }): Promise<void> {
    await this.trackEvent({
      eventName: 'error_occurred',
      properties: {
        error_message: params.error.message,
        error_stack: params.error.stack?.substring(0, 500),
        context: params.context,
      },
    });
  }

  /**
   * Reset analytics (e.g., on logout)
   */
  async reset(): Promise<void> {
    this.userId = null;
    this.sessionId = await this.getOrCreateSessionId();

    if (this.isInitialized) {
      // Amplitude reset is handled automatically on next identify
      logger.info('Analytics reset');
    }
  }

  /**
   * Manually flush queued events (useful for testing)
   */
  async flush(): Promise<void> {
    if (!this.isInitialized || !this.userConsent) {
      logger.info('Cannot flush: Analytics not initialized or consent not granted');
      return;
    }

    try {
      await amplitude.flush().promise;
      logger.info('✅ Analytics events flushed to server');
    } catch (error) {
      logger.error('Failed to flush analytics:', error);
    }
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
