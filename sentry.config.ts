import * as Sentry from '@sentry/react-native';
import { routingInstrumentation } from './lib/sentryRouting';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured - set EXPO_PUBLIC_SENTRY_DSN in .env');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: process.env.SENTRY_ENVIRONMENT || (__DEV__ ? 'development' : 'production'),
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', /^\/api/, /^\//],
        routingInstrumentation,
      }),
    ],
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Don't send events in development unless explicitly enabled
      if (__DEV__ && !process.env.EXPO_PUBLIC_SENTRY_DEBUG) {
        return null;
      }

      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error && error instanceof Error) {
        // Skip network errors that are expected
        if (error.message?.includes('Network request failed')) {
          return null;
        }
        // Skip cancellation errors
        if (error.message?.includes('cancelled')) {
          return null;
        }
      }

      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Filter out sensitive breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      // Sanitize data in breadcrumbs
      if (breadcrumb.data) {
        // Remove any potential PII from breadcrumb data
        const sanitized = { ...breadcrumb.data };
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.apiKey;
        delete sanitized.secret;
        breadcrumb.data = sanitized;
      }

      return breadcrumb;
    },
  });

  // Set initial user context (anonymous)
  Sentry.configureScope((scope) => {
    scope.setTag('app_version', process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0');
    scope.setContext('device', {
      simulator: __DEV__,
    });
  });
}

// Error boundary wrapper for React components
import React from 'react';

interface SentryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  showDialog?: boolean;
}

export const SentryErrorBoundary: React.FC<SentryErrorBoundaryProps> = ({
  children,
  fallback,
  showDialog = false
}) => {
  if (!SENTRY_DSN) {
    // If Sentry not configured, just render children
    return <>{children}</>;
  }

  const ErrorBoundary = Sentry.ErrorBoundary;
  return (
    <ErrorBoundary fallback={fallback} showDialog={showDialog}>
      {children}
    </ErrorBoundary>
  );
};

// Manual error capture
export function captureException(error: Error | string, context?: Record<string, any>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { contexts: { custom: context } });
  }
  if (__DEV__) {
    console.error('[Sentry] Exception:', error, context);
  }
}

// Capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
  if (__DEV__) {
    console.log(`[Sentry] ${level}:`, message);
  }
}

// Add breadcrumb
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}) {
  if (SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb as Sentry.Breadcrumb);
  }
  if (__DEV__) {
    console.log('[Sentry] Breadcrumb:', breadcrumb);
  }
}

// Set user context
export function setUser(user: { id: string; username?: string; email?: string } | null) {
  if (SENTRY_DSN) {
    Sentry.setUser(user);
  }
  if (__DEV__) {
    console.log('[Sentry] Set user:', user);
  }
}

// Performance monitoring
export function startTransaction(name: string, op: string = 'navigation') {
  if (SENTRY_DSN) {
    return Sentry.startTransaction({ name, op });
  }
  if (__DEV__) {
    console.log('[Sentry] Start transaction:', name, op);
  }
  return null;
}

// Custom hook for error logging
export function useErrorHandler() {
  return (error: Error, isFatal?: boolean) => {
    if (__DEV__) {
      console.error('Error caught:', error);
    }

    captureException(error, {
      fatal: isFatal,
      component: 'ErrorHandler',
    });
  };
}