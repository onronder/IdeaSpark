import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validation/auth.validation';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  rateLimiter.auth,
  validate(registerSchema),
  AuthController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  rateLimiter.auth,
  validate(loginSchema),
  AuthController.login
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public (requires refresh token)
 */
router.post(
  '/logout',
  validate(logoutSchema),
  AuthController.logout
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires refresh token)
 */
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  AuthController.refreshToken
);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  rateLimiter.auth,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  rateLimiter.auth,
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  AuthController.getCurrentUser
);

export { router as authRoutes };