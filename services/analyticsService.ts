import { init, track, identify, Identify, setGroup, Revenue, revenue, add } from '@amplitude/analytics-react-native';
import { SessionReplayPlugin } from '@amplitude/plugin-session-replay-react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        console.log('Analytics consent not granted');
        return;
      }

      // Get Amplitude API key from environment
      // Prefer EXPO_PUBLIC_AMPLITUDE_API_KEY so the same name is used
      // across mobile and backend, but fall back to AMPLITUDE_API_KEY
      // to support existing local .env files.
      const amplitudeApiKey =
        process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY ||
        process.env.AMPLITUDE_API_KEY ||
        Constants.expoConfig?.extra?.amplitudeApiKey;

      if (!amplitudeApiKey) {
        console.warn('Amplitude API key not configured');
        return;
      }

      // Generate or retrieve session ID
      this.sessionId = await this.getOrCreateSessionId();

      // Initialize Amplitude
      const client = init(amplitudeApiKey, params?.userId, {
        trackingOptions: {
          ipAddress: false, // Don't track IP for privacy
        },
        defaultTracking: {
          sessions: true,
          appLifecycles: true,
          screenViews: true,
        },
      });

      // Ensure underlying client is ready
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.promise.catch((err) => {
        console.warn('Amplitude init failed', err);
      });

      // Best-effort Session Replay plugin (only works on native builds, not Expo Go)
      try {
        const plugin = new SessionReplayPlugin();
        const addResult = add(plugin);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        addResult.promise.catch((err) => {
          console.warn('Amplitude Session Replay plugin failed to initialize', err);
        });
      } catch (pluginError) {
        console.warn('Session Replay plugin not available or failed to load', pluginError);
      }

      if (params?.userId) {
        this.userId = params.userId;
      }

      this.isInitialized = true;
      console.log('Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
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

      await track(eventName, enrichedProperties);

      console.log('Event tracked:', eventName, enrichedProperties);
    } catch (error) {
      console.error('Failed to track event:', error);
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

      const identifyObj = new Identify();

      // Set user properties
      Object.entries(properties).forEach(([key, value]) => {
        identifyObj.set(key, value);
      });

      // Add device properties
      identifyObj.set('platform', Platform.OS);
      identifyObj.set('deviceModel', Device.modelName || 'Unknown');
      identifyObj.set('appVersion', Constants.expoConfig?.version || '1.0.0');

      await identify(identifyObj, undefined, { user_id: userId });

      console.log('User identified:', userId);
    } catch (error) {
      console.error('Failed to identify user:', error);
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

      await setGroup(groupType, groupName);

      console.log('User group set:', groupType, groupName);
    } catch (error) {
      console.error('Failed to set user group:', error);
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

      const revenueEvent = new Revenue()
        .setProductId(productId)
        .setPrice(amount)
        .setQuantity(quantity);

      if (revenueType) {
        revenueEvent.setRevenueType(revenueType);
      }

      await revenue(revenueEvent);

      console.log('Revenue tracked:', amount, productId);
    } catch (error) {
      console.error('Failed to track revenue:', error);
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
    await this.trackEvent({
      eventName: 'message_sent',
      properties: {
        idea_id: params.ideaId,
        message_length: params.messageLength,
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
      console.log('Analytics reset');
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
