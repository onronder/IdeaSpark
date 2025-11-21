import { Subscription, SubscriptionPlan, SubscriptionStatus, User } from '@prisma/client';
import { prisma } from '../utils/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const subscriptionLogger = logger.child({ module: 'subscription.service' });

// Configure axios with retry logic
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
           error.response?.status === 429;
  },
});

// Product ID mappings
const PRODUCT_MAPPINGS = {
  // iOS products
  'com.ideaspark.app.pro_monthly': { plan: 'PRO', period: 'MONTHLY' },
  'com.ideaspark.app.pro_yearly': { plan: 'PRO', period: 'YEARLY' },
  // Android products
  'pro_monthly_subscription': { plan: 'PRO', period: 'MONTHLY' },
  'pro_yearly_subscription': { plan: 'PRO', period: 'YEARLY' },
} as const;

export class SubscriptionService {
  private static googleClient = new OAuth2Client();

  /**
   * Validate iOS receipt with Apple
   */
  private static async validateAppleReceipt(
    receipt: string,
    isProduction: boolean = config.isProduction
  ): Promise<any> {
    const endpoint = isProduction
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

    try {
      const response = await axios.post(endpoint, {
        'receipt-data': receipt,
        'password': config.iap?.apple?.sharedSecret || '', // App shared secret from App Store Connect
        'exclude-old-transactions': true,
      });

      // Handle sandbox receipt in production
      if (response.data.status === 21007) {
        subscriptionLogger.info('Receipt is sandbox, retrying with sandbox endpoint');
        return this.validateAppleReceipt(receipt, false);
      }

      if (response.data.status !== 0) {
        throw new Error(`Apple receipt validation failed with status: ${response.data.status}`);
      }

      return response.data;
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Apple receipt validation failed');
      throw error;
    }
  }

  /**
   * Validate Apple StoreKit 2 JWT (for newer implementations)
   */
  private static async validateAppleStoreKit2JWT(signedTransaction: string): Promise<any> {
    try {
      // Decode the JWT header to get the algorithm and key ID
      const parts = signedTransaction.split('.');
      if (!parts[0]) {
        throw new Error('Invalid JWT format');
      }
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());

      // Fetch Apple's public keys
      const keysResponse = await axios.get('https://api.storekit.itunes.apple.com/inApps/v1/publicKeys');
      const publicKey = keysResponse.data.keys.find((key: any) => key.kid === header.kid);

      if (!publicKey) {
        throw new Error('Public key not found for JWT verification');
      }

      // Convert JWK to PEM format
      const pemKey = this.jwkToPem(publicKey);

      // Verify and decode the JWT
      const decoded = jwt.verify(signedTransaction, pemKey, {
        algorithms: ['ES256'],
      });

      return decoded;
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Apple StoreKit 2 JWT validation failed');
      throw error;
    }
  }

  /**
   * Convert JWK to PEM format
   */
  private static jwkToPem(jwk: any): string {
    // Implementation for converting JWK to PEM
    // This is simplified - in production, use a library like node-jose
    const keyData = Buffer.concat([
      Buffer.from([0x04]), // Uncompressed point
      Buffer.from(jwk.x, 'base64'),
      Buffer.from(jwk.y, 'base64'),
    ]);

    const publicKey = crypto.createPublicKey({
      key: keyData,
      format: 'der',
      type: 'spki',
    });

    return publicKey.export({ format: 'pem', type: 'spki' }) as string;
  }

  /**
   * Validate Android receipt with Google Play
   */
  private static async validateGoogleReceipt(
    productId: string,
    purchaseToken: string
  ): Promise<any> {
    const packageName = config.iap?.google?.packageName || 'com.ideaspark.app';

    try {
      // Use Google Play Developer API v3
      const accessToken = await this.getGoogleAccessToken();

      const response = await axios.get(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/${purchaseToken}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.lineItems?.[0]?.productId !== productId) {
        throw new Error('Product ID mismatch in Google receipt');
      }

      return response.data;
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Google receipt validation failed');
      throw error;
    }
  }

  /**
   * Get Google OAuth2 access token
   */
  private static async getGoogleAccessToken(): Promise<string> {
    try {
      const serviceAccountKey = config.iap?.google?.serviceAccountKey;

      if (!serviceAccountKey) {
        throw new Error('Google service account not configured');
      }

      const jwtClient = new OAuth2Client();
      const token = await jwtClient.getAccessToken();

      if (!token.token) {
        throw new Error('Failed to get Google access token');
      }

      return token.token;
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Failed to get Google access token');
      throw error;
    }
  }

  /**
   * Validate receipt from mobile app
   */
  static async validateReceipt(
    userId: string,
    platform: 'ios' | 'android',
    productId: string,
    receipt: string,
    transactionId: string
  ): Promise<Subscription> {
    subscriptionLogger.info({
      userId,
      platform,
      productId,
      transactionId,
    }, 'Validating receipt');

    // Check if product ID is valid
    const productMapping = PRODUCT_MAPPINGS[productId as keyof typeof PRODUCT_MAPPINGS];
    if (!productMapping) {
      throw new ApiError(400, 'Invalid product ID', 'INVALID_PRODUCT');
    }

    try {
      let validationResult;
      let expiryDate: Date;
      let originalTransactionId: string;

      if (platform === 'ios') {
        // Check if it's a StoreKit 2 JWT or traditional receipt
        if (receipt.includes('.')) {
          // StoreKit 2 JWT format
          validationResult = await this.validateAppleStoreKit2JWT(receipt);
          expiryDate = new Date(validationResult.expiresDate);
          originalTransactionId = validationResult.originalTransactionId || transactionId;
        } else {
          // Traditional receipt format
          validationResult = await this.validateAppleReceipt(receipt);
          const latestReceipt = validationResult.latest_receipt_info?.[0];

          if (!latestReceipt) {
            throw new Error('No valid receipt found in Apple response');
          }

          expiryDate = new Date(parseInt(latestReceipt.expires_date_ms));
          originalTransactionId = latestReceipt.original_transaction_id;
        }
      } else {
        // Android/Google Play
        validationResult = await this.validateGoogleReceipt(productId, receipt);

        const expiryTimeMillis = validationResult.lineItems?.[0]?.expiryTime;
        expiryDate = new Date(expiryTimeMillis);
        originalTransactionId = validationResult.orderId || transactionId;
      }

      // Check if subscription already exists
      let subscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            { externalId: originalTransactionId },
            { userId, status: 'ACTIVE' },
          ],
        },
      });

      if (subscription) {
        // Update existing subscription
        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: expiryDate > new Date() ? 'ACTIVE' : 'EXPIRED',
            plan: productMapping.plan as SubscriptionPlan,
            currentPeriodEnd: expiryDate,
            metadata: {
              ...((subscription.metadata as any) || {}),
              lastValidatedAt: new Date().toISOString(),
              platform,
              productId,
            },
          },
        });
      } else {
        // Create new subscription
        subscription = await prisma.subscription.create({
          data: {
            userId,
            plan: productMapping.plan as SubscriptionPlan,
            status: expiryDate > new Date() ? 'ACTIVE' : 'EXPIRED',
            startDate: new Date(),
            currentPeriodEnd: expiryDate,
            provider: platform === 'ios' ? 'APPLE' : 'GOOGLE',
            externalId: originalTransactionId,
            metadata: {
              platform,
              productId,
              billingPeriod: productMapping.period,
              originalTransactionId,
              lastValidatedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Update user's subscription status
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: subscription.status === 'ACTIVE' ? subscription.plan : 'FREE',
        },
      });

      subscriptionLogger.info({
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
      }, 'Receipt validated successfully');

      return subscription;
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Receipt validation failed');
      throw new ApiError(400, 'Receipt validation failed', 'VALIDATION_FAILED');
    }
  }

  /**
   * Get user's subscription status
   */
  static async getSubscriptionStatus(userId: string): Promise<{
    subscription: Subscription | null;
    isActive: boolean;
    plan: SubscriptionPlan;
  }> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Check if subscription is still valid
    if (subscription && subscription.currentPeriodEnd) {
      const isExpired = new Date() > subscription.currentPeriodEnd;

      if (isExpired && subscription.status === 'ACTIVE') {
        // Update expired subscription
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });

        // Update user's plan
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionPlan: 'FREE' },
        });

        return {
          subscription: null,
          isActive: false,
          plan: 'FREE',
        };
      }
    }

    return {
      subscription,
      isActive: subscription?.status === 'ACTIVE',
      plan: subscription?.plan || 'FREE',
    };
  }

  /**
   * Handle subscription webhook from app stores
   */
  static async handleSubscriptionWebhook(
    platform: 'ios' | 'android',
    data: any
  ): Promise<void> {
    subscriptionLogger.info({ platform }, 'Processing subscription webhook');

    try {
      if (platform === 'ios') {
        await this.handleAppleWebhook(data);
      } else {
        await this.handleGoogleWebhook(data);
      }
    } catch (error) {
      subscriptionLogger.error({ err: error }, 'Webhook processing failed');
      throw error;
    }
  }

  /**
   * Handle Apple subscription notifications
   */
  private static async handleAppleWebhook(data: any): Promise<void> {
    const { notification_type, auto_renew_product_id, original_transaction_id } = data;

    const subscription = await prisma.subscription.findFirst({
      where: { externalId: original_transaction_id },
    });

    if (!subscription) {
      subscriptionLogger.warn({
        originalTransactionId: original_transaction_id,
      }, 'Subscription not found for Apple webhook');
      return;
    }

    switch (notification_type) {
      case 'CANCEL':
      case 'REFUND':
      case 'REVOKE':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });
        break;

      case 'DID_RENEW':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'ACTIVE',
            renewedAt: new Date(),
          },
        });
        break;

      case 'DID_FAIL_TO_RENEW':
      case 'EXPIRED':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'EXPIRED',
          },
        });
        break;
    }

    // Update user's subscription plan
    const user = await prisma.user.findUnique({
      where: { id: subscription.userId },
    });

    if (user) {
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: activeSubscription ? activeSubscription.plan : 'FREE',
        },
      });
    }
  }

  /**
   * Handle Google Play subscription notifications
   */
  private static async handleGoogleWebhook(data: any): Promise<void> {
    const { subscriptionNotification } = data;
    const { purchaseToken, notificationType } = subscriptionNotification;

    // Validate the purchase token with Google
    const validationResult = await this.validateGoogleReceipt(
      '', // Product ID will be in the validation result
      purchaseToken
    );

    const subscription = await prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['purchaseToken'],
          equals: purchaseToken,
        },
      },
    });

    if (!subscription) {
      subscriptionLogger.warn({
        purchaseToken,
      }, 'Subscription not found for Google webhook');
      return;
    }

    switch (notificationType) {
      case 1: // RECOVERED
      case 2: // RENEWED
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'ACTIVE',
            renewedAt: new Date(),
            currentPeriodEnd: new Date(validationResult.lineItems?.[0]?.expiryTime),
          },
        });
        break;

      case 3: // CANCELLED
      case 12: // REVOKED
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });
        break;

      case 13: // EXPIRED
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'EXPIRED',
          },
        });
        break;
    }

    // Update user's subscription plan
    const user = await prisma.user.findUnique({
      where: { id: subscription.userId },
    });

    if (user) {
      const activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionPlan: activeSubscription ? activeSubscription.plan : 'FREE',
        },
      });
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<Subscription> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
    });

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelAtPeriodEnd: true,
      },
    });

    subscriptionLogger.info({
      userId,
      subscriptionId,
    }, 'Subscription cancelled');

    return updated;
  }

  /**
   * Get user's subscription history
   */
  static async getSubscriptionHistory(userId: string): Promise<Subscription[]> {
    return prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}