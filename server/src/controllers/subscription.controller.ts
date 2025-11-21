import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

const subscriptionLogger = logger.child({ module: 'subscription.controller' });

export class SubscriptionController {
  /**
   * Validate receipt from mobile app
   * POST /api/v1/subscriptions/validate-receipt
   */
  static async validateReceipt(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { platform, productId, receipt, transactionId } = req.body;

      // Validate required fields
      if (!platform || !productId || !receipt || !transactionId) {
        throw new ApiError(400, 'Missing required fields', 'INVALID_REQUEST');
      }

      if (!['ios', 'android'].includes(platform)) {
        throw new ApiError(400, 'Invalid platform', 'INVALID_PLATFORM');
      }

      const subscription = await SubscriptionService.validateReceipt(
        req.user.id,
        platform,
        productId,
        receipt,
        transactionId
      );

      res.status(200).json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            startDate: subscription.startDate,
            currentPeriodEnd: subscription.currentPeriodEnd,
            autoRenewing: !subscription.cancelAtPeriodEnd,
          },
        },
      });
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Receipt validation failed');
      next(error);
    }
  }

  /**
   * Get subscription status
   * GET /api/v1/subscriptions/status
   */
  static async getSubscriptionStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const status = await SubscriptionService.getSubscriptionStatus(req.user.id);

      res.json({
        success: true,
        data: {
          subscription: status.subscription
            ? {
                id: status.subscription.id,
                plan: status.subscription.plan,
                status: status.subscription.status,
                startDate: status.subscription.startDate,
                currentPeriodEnd: status.subscription.currentPeriodEnd,
                endDate: status.subscription.endDate,
                autoRenewing: !status.subscription.cancelAtPeriodEnd,
                provider: status.subscription.provider,
              }
            : null,
          isActive: status.isActive,
          plan: status.plan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subscription history
   * GET /api/v1/subscriptions/history
   */
  static async getSubscriptionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const history = await SubscriptionService.getSubscriptionHistory(req.user.id);

      res.json({
        success: true,
        data: history.map((sub) => ({
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          currentPeriodEnd: sub.currentPeriodEnd,
          provider: sub.provider,
          cancelledAt: sub.cancelledAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   * POST /api/v1/subscriptions/:id/cancel
   */
  static async cancelSubscription(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'Subscription ID is required', 'MISSING_ID');
      }

      const subscription = await SubscriptionService.cancelSubscription(
        req.user.id,
        id
      );

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            cancelledAt: subscription.cancelledAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
          },
          message: 'Subscription will be cancelled at the end of the current period',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Apple App Store webhook
   * POST /api/v1/subscriptions/webhooks/apple
   */
  static async handleAppleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      subscriptionLogger.info({
        body: req.body,
      }, 'Received Apple webhook');

      // Verify the webhook is from Apple (implement signature verification)
      // For now, we'll process the webhook directly
      await SubscriptionService.handleSubscriptionWebhook('ios', req.body);

      res.status(200).send();
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Apple webhook processing failed');
      // Return 200 to acknowledge receipt even if processing failed
      // to prevent webhook retries
      res.status(200).send();
    }
  }

  /**
   * Handle Google Play webhook
   * POST /api/v1/subscriptions/webhooks/google
   */
  static async handleGoogleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      subscriptionLogger.info({
        body: req.body,
      }, 'Received Google webhook');

      // Decode the Pub/Sub message
      const message = req.body.message;
      if (!message) {
        throw new ApiError(400, 'Invalid webhook format', 'INVALID_WEBHOOK');
      }

      const decodedData = Buffer.from(message.data, 'base64').toString();
      const data = JSON.parse(decodedData);

      await SubscriptionService.handleSubscriptionWebhook('android', data);

      res.status(200).send();
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Google webhook processing failed');
      // Return 200 to acknowledge receipt
      res.status(200).send();
    }
  }

  /**
   * Restore purchases (mainly for iOS)
   * POST /api/v1/subscriptions/restore
   */
  static async restorePurchases(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated', 'UNAUTHORIZED');
      }

      const { receipts } = req.body;

      if (!receipts || !Array.isArray(receipts)) {
        throw new ApiError(400, 'Invalid receipts format', 'INVALID_REQUEST');
      }

      const restoredSubscriptions = [];

      for (const receiptData of receipts) {
        try {
          const subscription = await SubscriptionService.validateReceipt(
            req.user.id,
            receiptData.platform,
            receiptData.productId,
            receiptData.receipt,
            receiptData.transactionId
          );
          restoredSubscriptions.push(subscription);
        } catch (error) {
          subscriptionLogger.warn({
            userId: req.user.id,
            error,
          }, 'Failed to restore receipt');
        }
      }

      // Get the current active subscription
      const status = await SubscriptionService.getSubscriptionStatus(req.user.id);

      res.json({
        success: true,
        data: {
          restored: restoredSubscriptions.length,
          currentSubscription: status.subscription,
          isActive: status.isActive,
          plan: status.plan,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}