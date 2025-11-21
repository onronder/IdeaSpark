import * as Sentry from '@sentry/node';
import { config } from '../config';
import { logger } from './logger';

export function initSentry() {
  if (!config.sentry.dsn) {
    logger.info('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    tracesSampleRate: config.sentry.sampleRate,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Don't send events in development unless explicitly enabled
      if (config.isDevelopment && !process.env.SENTRY_DEBUG) {
        return null;
      }

      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error && error instanceof Error) {
        // Skip expected errors
        if (error.message?.includes('ECONNREFUSED')) {
          return null;
        }
        if (error.message?.includes('ETIMEDOUT')) {
          return null;
        }
      }

      return event;
    },
  });

  logger.info('Sentry initialized successfully');
}

export function captureException(error: Error | string, context?: Record<string, any>) {
  if (!config.sentry.dsn) return;

  if (typeof error === 'string') {
    error = new Error(error);
  }

  if (context) {
    Sentry.withScope((scope) => {
      scope.setContext('additional', context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!config.sentry.dsn) return;
  Sentry.captureMessage(message, level);
}