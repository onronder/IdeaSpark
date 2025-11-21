import { useCallback } from 'react';
import { captureException, captureMessage, addBreadcrumb } from '@/sentry.config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Custom hook for structured logging with Sentry integration
 * Provides consistent logging throughout the app with automatic Sentry breadcrumbs
 */
export function useLogger(component: string) {
  const log = useCallback(
    (level: LogLevel, message: string, context?: LogContext) => {
      const logData = {
        component,
        level,
        message,
        ...context,
        timestamp: new Date().toISOString(),
      };

      // Console logging in development
      if (__DEV__) {
        const logMethod = level === 'error' ? console.error : console[level] || console.log;
        logMethod(`[${component}]`, message, context || '');
      }

      // Add breadcrumb to Sentry for all log levels
      addBreadcrumb({
        message,
        category: component,
        level: level === 'warn' ? 'warning' : level,
        data: context,
      });

      // Capture errors to Sentry
      if (level === 'error') {
        const error = context?.error || new Error(message);
        captureException(error, {
          component,
          ...context,
        });
      }

      // Capture warnings as messages in production
      if (level === 'warn' && !__DEV__) {
        captureMessage(message, 'warning');
      }
    },
    [component],
  );

  return {
    debug: useCallback(
      (message: string, context?: LogContext) => log('debug', message, context),
      [log],
    ),
    info: useCallback(
      (message: string, context?: LogContext) => log('info', message, context),
      [log],
    ),
    warn: useCallback(
      (message: string, context?: LogContext) => log('warn', message, context),
      [log],
    ),
    error: useCallback(
      (message: string, error?: Error | any, context?: LogContext) => {
        if (error instanceof Error) {
          log('error', message, { error, stack: error.stack, ...context });
        } else if (error) {
          log('error', message, { error, ...context });
        } else {
          log('error', message, context);
        }
      },
      [log],
    ),
    // Utility method for logging API calls
    logApiCall: useCallback(
      (method: string, url: string, status?: number, error?: Error) => {
        const message = `API ${method} ${url}`;
        const context: LogContext = {
          method,
          url,
          status,
        };

        if (error) {
          log('error', `${message} failed`, { ...context, error });
        } else if (status && status >= 400) {
          log('warn', `${message} returned ${status}`, context);
        } else {
          log('debug', `${message} successful`, context);
        }
      },
      [log],
    ),
    // Utility method for logging user actions
    logUserAction: useCallback(
      (action: string, details?: any) => {
        log('info', `User action: ${action}`, { action, details });
      },
      [log],
    ),
    // Utility method for logging performance metrics
    logPerformance: useCallback(
      (operation: string, duration: number, metadata?: any) => {
        const level: LogLevel = duration > 3000 ? 'warn' : 'debug';
        log(level, `Performance: ${operation} took ${duration}ms`, {
          operation,
          duration,
          ...metadata,
        });
      },
      [log],
    ),
  };
}

/**
 * Global logger for use outside of React components
 */
class GlobalLogger {
  private component: string = 'Global';

  setComponent(component: string) {
    this.component = component;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (__DEV__) {
      const logMethod = level === 'error' ? console.error : console[level] || console.log;
      logMethod(`[${this.component}]`, message, context || '');
    }

    addBreadcrumb({
      message,
      category: this.component,
      level: level === 'warn' ? 'warning' : level,
      data: context,
    });

    if (level === 'error') {
      const error = context?.error || new Error(message);
      captureException(error, {
        component: this.component,
        ...context,
      });
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    if (error instanceof Error) {
      this.log('error', message, { error, stack: error.stack, ...context });
    } else if (error) {
      this.log('error', message, { error, ...context });
    } else {
      this.log('error', message, context);
    }
  }
}

export const logger = new GlobalLogger();