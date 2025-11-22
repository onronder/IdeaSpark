import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Alert, AlertIcon, AlertText, VStack, Button, ButtonText } from '@gluestack-ui/themed';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { captureException } from '@/sentry.config';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Higher-order component to wrap Gluestack components with error logging
export function withGluestackErrorLogging<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return React.forwardRef<any, P>((props, ref) => {
    const { handleError, logger } = useErrorHandler(`Gluestack:${componentName}`);

    // Log component mount/unmount for debugging
    React.useEffect(() => {
      logger.debug(`${componentName} mounted`, { props: Object.keys(props as any) });

      return () => {
        logger.debug(`${componentName} unmounted`);
      };
    }, []);

    // Wrap component to catch and log errors
    try {
      return <WrappedComponent {...props} ref={ref} />;
    } catch (error) {
      handleError(error, `Error rendering ${componentName}`);

      // Return a fallback UI
      return (
        <Alert action="error" variant="solid">
          <AlertIcon as={AlertTriangle} mr="$3" />
          <AlertText>Failed to render {componentName}</AlertText>
        </Alert>
      );
    }
  });
}

// Error boundary class for Gluestack components
export class GluestackErrorBoundary extends Component<Props, State> {
  private logger: ReturnType<typeof useErrorHandler>['logger'] | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName } = this.props;

    // Log to console in development
    if (__DEV__) {
      console.error(`GluestackErrorBoundary caught error in ${componentName}:`, error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Capture in Sentry
    captureException(error, {
      tags: {
        component: componentName,
        source: 'gluestack_error_boundary',
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Log error details
    const errorDetails = {
      componentName,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
    };

    // Store error details for potential recovery
    this.setState({
      hasError: true,
      error,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, componentName } = this.props;
      const { error } = this.state;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <VStack space="md" p="$4" bg="$error50" borderRadius="$lg">
          <Alert action="error" variant="solid">
            <AlertIcon as={AlertTriangle} mr="$3" />
            <AlertText>Component Error: {componentName}</AlertText>
          </Alert>

          {__DEV__ && error && (
            <Text style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>
              {error.message}
            </Text>
          )}

          <Button
            onPress={this.handleReset}
            size="sm"
            variant="outline"
            action="secondary"
          >
            <ButtonText>Try Again</ButtonText>
          </Button>
        </VStack>
      );
    }

    return this.props.children;
  }
}

// Hook to wrap Gluestack components with error logging
export function useGluestackErrorLogging(componentName: string) {
  const { handleError, logger } = useErrorHandler(`Gluestack:${componentName}`);

  const logAccessibilityWarning = (warning: string, details?: any) => {
    logger.warn(`Accessibility: ${warning}`, {
      component: componentName,
      ...details,
    });
  };

  const logStyleWarning = (warning: string, details?: any) => {
    logger.warn(`Style: ${warning}`, {
      component: componentName,
      ...details,
    });
  };

  const logLayoutError = (error: any, details?: any) => {
    handleError(error, `Layout error in ${componentName}`, {
      component: componentName,
      ...details,
    });
  };

  return {
    logAccessibilityWarning,
    logStyleWarning,
    logLayoutError,
    logger,
  };
}

// Utility to validate Gluestack theme tokens
export function validateThemeToken(token: string, value: any, componentName: string) {
  const { logger } = useErrorHandler(`Gluestack:${componentName}`);

  if (value === undefined || value === null) {
    logger.warn(`Invalid theme token: ${token}`, {
      component: componentName,
      token,
      value,
    });
    return false;
  }

  return true;
}

// Monitor Gluestack performance
export function useGluestackPerformanceMonitor(componentName: string) {
  const { logger } = useErrorHandler(`Gluestack:Performance:${componentName}`);
  const renderStartTime = React.useRef<number>(0);

  React.useEffect(() => {
    renderStartTime.current = performance.now();

    return () => {
      const renderEndTime = performance.now();
      const renderDuration = renderEndTime - renderStartTime.current;

      // Log slow renders (> 16ms for 60fps)
      if (renderDuration > 16) {
        logger.warn('Slow render detected', {
          component: componentName,
          duration: `${renderDuration.toFixed(2)}ms`,
          threshold: '16ms',
        });
      }
    };
  });
}