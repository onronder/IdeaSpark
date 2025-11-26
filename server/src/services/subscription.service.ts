import { Subscription, SubscriptionPlan, SubscriptionStatus, User } from '@prisma/client';
import { prisma } from '../utils/database';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { GoogleAuth, JWT } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as jose from 'jose';

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

// Google access token cache
let googleAccessTokenCache: { token: string; expiresAt: number } | null = null;

export class SubscriptionService {

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
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());

      // Fetch Apple's public keys with retry
      const keysResponse = await axios.get('https://api.storekit.itunes.apple.com/inApps/v1/publicKeys', {
        timeout: 10000,
      });

      const publicKeyData = keysResponse.data.keys.find((key: any) => key.kid === header.kid);

      if (!publicKeyData) {
        throw new Error(`Public key not found for kid: ${header.kid}`);
      }

      // Import the JWK using jose library
      const publicKey = await jose.importJWK(publicKeyData, header.alg || 'ES256');

      // Verify and decode the JWT
      const { payload } = await jose.jwtVerify(signedTransaction, publicKey, {
        algorithms: ['ES256'],
        issuer: 'appstoreconnect-v1',
      });

      subscriptionLogger.info('Apple StoreKit 2 JWT validated successfully');
      return payload;
    } catch (error: any) {
      subscriptionLogger.error({
        err: error,
        errorMessage: error.message,
      }, 'Apple StoreKit 2 JWT validation failed');
      throw new ApiError(400, `JWT validation failed: ${error.message}`, 'INVALID_JWT');
    }
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

      subscriptionLogger.debug({
        packageName,
        productId,
      }, 'Validating Google Play subscription');

      const response = await axios.get(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from Google Play API');
      }

      if (!response.data.lineItems || response.data.lineItems.length === 0) {
        throw new Error('No line items in Google Play response');
      }

      const lineItem = response.data.lineItems[0];

      // Verify product ID matches
      if (lineItem.productId !== productId) {
        subscriptionLogger.warn({
          expected: productId,
          received: lineItem.productId,
        }, 'Product ID mismatch in Google receipt');
        throw new Error(`Product ID mismatch: expected ${productId}, got ${lineItem.productId}`);
      }

      subscriptionLogger.info({
        productId,
        subscriptionState: response.data.subscriptionState,
      }, 'Google Play receipt validated successfully');

      return response.data;
    } catch (error: any) {
      subscriptionLogger.error({
        err: error,
        errorMessage: error.message,
        productId,
        statusCode: error.response?.status,
        responseData: error.response?.data,
      }, 'Google receipt validation failed');

      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new ApiError(401, 'Google Play authentication failed', 'GOOGLE_AUTH_FAILED');
      } else if (error.response?.status === 404) {
        throw new ApiError(404, 'Purchase not found in Google Play', 'PURCHASE_NOT_FOUND');
      } else if (error.response?.status === 400) {
        throw new ApiError(400, 'Invalid purchase token', 'INVALID_TOKEN');
      }

      throw new ApiError(500, `Google Play validation failed: ${error.message}`, 'VALIDATION_FAILED');
    }
  }

  /**
   * Get Google OAuth2 access token with caching
   */
  private static async getGoogleAccessToken(): Promise<string> {
    try {
      // Check cache first
      const now = Date.now();
      if (googleAccessTokenCache && googleAccessTokenCache.expiresAt > now + 60000) {
        subscriptionLogger.debug('Using cached Google access token');
        return googleAccessTokenCache.token;
      }

      const serviceAccountKey = config.iap?.google?.serviceAccountKey;

      if (!serviceAccountKey) {
        throw new Error('Google service account not configured');
      }

      // Parse service account credentials
      let credentials;
      try {
        credentials = typeof serviceAccountKey === 'string'
          ? JSON.parse(serviceAccountKey)
          : serviceAccountKey;
      } catch (error) {
        throw new Error('Invalid Google service account key format');
      }

      // Create JWT client with service account credentials
      const jwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      // Get access token
      const tokenResponse = await jwtClient.getAccessToken();

      if (!tokenResponse.token) {
        throw new Error('Failed to get Google access token - no token in response');
      }

      // Cache the token (expires in 1 hour, cache for 50 minutes)
      googleAccessTokenCache = {
        token: tokenResponse.token,
        expiresAt: now + (50 * 60 * 1000),
      };

      subscriptionLogger.info('Google access token obtained and cached');
      return tokenResponse.token;
    } catch (error: any) {
      subscriptionLogger.error({
        err: error,
        errorMessage: error.message,
      }, 'Failed to get Google access token');
      throw new ApiError(500, `Google authentication failed: ${error.message}`, 'GOOGLE_AUTH_FAILED');
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

    // Input validation
    if (!userId || !platform || !productId || !receipt) {
      throw new ApiError(400, 'Missing required parameters', 'INVALID_REQUEST');
    }

    // Check if product ID is valid
    const productMapping = PRODUCT_MAPPINGS[productId as keyof typeof PRODUCT_MAPPINGS];
    if (!productMapping) {
      subscriptionLogger.warn({ productId }, 'Invalid product ID received');
      throw new ApiError(400, `Invalid product ID: ${productId}`, 'INVALID_PRODUCT');
    }

    try {
      let validationResult;
      let expiryDate: Date;
      let originalTransactionId: string;

      if (platform === 'ios') {
        // Check if it's a StoreKit 2 JWT or traditional receipt
        if (receipt.includes('.')) {
          // StoreKit 2 JWT format
          subscriptionLogger.debug('Processing Apple StoreKit 2 JWT');
          validationResult = await this.validateAppleStoreKit2JWT(receipt);

          // Extract expiry date from JWT payload
          if (!validationResult.expiresDate && !validationResult.expirationDate) {
            throw new Error('No expiration date found in StoreKit 2 JWT');
          }
          const expiryTimestamp = validationResult.expiresDate || validationResult.expirationDate;
          expiryDate = new Date(expiryTimestamp);
          originalTransactionId = validationResult.originalTransactionId || transactionId;

          // Validate expiry date is not in the past
          if (isNaN(expiryDate.getTime())) {
            throw new Error('Invalid expiration date in StoreKit 2 JWT');
          }
        } else {
          // Traditional receipt format
          subscriptionLogger.debug('Processing Apple traditional receipt');
          validationResult = await this.validateAppleReceipt(receipt);
          const latestReceipt = validationResult.latest_receipt_info?.[0];

          if (!latestReceipt) {
            throw new Error('No valid receipt found in Apple response');
          }

          // Validate expires_date_ms exists
          if (!latestReceipt.expires_date_ms) {
            throw new Error('No expiration date in Apple receipt');
          }

          expiryDate = new Date(parseInt(latestReceipt.expires_date_ms));
          originalTransactionId = latestReceipt.original_transaction_id;

          // Validate the date is reasonable
          if (isNaN(expiryDate.getTime())) {
            throw new Error('Invalid expiration date in Apple receipt');
          }
        }
      } else {
        // Android/Google Play
        subscriptionLogger.debug('Processing Google Play receipt');
        validationResult = await this.validateGoogleReceipt(productId, receipt);

        const lineItem = validationResult.lineItems?.[0];
        if (!lineItem?.expiryTime) {
          throw new Error('No expiry time found in Google Play response');
        }

        expiryDate = new Date(lineItem.expiryTime);
        originalTransactionId = validationResult.orderId || transactionId;

        // Validate the date is reasonable
        if (isNaN(expiryDate.getTime())) {
          throw new Error('Invalid expiration date in Google Play receipt');
        }
      }

      // Determine subscription status
      const isActive = expiryDate > new Date();
      const status: SubscriptionStatus = isActive ? 'ACTIVE' : 'EXPIRED';

      subscriptionLogger.debug({
        expiryDate: expiryDate.toISOString(),
        isActive,
        originalTransactionId,
      }, 'Receipt validation successful, checking database');

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
        subscriptionLogger.debug({ subscriptionId: subscription.id }, 'Updating existing subscription');

        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status,
            plan: productMapping.plan as SubscriptionPlan,
            currentPeriodEnd: expiryDate,
            metadata: {
              ...((subscription.metadata as any) || {}),
              lastValidatedAt: new Date().toISOString(),
              platform,
              productId,
              validationSource: platform === 'ios' ? 'apple_receipt' : 'google_play',
            },
          },
        });
      } else {
        // Create new subscription
        subscriptionLogger.debug('Creating new subscription');

        subscription = await prisma.subscription.create({
          data: {
            userId,
            plan: productMapping.plan as SubscriptionPlan,
            status,
            startDate: new Date(),
            currentPeriodEnd: expiryDate,
            provider: platform === 'ios' ? 'APPLE' : 'GOOGLE',
            externalId: originalTransactionId,
            metadata: {
              platform,
              productId,
              billingPeriod: productMapping.period,
              originalTransactionId,
              validationSource: platform === 'ios' ? 'apple_receipt' : 'google_play',
              lastValidatedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Update user's subscription status
      const updatedPlan = subscription.status === 'ACTIVE' ? subscription.plan : 'FREE';
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionPlan: updatedPlan,
        },
      });

      subscriptionLogger.info({
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        expiryDate: expiryDate.toISOString(),
      }, 'Receipt validated and subscription updated successfully');

      return subscription;
    } catch (error: any) {
      // Log detailed error information
      subscriptionLogger.error({
        err: error,
        userId,
        platform,
        productId,
        errorMessage: error.message,
        errorCode: error.code,
      }, 'Receipt validation failed');

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        400,
        `Receipt validation failed: ${error.message}`,
        'VALIDATION_FAILED'
      );
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