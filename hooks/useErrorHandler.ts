import { useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useLogger } from '@/hooks/useLogger';
import { handleError, AppError, ErrorType, withErrorHandling } from '@/utils/errorHandler';

/**
 * Hook that provides error handling with automatic toast notifications
 */
export function useErrorHandler(componentName: string) {
  const toast = useToast();
  const logger = useLogger(componentName);

  /**
   * Handle error with toast notification
   */
  const handleErrorWithToast = useCallback((
    error: Error | AppError | any,
    customMessage?: string,
    showToast: boolean = true
  ) => {
    const result = handleError(error, { component: componentName });

    if (showToast && result.shouldShowToast) {
      const message = customMessage || result.userMessage;

      if (result.toastType === 'error') {
        toast.error('Error', message);
      } else {
        toast.warning('Warning', message);
      }
    }

    return result.userMessage;
  }, [componentName, toast]);

  /**
   * Wrap async function with error handling
   */
  const wrapAsync = useCallback(<T,>(
    fn: () => Promise<T>,
    options?: {
      customMessage?: string;
      showToast?: boolean;
      onError?: (error: any) => void;
    }
  ): Promise<T | null> => {
    return fn().catch((error) => {
      handleErrorWithToast(error, options?.customMessage, options?.showToast);
      options?.onError?.(error);
      return null;
    });
  }, [handleErrorWithToast]);

  /**
   * Handle specific error types
   */
  const handleAuthError = useCallback((error: any) => {
    logger.warn('Authentication error occurred', { error });
    toast.error('Authentication Required', 'Please sign in to continue');
  }, [logger, toast]);

  const handleQuotaError = useCallback((error: any) => {
    logger.info('Quota exceeded', { error });
    toast.warning(
      'Quota Exceeded',
      'Upgrade to Pro for unlimited access'
    );
    toast.showToast({
      type: 'warning',
      title: 'Quota Exceeded',
      message: 'You\'ve reached your limit',
      action: {
        label: 'Upgrade Now',
        onPress: () => {
          // Navigation will be handled by the component
          logger.logUserAction('upgrade_prompt_clicked');
        },
      },
      duration: 7000,
    });
  }, [logger, toast]);

  const handleNetworkError = useCallback((error: any) => {
    logger.debug('Network error', { error });
    toast.error('Connection Error', 'Please check your internet connection');
  }, [logger, toast]);

  const handleValidationError = useCallback((error: any, fieldErrors?: Record<string, string>) => {
    logger.debug('Validation error', { error, fieldErrors });

    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const firstError = Object.values(fieldErrors)[0];
      toast.warning('Validation Error', firstError);
    } else {
      toast.warning('Validation Error', 'Please check your input');
    }
  }, [logger, toast]);

  /**
   * Generic error handler with type detection
   */
  const handle = useCallback((error: any) => {
    const appError = error as AppError;

    switch (appError.type) {
      case ErrorType.AUTH:
        handleAuthError(error);
        break;
      case ErrorType.QUOTA:
        handleQuotaError(error);
        break;
      case ErrorType.NETWORK:
        handleNetworkError(error);
        break;
      case ErrorType.VALIDATION:
        handleValidationError(error);
        break;
      default:
        handleErrorWithToast(error);
    }
  }, [
    handleAuthError,
    handleQuotaError,
    handleNetworkError,
    handleValidationError,
    handleErrorWithToast,
  ]);

  return {
    handleError: handleErrorWithToast,
    handleAuthError,
    handleQuotaError,
    handleNetworkError,
    handleValidationError,
    handle,
    wrapAsync,
    logger,
  };
}

/**
 * Hook for handling form validation errors
 */
export function useFormErrorHandler() {
  const toast = useToast();

  const showFieldError = useCallback((field: string, message: string) => {
    toast.warning(`Invalid ${field}`, message);
  }, [toast]);

  const showFormError = useCallback((message: string) => {
    toast.error('Form Error', message);
  }, [toast]);

  const clearErrors = useCallback(() => {
    toast.clearAllToasts();
  }, [toast]);

  return {
    showFieldError,
    showFormError,
    clearErrors,
  };
}