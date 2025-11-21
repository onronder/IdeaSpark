import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerTokenSchema,
  unregisterTokenSchema,
  getNotificationsSchema,
  markAsReadSchema,
  testNotificationSchema,
} from '../validation/notification.validation';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Register push token
router.post(
  '/register',
  validate(registerTokenSchema),
  NotificationController.registerToken
);

// Unregister push token
router.post(
  '/unregister',
  validate(unregisterTokenSchema),
  NotificationController.unregisterToken
);

// Get user notifications
router.get(
  '/',
  validate(getNotificationsSchema),
  NotificationController.getNotifications
);

// Mark notification as read
router.patch(
  '/:notificationId/read',
  validate(markAsReadSchema),
  NotificationController.markAsRead
);

// Mark all notifications as read
router.patch(
  '/read-all',
  NotificationController.markAllAsRead
);

// Test notification (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/test',
    validate(testNotificationSchema),
    NotificationController.testNotification
  );
}

// Get notification statistics (admin endpoint)
router.get(
  '/stats',
  NotificationController.getStatistics
);

export { router as notificationRoutes };
