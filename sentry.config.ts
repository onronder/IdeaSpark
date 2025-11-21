// Temporarily disable Sentry import due to __extends issue
// TODO: Fix Sentry configuration after running sentry wizard
// import * as Sentry from 'sentry-expo';
let Sentry: any = null;

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  console.log('Sentry temporarily disabled - run sentry wizard to configure');
  return;

  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__, // Enable debug mode in development
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in prod
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', /^\/api/],
        routingInstrumentation: Sentry.reactNavigationInstrumentation(),
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

// Error boundary wrapper for React components (stub for now)
import React from 'react';
export const SentryErrorBoundary = ({ children, fallback }: any) => children;

// Manual error capture (stub - just log to console)
export function captureException(error: Error | string, context?: Record<string, any>) {
  if (__DEV__) {
    console.error('[Sentry Stub] Exception:', error, context);
  }
}

// Capture message (stub - just log to console)
export function captureMessage(message: string, level: string = 'info') {
  if (__DEV__) {
    console.log(`[Sentry Stub] ${level}:`, message);
  }
}

// Add breadcrumb (stub - just log to console)
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: string;
  data?: Record<string, any>;
}) {
  if (__DEV__) {
    console.log('[Sentry Stub] Breadcrumb:', breadcrumb);
  }
}

// Set user context (stub - no-op)
export function setUser(user: { id: string; username?: string } | null) {
  if (__DEV__) {
    console.log('[Sentry Stub] Set user:', user);
  }
}

// Performance monitoring (stub - no-op)
export function startTransaction(name: string, op: string = 'navigation') {
  if (__DEV__) {
    console.log('[Sentry Stub] Start transaction:', name, op);
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