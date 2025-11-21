import * as admin from 'firebase-admin';
import * as path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';

const firebaseLogger = logger.child({ module: 'firebase.service' });

/**
 * Initialize Firebase Admin SDK
 */
class FirebaseService {
  private app: admin.app.App | null = null;
  private isInitialized = false;

  /**
   * Initialize Firebase Admin
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Try JSON file first (production), fall back to environment variables (development)
      const serviceAccountPath = path.join(__dirname, '../../firebase-admin-sdk.json');

      try {
        // Initialize with JSON file
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
        firebaseLogger.info('Firebase Admin initialized from JSON file');
      } catch (jsonError) {
        // Fall back to environment variables
        if (!config.firebase.projectId || !config.firebase.privateKey || !config.firebase.clientEmail) {
          firebaseLogger.warn('Firebase credentials not configured, skipping initialization');
          return;
        }

        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            privateKey: config.firebase.privateKey,
            clientEmail: config.firebase.clientEmail,
          }),
        });
        firebaseLogger.info('Firebase Admin initialized from environment variables');
      }

      this.isInitialized = true;
      firebaseLogger.info('Firebase Admin initialized successfully');
    } catch (error) {
      firebaseLogger.error({ err: error }, 'Failed to initialize Firebase Admin');
      throw new ApiError(500, 'Failed to initialize notification service', 'FIREBASE_INIT_ERROR');
    }
  }

  /**
   * Get Firebase Admin app instance
   */
  getApp(): admin.app.App {
    if (!this.app || !this.isInitialized) {
      throw new ApiError(500, 'Firebase not initialized', 'FIREBASE_NOT_INITIALIZED');
    }
    return this.app;
  }

  /**
   * Get messaging instance
   */
  getMessaging(): admin.messaging.Messaging {
    return this.getApp().messaging();
  }

  /**
   * Send push notification to a single device
   */
  async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      badge?: number;
      sound?: string;
      priority?: 'high' | 'normal';
      ttl?: number;
    }
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: options?.priority || 'high',
          ttl: options?.ttl || 86400 * 1000, // 1 day in milliseconds
          notification: {
            sound: options?.sound || 'default',
            priority: options?.priority === 'normal' ? 'default' : 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              badge: options?.badge,
              sound: options?.sound || 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const response = await this.getMessaging().send(message);
      firebaseLogger.info({
        messageId: response,
        token: token.substring(0, 10) + '...'
      }, 'Notification sent successfully');
      return response;
    } catch (error: any) {
      firebaseLogger.error({
        error: error.message,
        code: error.code,
        token: token.substring(0, 10) + '...'
      }, 'Failed to send notification');

      // Handle specific error codes
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        throw new ApiError(400, 'Invalid or expired push token', 'INVALID_PUSH_TOKEN');
      }

      throw new ApiError(500, 'Failed to send notification', 'NOTIFICATION_SEND_ERROR');
    }
  }

  /**
   * Send notifications to multiple devices
   */
  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              contentAvailable: true,
            },
          },
        },
      };

      const response = await (this.getMessaging() as any).sendMulticast(message);

      firebaseLogger.info({
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length,
      }, 'Multicast notification sent');

      // Log failures for debugging
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const token = tokens[idx];
            if (token) {
              firebaseLogger.warn({
                token: token.substring(0, 10) + '...',
                error: resp.error?.message,
                code: resp.error?.code,
              }, 'Notification failed for token');
            }
          }
        });
      }

      return response;
    } catch (error: any) {
      firebaseLogger.error({ err: error }, 'Failed to send multicast notification');
      throw new ApiError(500, 'Failed to send multicast notification', 'MULTICAST_SEND_ERROR');
    }
  }

  /**
   * Send topic notification
   */
  async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
            },
          },
        },
      };

      const response = await this.getMessaging().send(message);
      firebaseLogger.info({ messageId: response, topic }, 'Topic notification sent');
      return response;
    } catch (error: any) {
      firebaseLogger.error({ err: error }, 'Failed to send topic notification');
      throw new ApiError(500, 'Failed to send topic notification', 'TOPIC_SEND_ERROR');
    }
  }

  /**
   * Subscribe tokens to topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.getMessaging().subscribeToTopic(tokens, topic);

      firebaseLogger.info({
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      }, 'Subscribed to topic');

      if (response.failureCount > 0) {
        firebaseLogger.warn({
          topic,
          errors: response.errors,
        }, 'Some subscriptions failed');
      }
    } catch (error: any) {
      firebaseLogger.error({ err: error }, 'Failed to subscribe to topic');
      throw new ApiError(500, 'Failed to subscribe to topic', 'TOPIC_SUBSCRIBE_ERROR');
    }
  }

  /**
   * Unsubscribe tokens from topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.getMessaging().unsubscribeFromTopic(tokens, topic);

      firebaseLogger.info({
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
      }, 'Unsubscribed from topic');
    } catch (error: any) {
      firebaseLogger.error({ err: error }, 'Failed to unsubscribe from topic');
      throw new ApiError(500, 'Failed to unsubscribe from topic', 'TOPIC_UNSUBSCRIBE_ERROR');
    }
  }

  /**
   * Validate FCM token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      // Send a dry run message to validate the token
      await this.getMessaging().send({
        token,
        notification: {
          title: 'Test',
          body: 'Test',
        },
      }, true); // dry run = true

      return true;
    } catch (error: any) {
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        return false;
      }

      // For other errors, we assume the token might be valid
      firebaseLogger.warn({ error: error.message }, 'Token validation uncertain');
      return true;
    }
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();