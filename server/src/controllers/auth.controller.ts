import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  ForgotPasswordInput,
  ResetPasswordInput
} from '../validation/auth.validation';
// import { logger } from '../utils/logger';
// const authLogger = logger.child({ module: 'auth.controller' });

export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  static async register(
    req: Request<{}, {}, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const registerData = req.body.name
        ? req.body
        : { email: req.body.email, password: req.body.password, marketingConsent: req.body.marketingConsent };

      // Capture marketing attribution metadata
      const attributionData = {
        ...registerData,
        utmSource: req.body.utmSource,
        utmMedium: req.body.utmMedium,
        utmCampaign: req.body.utmCampaign,
        utmTerm: req.body.utmTerm,
        utmContent: req.body.utmContent,
        referrer: req.headers.referer,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };

      const { user, tokens } = await AuthService.register(attributionData as any);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: req.secure,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken, // Also return in response for mobile clients
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  static async login(
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, deviceFingerprint } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const { user, tokens } = await AuthService.login(
        email,
        password,
        deviceFingerprint,
        ipAddress,
        userAgent
      );

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: req.secure,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            avatarUrl: user.avatar,
            subscription: (user as any).subscription,
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken, // Also return in response for mobile clients
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  static async logout(
    req: Request<{}, {}, LogoutInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get refresh token from body or cookie
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      // Clear cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  static async refreshToken(
    req: Request<{}, {}, RefreshTokenInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Get refresh token from body or cookie
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        return next(new Error('Refresh token is required'));
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      // Set new refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: req.secure,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   */
  static async forgotPassword(
    req: Request<{}, {}, ForgotPasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body.email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  static async resetPassword(
    req: Request<{}, {}, ResetPasswordInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await AuthService.resetPassword(req.body.token, req.body.password);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   * GET /api/v1/auth/me
   */
  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const user = await AuthService.getCurrentUser(req.user.id);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar,
          emailVerified: user.emailVerified,
          subscription: (user as any).subscription,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}