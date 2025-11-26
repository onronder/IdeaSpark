import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { SubscriptionExpiryService } from '../services/subscription-expiry.service';
import {
  triggerExpiryCheck,
  triggerWarnings,
  getQueueStats,
} from '../jobs/subscription-expiry.job';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();
const adminLogger = logger.child({ module: 'admin.routes' });

/**
 * @route   GET /api/v1/admin/subscriptions/expiry/stats
 * @desc    Get subscription expiry statistics
 * @access  Private (Admin only)
 */
router.get(
  '/subscriptions/expiry/stats',
  authenticate,
  async (req, res, next) => {
    try {
      // TODO: Add admin role check
      // if (req.user.role !== 'ADMIN') {
      //   throw new ApiError(403, 'Admin access required', 'FORBIDDEN');
      // }

      const [expiryStats, queueStats] = await Promise.all([
        SubscriptionExpiryService.getExpiryStats(),
        getQueueStats(),
      ]);

      res.json({
        success: true,
        data: {
          expiry: expiryStats,
          queues: queueStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/admin/subscriptions/expiry/check
 * @desc    Manually trigger subscription expiry check
 * @access  Private (Admin only)
 */
router.post(
  '/subscriptions/expiry/check',
  authenticate,
  async (req, res, next) => {
    try {
      // TODO: Add admin role check
      adminLogger.info({ userId: req.user?.id }, 'Manual expiry check triggered');

      await triggerExpiryCheck();

      res.json({
        success: true,
        message: 'Expiry check job queued successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/admin/subscriptions/expiry/warnings
 * @desc    Manually trigger expiry warnings
 * @access  Private (Admin only)
 */
router.post(
  '/subscriptions/expiry/warnings',
  authenticate,
  async (req, res, next) => {
    try {
      // TODO: Add admin role check
      adminLogger.info({ userId: req.user?.id }, 'Manual warnings triggered');

      await triggerWarnings();

      res.json({
        success: true,
        message: 'Warnings job queued successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as adminRoutes };
