import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, RefreshToken, PasswordResetToken } from '@prisma/client';
import { prisma } from '../utils/database';
import { config } from '../config';
import { ApiError } from '../utils/errors';
import { cache } from '../utils/redis';
import { logger } from '../utils/logger';

const authLogger = logger.child({ module: 'auth.service' });

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  /**
   * Hash a password
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.bcrypt.rounds);
  }

  /**
   * Verify a password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT tokens
   */
  static generateTokens(user: User, deviceFingerprint?: string): AuthTokens {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    });

    const refreshPayload: TokenPayload = {
      ...payload,
      type: 'refresh',
    };

    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessTokenExpiryMs,
    };
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string, type: 'access' | 'refresh'): TokenPayload {
    try {
      const secret = type === 'access' ? config.jwt.secret : config.jwt.refreshSecret;
      const payload = jwt.verify(token, secret) as TokenPayload;

      if (payload.type !== type) {
        throw new ApiError(401, 'Invalid token type', 'TOKEN_TYPE_MISMATCH');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, 'Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'Invalid token', 'TOKEN_INVALID');
      }
      throw error;
    }
  }

  /**
   * Register a new user
   */
  static async register(data: {
    email: string;
    password: string;
    name?: string;
    marketingConsent?: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referrer?: string;
    landingPage?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);

    // Create user with subscription and marketing attribution
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: hashedPassword,
        name: data.name,
        subscriptions: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
          },
        },
        ...(data.utmSource && {
          marketingAttribution: {
            create: {
              utmSource: data.utmSource,
              utmMedium: data.utmMedium,
              utmCampaign: data.utmCampaign,
              utmTerm: data.utmTerm,
              utmContent: data.utmContent,
              referrer: data.referrer,
              landingPage: data.landingPage,
              ipAddress: data.ipAddress,
              userAgent: data.userAgent,
            },
          },
        }),
      },
    });

    authLogger.info({ userId: user.id }, 'User registered successfully');

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  /**
   * Login user
   */
  static async login(
    email: string,
    password: string,
    deviceFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { subscriptions: true },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if account is deleted
    if (user.deletedAt) {
      throw new ApiError(401, 'Account has been deleted', 'ACCOUNT_DELETED');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    authLogger.info({ userId: user.id }, 'User logged in successfully');

    // Generate tokens
    const tokens = this.generateTokens(user, deviceFingerprint);

    // Store refresh token
    await this.storeRefreshToken(
      user.id,
      tokens.refreshToken,
      deviceFingerprint,
      ipAddress,
      userAgent
    );

    return { user, tokens };
  }

  /**
   * Logout user
   */
  static async logout(refreshToken: string): Promise<void> {
    try {
      // Verify token
      const payload = this.verifyToken(refreshToken, 'refresh');

      // Revoke token
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId: payload.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // Clear from cache if exists
      await cache.del(`refresh_token:${refreshToken}`);

      authLogger.info({ userId: payload.userId }, 'User logged out successfully');
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      authLogger.error(error, 'Error during logout');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = this.verifyToken(refreshToken, 'refresh');

    // Check if token exists and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new ApiError(401, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // Generate new tokens
    const tokens = this.generateTokens(storedToken.user);

    // Store new refresh token and revoke old one
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: storedToken.userId,
          deviceFingerprint: storedToken.deviceFingerprint,
          ipAddress: storedToken.ipAddress,
          userAgent: storedToken.userAgent,
          expiresAt: new Date(Date.now() + config.jwt.refreshTokenExpiryMs),
        },
      }),
    ]);

    authLogger.info({ userId: payload.userId }, 'Token refreshed successfully');

    return tokens;
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      authLogger.warn({ email }, 'Password reset requested for non-existent user');
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send reset email
    const { emailService } = await import('./email.service');
    await emailService.sendPasswordResetEmail({
      email: user.email,
      resetToken,
      name: user.name || undefined,
    });

    authLogger.info({ userId: user.id }, 'Password reset email sent');

    // In development, also log the token for testing
    if (config.isDevelopment) {
      authLogger.info({ resetToken }, 'Password reset token (dev only)');
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt) {
      throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new ApiError(400, 'Reset token expired', 'RESET_TOKEN_EXPIRED');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for security
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    authLogger.info({ userId: resetToken.userId }, 'Password reset successfully');
  }

  /**
   * Get current user
   */
  static async getCurrentUser(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }

    if (user.deletedAt) {
      throw new ApiError(404, 'User account deleted', 'USER_DELETED');
    }

    return user;
  }

  /**
   * Store refresh token
   */
  private static async storeRefreshToken(
    userId: string,
    token: string,
    deviceFingerprint?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        deviceFingerprint,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + config.jwt.refreshTokenExpiryMs),
      },
    });

    // Also cache for quick validation
    await cache.set(
      `refresh_token:${token}`,
      userId,
      Math.floor(config.jwt.refreshTokenExpiryMs / 1000)
    );
  }
}