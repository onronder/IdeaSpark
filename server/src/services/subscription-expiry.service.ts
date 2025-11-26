import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { SubscriptionStatus } from '@prisma/client';
import { subDays, addDays, isBefore } from 'date-fns';

const expiryLogger = logger.child({ module: 'subscription-expiry.service' });

// Grace period in days (how long after expiry before fully downgrading)
const GRACE_PERIOD_DAYS = 3;

// Warning periods before expiry (in days)
const WARNING_PERIODS = [7, 3, 1]; // Warn at 7 days, 3 days, and 1 day before expiry

export class SubscriptionExpiryService {
  /**
   * Check and expire subscriptions that are past their expiry date
   * Should be run periodically (e.g., every hour)
   */
  static async processExpiredSubscriptions(): Promise<void> {
    expiryLogger.info('Starting subscription expiry processing');

    try {
      const now = new Date();

      // Find subscriptions that are expired but still marked as ACTIVE
      const expiredSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            lt: now,
          },
        },
        include: {
          user: true,
        },
      });

      expiryLogger.info({
        count: expiredSubscriptions.length,
      }, 'Found expired subscriptions to process');

      let processedCount = 0;
      let errorCount = 0;

      for (const subscription of expiredSubscriptions) {
        try {
          await this.handleExpiredSubscription(subscription);
          processedCount++;
        } catch (error) {
          errorCount++;
          expiryLogger.error({
            err: error,
            subscriptionId: subscription.id,
            userId: subscription.userId,
          }, 'Failed to process expired subscription');
        }
      }

      expiryLogger.info({
        total: expiredSubscriptions.length,
        processed: processedCount,
        errors: errorCount,
      }, 'Subscription expiry processing completed');
    } catch (error) {
      expiryLogger.error({ err: error }, 'Subscription expiry processing failed');
      throw error;
    }
  }

  /**
   * Handle a single expired subscription
   */
  private static async handleExpiredSubscription(subscription: any): Promise<void> {
    const now = new Date();
    const gracePeriodEnd = addDays(subscription.currentPeriodEnd, GRACE_PERIOD_DAYS);

    // Check if grace period has ended
    const isGracePeriodOver = isBefore(gracePeriodEnd, now);

    if (isGracePeriodOver) {
      // Grace period is over - fully expire and downgrade
      await this.expireSubscription(subscription);
    } else {
      // Still in grace period - mark as EXPIRED but don't downgrade user yet
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'EXPIRED',
          metadata: {
            ...((subscription.metadata as any) || {}),
            expiredAt: new Date().toISOString(),
            gracePeriodEnd: gracePeriodEnd.toISOString(),
          },
        },
      });

      // Send grace period notification
      await this.sendGracePeriodNotification(subscription.user, gracePeriodEnd);

      expiryLogger.info({
        subscriptionId: subscription.id,
        userId: subscription.userId,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
      }, 'Subscription in grace period');
    }
  }

  /**
   * Fully expire subscription and downgrade user
   */
  private static async expireSubscription(subscription: any): Promise<void> {
    expiryLogger.info({
      subscriptionId: subscription.id,
      userId: subscription.userId,
    }, 'Expiring subscription and downgrading user');

    await prisma.$transaction(async (tx) => {
      // Update subscription status
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'EXPIRED',
          metadata: {
            ...((subscription.metadata as any) || {}),
            expiredAt: new Date().toISOString(),
            fullyExpiredAt: new Date().toISOString(),
          },
        },
      });

      // Downgrade user to FREE plan
      await tx.user.update({
        where: { id: subscription.userId },
        data: {
          subscriptionPlan: 'FREE',
        },
      });
    });

    // Send expiry notification
    await this.sendExpiryNotification(subscription.user);
  }

  /**
   * Check for subscriptions approaching expiry and send warnings
   * Should be run daily
   */
  static async sendExpiryWarnings(): Promise<void> {
    expiryLogger.info('Checking for subscriptions approaching expiry');

    try {
      const now = new Date();
      let totalWarnings = 0;

      for (const warningDays of WARNING_PERIODS) {
        const warningDate = addDays(now, warningDays);
        const nextDay = addDays(warningDate, 1);

        // Find subscriptions expiring in exactly N days
        const expiringSubscriptions = await prisma.subscription.findMany({
          where: {
            status: 'ACTIVE',
            currentPeriodEnd: {
              gte: warningDate,
              lt: nextDay,
            },
          },
          include: {
            user: true,
          },
        });

        expiryLogger.info({
          warningDays,
          count: expiringSubscriptions.length,
        }, `Found subscriptions expiring in ${warningDays} days`);

        for (const subscription of expiringSubscriptions) {
          try {
            // Check if we already sent this warning
            const metadata = (subscription.metadata as any) || {};
            const sentWarnings = metadata.sentWarnings || [];

            if (!sentWarnings.includes(`${warningDays}d`)) {
              await this.sendExpiryWarningNotification(
                subscription.user,
                subscription.currentPeriodEnd!,
                warningDays
              );

              // Mark warning as sent
              await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                  metadata: {
                    ...metadata,
                    sentWarnings: [...sentWarnings, `${warningDays}d`],
                  },
                },
              });

              totalWarnings++;
            }
          } catch (error) {
            expiryLogger.error({
              err: error,
              subscriptionId: subscription.id,
            }, 'Failed to send expiry warning');
          }
        }
      }

      expiryLogger.info({
        totalWarnings,
      }, 'Expiry warnings sent');
    } catch (error) {
      expiryLogger.error({ err: error }, 'Failed to send expiry warnings');
      throw error;
    }
  }

  /**
   * Send warning email about upcoming expiry
   */
  private static async sendExpiryWarningNotification(
    user: any,
    expiryDate: Date,
    daysUntilExpiry: number
  ): Promise<void> {
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: `Your IdeaSpark subscription expires in ${daysUntilExpiry} days`,
        html: `
          <h2>Subscription Expiring Soon</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>Your IdeaSpark ${user.subscriptionPlan} subscription will expire on <strong>${expiryDate.toLocaleDateString()}</strong> (in ${daysUntilExpiry} days).</p>
          <p>To continue enjoying premium features, please renew your subscription in the app.</p>
          <h3>What happens when my subscription expires?</h3>
          <ul>
            <li>You'll have a ${GRACE_PERIOD_DAYS}-day grace period to renew</li>
            <li>After that, your account will be downgraded to the Free plan</li>
            <li>Your ideas will be preserved, but premium features will be locked</li>
          </ul>
          <p>Questions? Reply to this email and we'll be happy to help.</p>
          <p>Best,<br>The IdeaSpark Team</p>
        `,
      });

      expiryLogger.info({
        userId: user.id,
        daysUntilExpiry,
      }, 'Expiry warning email sent');
    } catch (error) {
      expiryLogger.error({
        err: error,
        userId: user.id,
      }, 'Failed to send expiry warning email');
      // Don't throw - we don't want to fail the entire process if one email fails
    }
  }

  /**
   * Send grace period notification
   */
  private static async sendGracePeriodNotification(
    user: any,
    gracePeriodEnd: Date
  ): Promise<void> {
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Your IdeaSpark subscription has expired - Grace Period Active',
        html: `
          <h2>Subscription Expired - Grace Period Active</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>Your IdeaSpark subscription has expired, but don't worry - you're in a ${GRACE_PERIOD_DAYS}-day grace period.</p>
          <p><strong>Grace period ends: ${gracePeriodEnd.toLocaleDateString()}</strong></p>
          <h3>What does this mean?</h3>
          <ul>
            <li>You can still access premium features during the grace period</li>
            <li>Renew now to keep your subscription active</li>
            <li>After the grace period, your account will be downgraded to Free</li>
          </ul>
          <p>Renew your subscription in the app to continue enjoying premium features.</p>
          <p>Best,<br>The IdeaSpark Team</p>
        `,
      });

      expiryLogger.info({
        userId: user.id,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
      }, 'Grace period notification sent');
    } catch (error) {
      expiryLogger.error({
        err: error,
        userId: user.id,
      }, 'Failed to send grace period notification');
    }
  }

  /**
   * Send final expiry notification
   */
  private static async sendExpiryNotification(user: any): Promise<void> {
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Your IdeaSpark subscription has ended',
        html: `
          <h2>Subscription Ended</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>Your IdeaSpark subscription has ended and your account has been downgraded to the Free plan.</p>
          <h3>What happens now?</h3>
          <ul>
            <li>Your ideas and data are safe and preserved</li>
            <li>You can still use basic features on the Free plan</li>
            <li>Premium features are now locked</li>
            <li>You can upgrade anytime to regain access</li>
          </ul>
          <p>We'd love to have you back! Upgrade in the app to unlock premium features again.</p>
          <p>Thanks for being part of IdeaSpark!</p>
          <p>Best,<br>The IdeaSpark Team</p>
        `,
      });

      expiryLogger.info({
        userId: user.id,
      }, 'Expiry notification sent');
    } catch (error) {
      expiryLogger.error({
        err: error,
        userId: user.id,
      }, 'Failed to send expiry notification');
    }
  }

  /**
   * Get expiry statistics for monitoring
   */
  static async getExpiryStats(): Promise<any> {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    const nextWeek = addDays(now, 7);
    const gracePeriodCutoff = subDays(now, GRACE_PERIOD_DAYS);

    const [
      expiredCount,
      expiringTodayCount,
      expiringThisWeekCount,
      inGracePeriodCount,
    ] = await Promise.all([
      prisma.subscription.count({
        where: {
          status: 'EXPIRED',
          currentPeriodEnd: {
            lt: gracePeriodCutoff,
          },
        },
      }),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            gte: now,
            lt: tomorrow,
          },
        },
      }),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            gte: now,
            lt: nextWeek,
          },
        },
      }),
      prisma.subscription.count({
        where: {
          status: 'EXPIRED',
          currentPeriodEnd: {
            gte: gracePeriodCutoff,
            lt: now,
          },
        },
      }),
    ]);

    return {
      expired: expiredCount,
      expiringToday: expiringTodayCount,
      expiringThisWeek: expiringThisWeekCount,
      inGracePeriod: inGracePeriodCount,
      gracePeriodDays: GRACE_PERIOD_DAYS,
      warningPeriods: WARNING_PERIODS,
    };
  }
}
