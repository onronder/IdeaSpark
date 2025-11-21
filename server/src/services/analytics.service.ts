import { init } from '@amplitude/node';
import { Identify } from '@amplitude/identify';
import type { NodeClient } from '@amplitude/node';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { config } from '../config';

const analyticsLogger = logger.child({ module: 'analytics.service' });

/**
 * Analytics Service
 * Handles event tracking, user analytics, and marketing attribution
 */
class AnalyticsService {
  private amplitudeClient: NodeClient | null = null;
  private isInitialized = false;

  /**
   * Initialize Amplitude client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Amplitude if API key is provided
      if (config.analytics?.amplitudeApiKey) {
        this.amplitudeClient = init(config.analytics.amplitudeApiKey);

        this.isInitialized = true;
        analyticsLogger.info('Amplitude analytics initialized');
      } else {
        analyticsLogger.warn('Amplitude API key not configured, analytics disabled');
      }
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to initialize Amplitude');
    }
  }

  /**
   * Track an event
   */
  async trackEvent(params: {
    userId?: string;
    sessionId: string;
    eventName: string;
    eventCategory: string;
    properties?: Record<string, any>;
    platform?: string;
    appVersion?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const {
        userId,
        sessionId,
        eventName,
        eventCategory,
        properties = {},
        platform,
        appVersion,
        deviceId,
        ipAddress,
        userAgent,
      } = params;

      // Store event in database
      await prisma.analyticsEvent.create({
        data: {
          userId: userId || null,
          sessionId,
          eventName,
          eventCategory,
          properties,
          platform,
          appVersion,
          deviceId,
          ipAddress,
          userAgent,
        },
      });

      // Send to Amplitude
      if (this.isInitialized && this.amplitudeClient) {
        await this.amplitudeClient.logEvent({
          event_type: eventName,
          user_id: userId,
          session_id: Date.now(), // Amplitude requires number for session_id
          device_id: deviceId,
          ip: ipAddress,
          event_properties: {
            ...properties,
            category: eventCategory,
            platform,
            appVersion,
            sessionId, // Store original session ID as property
          },
        });
      }

      analyticsLogger.debug({
        eventName,
        userId,
        sessionId,
      }, 'Event tracked');
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to track event');
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Identify user with properties
   */
  async identifyUser(params: {
    userId: string;
    properties: Record<string, any>;
  }): Promise<void> {
    try {
      const { userId, properties } = params;

      if (this.isInitialized && this.amplitudeClient) {
        const identifyObj = new Identify();

        Object.entries(properties).forEach(([key, value]) => {
          identifyObj.set(key, value);
        });

        await this.amplitudeClient.identify(userId, null, identifyObj);

        analyticsLogger.debug({ userId }, 'User identified');
      }
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to identify user');
    }
  }

  /**
   * Track user group (e.g., subscription plan)
   */
  async setUserGroup(params: {
    userId: string;
    groupType: string;
    groupName: string;
  }): Promise<void> {
    try {
      const { userId, groupType, groupName } = params;

      // Track as event property since setGroup is not available in current SDK
      if (this.isInitialized && this.amplitudeClient) {
        await this.amplitudeClient.logEvent({
          event_type: 'user_group_set',
          user_id: userId,
          event_properties: {
            group_type: groupType,
            group_name: groupName,
          },
        });

        analyticsLogger.debug({ userId, groupType, groupName }, 'User group set');
      }
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to set user group');
    }
  }

  /**
   * Track revenue event
   */
  async trackRevenue(params: {
    userId: string;
    amount: number;
    productId: string;
    quantity?: number;
    revenueType?: string;
  }): Promise<void> {
    try {
      const { userId, amount, productId, quantity = 1, revenueType } = params;

      if (this.isInitialized && this.amplitudeClient) {
        // Track revenue as a custom event
        await this.amplitudeClient.logEvent({
          event_type: 'revenue',
          user_id: userId,
          event_properties: {
            product_id: productId,
            price: amount,
            quantity,
            revenue_type: revenueType,
            revenue: amount * quantity,
          },
        });

        analyticsLogger.info({
          userId,
          amount,
          productId,
        }, 'Revenue tracked');
      }
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to track revenue');
    }
  }

  /**
   * Store marketing attribution
   */
  async captureMarketingAttribution(params: {
    userId: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referrer?: string;
    landingPage?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      const {
        userId,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        referrer,
        landingPage,
        ipAddress,
        userAgent,
      } = params;

      // Check if attribution already exists
      const existing = await prisma.marketingAttribution.findUnique({
        where: { userId },
      });

      if (existing) {
        // Don't overwrite existing attribution (first-touch attribution)
        analyticsLogger.debug({ userId }, 'Marketing attribution already exists');
        return;
      }

      // Create attribution record
      await prisma.marketingAttribution.create({
        data: {
          userId,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
          utmTerm: utmTerm || null,
          utmContent: utmContent || null,
          referrer: referrer || null,
          landingPage: landingPage || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      analyticsLogger.info({
        userId,
        utmSource,
        utmCampaign,
      }, 'Marketing attribution captured');
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to capture marketing attribution');
    }
  }

  /**
   * Get user analytics summary
   */
  async getUserAnalytics(userId: string) {
    try {
      const [user, events, ideas, messages, subscription] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        }),
        prisma.analyticsEvent.groupBy({
          by: ['userId'],
          where: { userId },
          _count: { userId: true },
        }),
        prisma.ideaSession.count({
          where: { userId },
        }),
        prisma.ideaMessage.count({
          where: {
            ideaSession: { userId },
            role: 'USER',
          },
        }),
        prisma.subscription.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        }),
      ]);

      const totalEvents = events.length > 0 ? events[0]._count.userId : 0;

      return {
        userId,
        firstSeen: user?.createdAt || new Date(),
        totalEvents,
        totalIdeas: ideas,
        totalMessages: messages,
        subscriptionPlan: subscription?.plan || 'FREE',
      };
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get user analytics');
      throw error;
    }
  }

  /**
   * Get campaign performance report
   */
  async getCampaignReport(params: {
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { startDate, endDate } = params;

      const whereClause: any = {};
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const attributions = await prisma.marketingAttribution.groupBy({
        by: ['utmSource', 'utmMedium', 'utmCampaign'],
        where: whereClause,
        _count: { userId: true },
      });

      return attributions.map(attr => ({
        source: attr.utmSource,
        medium: attr.utmMedium,
        campaign: attr.utmCampaign,
        signups: attr._count.userId,
      }));
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get campaign report');
      throw error;
    }
  }

  /**
   * Get cohort analytics
   */
  async getCohortAnalytics(cohortMonth: string) {
    try {
      // Parse cohort month (format: YYYY-MM)
      const [year, month] = cohortMonth.split('-').map(Number);
      const cohortStart = new Date(year, month - 1, 1);
      const cohortEnd = new Date(year, month, 0);

      const users = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: cohortStart,
            lte: cohortEnd,
          },
        },
        include: {
          ideaSessions: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.deletedAt === null).length;
      const churnedUsers = users.filter(u => u.deletedAt !== null).length;
      const paidUsers = users.filter(u => u.subscriptions.length > 0).length;

      return {
        cohortId: cohortMonth,
        cohortName: cohortMonth,
        cohortDate: cohortStart,
        totalUsers,
        activeUsers,
        churnedUsers,
        retentionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        conversionRate: totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0,
        averageIdeasPerUser: totalUsers > 0
          ? users.reduce((sum, u) => sum + u.ideaSessions.length, 0) / totalUsers
          : 0,
      };
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get cohort analytics');
      throw error;
    }
  }

  /**
   * Flush any pending events
   */
  async flush(): Promise<void> {
    if (this.isInitialized && this.amplitudeClient) {
      await this.amplitudeClient.flush();
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
