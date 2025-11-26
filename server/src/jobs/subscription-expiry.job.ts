import Queue from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SubscriptionExpiryService } from '../services/subscription-expiry.service';

const jobLogger = logger.child({ module: 'subscription-expiry.job' });

// Create job queues
export const subscriptionExpiryQueue = new Queue('subscription-expiry', {
  redis: config.redis?.url || {
    host: 'localhost',
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

export const subscriptionWarningQueue = new Queue('subscription-warnings', {
  redis: config.redis?.url || {
    host: 'localhost',
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Process expired subscriptions
 */
subscriptionExpiryQueue.process(async (job) => {
  jobLogger.info({ jobId: job.id }, 'Processing subscription expiry job');

  try {
    await SubscriptionExpiryService.processExpiredSubscriptions();
    jobLogger.info({ jobId: job.id }, 'Subscription expiry job completed successfully');
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    jobLogger.error({ err: error, jobId: job.id }, 'Subscription expiry job failed');
    throw error;
  }
});

/**
 * Send expiry warnings
 */
subscriptionWarningQueue.process(async (job) => {
  jobLogger.info({ jobId: job.id }, 'Processing subscription warning job');

  try {
    await SubscriptionExpiryService.sendExpiryWarnings();
    jobLogger.info({ jobId: job.id }, 'Subscription warning job completed successfully');
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    jobLogger.error({ err: error, jobId: job.id }, 'Subscription warning job failed');
    throw error;
  }
});

/**
 * Setup recurring jobs
 */
export async function setupSubscriptionExpiryJobs(): Promise<void> {
  try {
    // Check for expired subscriptions every hour
    await subscriptionExpiryQueue.add(
      'check-expired',
      {},
      {
        repeat: {
          cron: '0 * * * *', // Every hour on the hour
        },
        jobId: 'subscription-expiry-check',
      }
    );

    jobLogger.info('Subscription expiry job scheduled (hourly)');

    // Send expiry warnings daily at 9 AM UTC
    await subscriptionWarningQueue.add(
      'send-warnings',
      {},
      {
        repeat: {
          cron: '0 9 * * *', // 9 AM UTC every day
        },
        jobId: 'subscription-warnings',
      }
    );

    jobLogger.info('Subscription warning job scheduled (daily at 9 AM UTC)');
  } catch (error) {
    jobLogger.error({ err: error }, 'Failed to setup subscription expiry jobs');
    throw error;
  }
}

/**
 * Trigger manual expiry check (for testing or manual intervention)
 */
export async function triggerExpiryCheck(): Promise<void> {
  await subscriptionExpiryQueue.add('manual-check', {}, { priority: 1 });
  jobLogger.info('Manual expiry check triggered');
}

/**
 * Trigger manual warning send (for testing or manual intervention)
 */
export async function triggerWarnings(): Promise<void> {
  await subscriptionWarningQueue.add('manual-warnings', {}, { priority: 1 });
  jobLogger.info('Manual warnings triggered');
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<any> {
  const [expiryStats, warningStats] = await Promise.all([
    subscriptionExpiryQueue.getJobCounts(),
    subscriptionWarningQueue.getJobCounts(),
  ]);

  return {
    expiry: expiryStats,
    warnings: warningStats,
  };
}

// Error handlers
subscriptionExpiryQueue.on('error', (error) => {
  jobLogger.error({ err: error }, 'Subscription expiry queue error');
});

subscriptionWarningQueue.on('error', (error) => {
  jobLogger.error({ err: error }, 'Subscription warning queue error');
});

// Completed handlers
subscriptionExpiryQueue.on('completed', (job, result) => {
  jobLogger.info({ jobId: job.id, result }, 'Subscription expiry job completed');
});

subscriptionWarningQueue.on('completed', (job, result) => {
  jobLogger.info({ jobId: job.id, result }, 'Subscription warning job completed');
});

// Failed handlers
subscriptionExpiryQueue.on('failed', (job, error) => {
  jobLogger.error({
    jobId: job?.id,
    err: error,
    attempts: job?.attemptsMade,
  }, 'Subscription expiry job failed');
});

subscriptionWarningQueue.on('failed', (job, error) => {
  jobLogger.error({
    jobId: job?.id,
    err: error,
    attempts: job?.attemptsMade,
  }, 'Subscription warning job failed');
});
