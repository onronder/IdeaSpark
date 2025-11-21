import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  updateNotificationPreferencesSchema,
  updateThemePreferenceSchema,
  getAuditHistorySchema,
} from '../validation/user.validation';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Get current user profile
router.get('/me', UserController.getProfile);

// Update profile
router.patch('/me', validate(updateProfileSchema), UserController.updateProfile);

// Change password
router.post('/change-password', validate(changePasswordSchema), UserController.changePassword);

// Upload avatar
router.post('/avatar', UserController.uploadAvatar, UserController.handleAvatarUpload);

// Delete account
router.delete('/me', validate(deleteAccountSchema), UserController.deleteAccount);

// Update notification preferences
router.patch(
  '/notifications',
  validate(updateNotificationPreferencesSchema),
  UserController.updateNotifications
);

// Update theme preference
router.patch('/theme', validate(updateThemePreferenceSchema), UserController.updateTheme);

// Get user statistics
router.get('/stats', UserController.getStats);

// Get audit history
router.get('/audit-history', validate(getAuditHistorySchema), UserController.getAuditHistory);

export { router as userRoutes };
