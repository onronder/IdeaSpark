import { captureException } from '@/sentry.config';
import { ToastMessages } from '@/contexts/ToastContext';
import { logger } from '@/hooks/useLogger';

// Error types for categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  QUOTA = 'QUOTA',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AppError extends Error {
  type?: ErrorType;
  severity?: ErrorSeverity;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  userMessage?: string;
  shouldReport?: boolean;
}

/**
 * Categorize error based on its properties
 */
export function categorizeError(error: any): ErrorType {
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    code === 'network_error' ||
    error.statusCode === 0
  ) {
    return ErrorType.NETWORK;
  }

  // Auth errors
  if (
    message.includes('unauthorized') ||
    message.includes('authentication') ||
    message.includes('token') ||
    error.statusCode === 401 ||
    error.statusCode === 403
  ) {
    return ErrorType.AUTH;
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    error.statusCode === 400
  ) {
    return ErrorType.VALIDATION;
  }

  // Quota errors
  if (
    message.includes('quota') ||
    message.includes('limit') ||
    message.includes('exceeded') ||
    error.statusCode === 429
  ) {
    return ErrorType.QUOTA;
  }

  // Server errors
  if (error.statusCode >= 500) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Determine error severity
 */
export function determineErrorSeverity(error: AppError): ErrorSeverity {
  // Critical: Auth failures, server crashes
  if (error.type === ErrorType.AUTH && error.statusCode === 401) {
    return ErrorSeverity.HIGH;
  }
  if (error.type === ErrorType.SERVER) {
    return ErrorSeverity.CRITICAL;
  }

  // High: Quota exceeded, permissions
  if (error.type === ErrorType.QUOTA || error.type === ErrorType.PERMISSION) {
    return ErrorSeverity.HIGH;
  }

  // Medium: Validation errors
  if (error.type === ErrorType.VALIDATION) {
    return ErrorSeverity.MEDIUM;
  }

  // Low: Network errors (usually temporary)
  if (error.type === ErrorType.NETWORK) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  if (error.userMessage) {
    return error.userMessage;
  }

  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Connection error. Please check your internet and try again.';
    case ErrorType.AUTH:
      if (error.statusCode === 401) {
        return 'Your session has expired. Please sign in again.';
      }
      return 'Authentication failed. Please try signing in again.';
    case ErrorType.VALIDATION:
      return 'Please check your input and try again.';
    case ErrorType.QUOTA:
      return 'You\'ve reached your usage limit. Please upgrade to continue.';
    case ErrorType.PERMISSION:
      return 'You don\'t have permission to perform this action.';
    case ErrorType.SERVER:
      return 'Something went wrong on our end. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Main error handler
 */
export function handleError(
  error: Error | AppError | any,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    [key: string]: any;
  }
): {
  userMessage: string;
  shouldShowToast: boolean;
  toastType: 'error' | 'warning';
} {
  // Create AppError if needed
  const appError: AppError = error instanceof Error ? error : new Error(String(error));

  // Categorize if not already done
  if (!appError.type) {
    appError.type = categorizeError(error);
  }

  // Determine severity
  if (!appError.severity) {
    appError.severity = determineErrorSeverity(appError);
  }

  // Add context
  appError.context = {
    ...appError.context,
    ...context,
  };

  // Get user message
  const userMessage = getUserFriendlyMessage(appError);

  // Log locally
  const logContext = {
    type: appError.type,
    severity: appError.severity,
    code: appError.code,
    statusCode: appError.statusCode,
    ...appError.context,
  };

  if (appError.severity === ErrorSeverity.CRITICAL || appError.severity === ErrorSeverity.HIGH) {
    logger.error(appError.message, appError, logContext);
  } else {
    logger.warn(appError.message, logContext);
  }

  // Report to Sentry based on severity and flags
  const shouldReport = appError.shouldReport !== false && (
    appError.severity === ErrorSeverity.CRITICAL ||
    appError.severity === ErrorSeverity.HIGH ||
    (appError.severity === ErrorSeverity.MEDIUM && appError.type !== ErrorType.VALIDATION)
  );

  if (shouldReport && !__DEV__) {
    captureException(appError, logContext);
  }

  // Determine toast behavior
  const shouldShowToast = appError.type !== ErrorType.NETWORK || appError.severity === ErrorSeverity.HIGH;
  const toastType = appError.severity === ErrorSeverity.LOW ? 'warning' : 'error';

  return {
    userMessage,
    shouldShowToast,
    toastType,
  };
}

/**
 * Async error handler wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}

/**
 * React Query error handler
 */
export function createQueryErrorHandler(componentName: string) {
  return (error: any) => {
    handleError(error, {
      component: componentName,
      source: 'react-query',
    });
  };
}

/**
 * API Response error parser
 */
export function parseApiError(error: any): AppError {
  const appError: AppError = new Error('API Error');

  if (error.response) {
    // Server responded with error
    appError.statusCode = error.response.status;
    appError.message = error.response.data?.message || error.response.statusText;
    appError.code = error.response.data?.code;

    // Check for specific error types in response
    if (error.response.data?.type) {
      appError.type = error.response.data.type as ErrorType;
    }
  } else if (error.request) {
    // Request made but no response
    appError.type = ErrorType.NETWORK;
    appError.message = 'No response from server';
  } else {
    // Request setup error
    appError.message = error.message;
  }

  return appError;
}