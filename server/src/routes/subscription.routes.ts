import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  validateReceiptSchema,
  restorePurchasesSchema,
} from '../validation/subscription.validation';

const router = Router();

// Receipt validation
router.post(
  '/validate-receipt',
  authenticate,
  validate(validateReceiptSchema),
  SubscriptionController.validateReceipt
);

// Get subscription status
router.get(
  '/status',
  authenticate,
  SubscriptionController.getSubscriptionStatus
);

// Get subscription history
router.get(
  '/history',
  authenticate,
  SubscriptionController.getSubscriptionHistory
);

// Restore purchases
router.post(
  '/restore',
  authenticate,
  validate(restorePurchasesSchema),
  SubscriptionController.restorePurchases
);

// Cancel subscription
router.post(
  '/:id/cancel',
  authenticate,
  SubscriptionController.cancelSubscription
);

// Webhook endpoints (no auth required for webhooks)
router.post(
  '/webhooks/apple',
  SubscriptionController.handleAppleWebhook
);

router.post(
  '/webhooks/google',
  SubscriptionController.handleGoogleWebhook
);

export default router;
