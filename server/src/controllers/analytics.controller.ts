import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { prisma } from '../utils/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const analyticsLogger = logger.child({ module: 'analytics.controller' });

export class AnalyticsController {
  /**
   * Track an event
   * POST /api/v1/analytics/track
   */
  static async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const {
        sessionId,
        eventName,
        eventCategory,
        properties,
      } = req.body;

      await analyticsService.trackEvent({
        userId,
        sessionId,
        eventName,
        eventCategory,
        properties,
        platform: req.headers['x-platform'] as string,
        appVersion: req.headers['x-app-version'] as string,
        deviceId: req.headers['x-device-id'] as string,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Event tracked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI usage summary
   * GET /api/v1/analytics/admin/usage
   */
  static async getUsageSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const whereClause: any = {};
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      // Get AI usage statistics
      const [totalCost, usageByUser, usageByModel, totalRequests] = await Promise.all([
        // Total cost
        prisma.aIUsageLog.aggregate({
          where: whereClause,
          _sum: { costUsd: true },
        }),

        // Usage by user
        prisma.aIUsageLog.groupBy({
          by: ['userId'],
          where: whereClause,
          _sum: {
            costUsd: true,
            totalTokens: true,
          },
          _count: { userId: true },
          orderBy: {
            _sum: { costUsd: 'desc' },
          },
          take: 10, // Top 10 users
        }),

        // Usage by model
        prisma.aIUsageLog.groupBy({
          by: ['model'],
          where: whereClause,
          _sum: {
            costUsd: true,
            totalTokens: true,
          },
          _count: { model: true },
        }),

        // Total requests
        prisma.aIUsageLog.count({
          where: whereClause,
        }),
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            totalCost: totalCost._sum.costUsd || 0,
            totalRequests,
            averageCostPerRequest: totalRequests > 0
              ? (totalCost._sum.costUsd || 0) / totalRequests
              : 0,
          },
          topUsers: usageByUser.map(u => ({
            userId: u.userId,
            totalCost: u._sum.costUsd || 0,
            totalTokens: u._sum.totalTokens || 0,
            requests: u._count.userId,
          })),
          byModel: usageByModel.map(m => ({
            model: m.model,
            totalCost: m._sum.costUsd || 0,
            totalTokens: m._sum.totalTokens || 0,
            requests: m._count.model,
          })),
        },
      });
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get usage summary');
      next(error);
    }
  }

  /**
   * Get campaign performance report
   * GET /api/v1/analytics/admin/campaigns
   */
  static async getCampaignReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const report = await analyticsService.getCampaignReport({
        startDate,
        endDate,
      });

      // Enrich with subscription conversion data
      const enrichedReport = await Promise.all(
        report.map(async (campaign) => {
          const conversions = await prisma.subscription.count({
            where: {
              status: 'ACTIVE',
              plan: { not: 'FREE' },
              user: {
                marketingAttribution: {
                  utmCampaign: campaign.campaign,
                },
              },
            },
          });

          return {
            ...campaign,
            conversions,
            conversionRate: campaign.signups > 0
              ? (conversions / campaign.signups) * 100
              : 0,
          };
        })
      );

      res.json({
        success: true,
        data: enrichedReport,
      });
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get campaign report');
      next(error);
    }
  }

  /**
   * Get user analytics
   * GET /api/v1/analytics/user/:userId
   */
  static async getUserAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new ApiError(400, 'User ID is required', 'MISSING_PARAMETER');
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
      }

      const analytics = await analyticsService.getUserAnalytics(userId);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cohort analytics
   * GET /api/v1/analytics/admin/cohorts/:cohortMonth
   */
  static async getCohortAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cohortMonth } = req.params;

      if (!cohortMonth) {
        throw new ApiError(400, 'Cohort month is required', 'MISSING_PARAMETER');
      }

      // Validate format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(cohortMonth)) {
        throw new ApiError(400, 'Invalid cohort month format. Use YYYY-MM', 'INVALID_FORMAT');
      }

      const analytics = await analyticsService.getCohortAnalytics(cohortMonth);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get daily cost trend
   * GET /api/v1/analytics/admin/cost-trend
   */
  static async getCostTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyCosts = await prisma.$queryRaw<
        Array<{ date: Date; cost: number; requests: number }>
      >`
        SELECT
          DATE(created_at) as date,
          SUM(cost_usd) as cost,
          COUNT(*) as requests
        FROM ai_usage_logs
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `;

      res.json({
        success: true,
        data: dailyCosts,
      });
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get cost trend');
      next(error);
    }
  }

  /**
   * Get user LTV (Lifetime Value) report
   * GET /api/v1/analytics/admin/ltv
   */
  static async getLTVReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get users with their total subscription revenue
      const users = await prisma.user.findMany({
        include: {
          subscriptions: {
            where: {
              status: { in: ['ACTIVE', 'CANCELLED'] },
            },
          },
          aiUsageLogs: {
            select: {
              costUsd: true,
            },
          },
        },
      });

      const ltvData = users.map(user => {
        // Calculate total revenue (this would come from billing records in production)
        const totalRevenue = user.subscriptions.length > 0 ? 10 : 0; // Placeholder

        // Calculate total AI cost
        const totalCost = user.aiUsageLogs.reduce((sum, log) => sum + log.costUsd, 0);

        return {
          userId: user.id,
          email: user.email,
          signupDate: user.createdAt,
          subscriptionPlan: user.subscriptionPlan,
          totalRevenue,
          totalCost,
          netValue: totalRevenue - totalCost,
        };
      });

      // Sort by net value descending
      ltvData.sort((a, b) => b.netValue - a.netValue);

      // Calculate summary stats
      const summary = {
        totalUsers: ltvData.length,
        totalRevenue: ltvData.reduce((sum, u) => sum + u.totalRevenue, 0),
        totalCost: ltvData.reduce((sum, u) => sum + u.totalCost, 0),
        averageLTV: ltvData.length > 0
          ? ltvData.reduce((sum, u) => sum + u.totalRevenue, 0) / ltvData.length
          : 0,
        averageCost: ltvData.length > 0
          ? ltvData.reduce((sum, u) => sum + u.totalCost, 0) / ltvData.length
          : 0,
      };

      res.json({
        success: true,
        data: {
          summary,
          users: ltvData.slice(0, 100), // Top 100 users
        },
      });
    } catch (error) {
      analyticsLogger.error({ err: error }, 'Failed to get LTV report');
      next(error);
    }
  }
}
