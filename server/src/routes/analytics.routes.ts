import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Track event validation schema
const trackEventSchema = z.object({
  body: z.object({
    sessionId: z.string(),
    eventName: z.string(),
    eventCategory: z.string(),
    properties: z.record(z.any()).optional(),
  }),
});

// Date range query validation
const dateRangeSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

// Cohort month validation
const cohortMonthSchema = z.object({
  params: z.object({
    cohortMonth: z.string().regex(/^\d{4}-\d{2}$/),
  }),
});

// User ID validation
const userIdSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});

// Cost trend validation
const costTrendSchema = z.object({
  query: z.object({
    days: z.string().transform(Number).pipe(z.number().int().min(1).max(365)).optional(),
  }),
});

// Public event tracking (with optional authentication)
router.post(
  '/track',
  validate(trackEventSchema),
  AnalyticsController.trackEvent
);

// Admin routes (require authentication)
// TODO: Add admin role check middleware
router.use('/admin', authenticate);

// Get AI usage summary
router.get(
  '/admin/usage',
  validate(dateRangeSchema),
  AnalyticsController.getUsageSummary
);

// Get campaign performance
router.get(
  '/admin/campaigns',
  validate(dateRangeSchema),
  AnalyticsController.getCampaignReport
);

// Get cohort analytics
router.get(
  '/admin/cohorts/:cohortMonth',
  validate(cohortMonthSchema),
  AnalyticsController.getCohortAnalytics
);

// Get cost trend
router.get(
  '/admin/cost-trend',
  validate(costTrendSchema),
  AnalyticsController.getCostTrend
);

// Get LTV report
router.get(
  '/admin/ltv',
  AnalyticsController.getLTVReport
);

// User-specific analytics (require authentication)
router.get(
  '/user/:userId',
  authenticate,
  validate(userIdSchema),
  AnalyticsController.getUserAnalytics
);

export { router as analyticsRoutes };
