/**
 * Safe wrappers for Gluestack components with enhanced error logging
 * These components automatically log errors, accessibility warnings, and performance issues
 */

import React from 'react';
import {
  Card as GluestackCard,
  Button as GluestackButton,
  Input as GluestackInput,
  Modal as GluestackModal,
  Alert as GluestackAlert,
  FormControl as GluestackFormControl,
  CardProps,
  ButtonProps,
  InputProps,
  ModalProps,
  AlertProps,
  FormControlProps,
} from '@gluestack-ui/themed';
import {
  GluestackErrorBoundary,
  withGluestackErrorLogging,
  useGluestackErrorLogging,
  useGluestackPerformanceMonitor,
} from './GluestackErrorBoundary';

// Safe Card component with error boundary
export const SafeCard = React.forwardRef<any, CardProps>((props, ref) => {
  const { logAccessibilityWarning } = useGluestackErrorLogging('Card');
  useGluestackPerformanceMonitor('Card');

  // Check for accessibility issues
  React.useEffect(() => {
    if (!props.accessibilityLabel && !props.accessibilityHint) {
      logAccessibilityWarning('Card missing accessibility labels', {
        hasLabel: !!props.accessibilityLabel,
        hasHint: !!props.accessibilityHint,
      });
    }
  }, [props.accessibilityLabel, props.accessibilityHint]);

  return (
    <GluestackErrorBoundary componentName="Card">
      <GluestackCard {...props} ref={ref} />
    </GluestackErrorBoundary>
  );
});

SafeCard.displayName = 'SafeCard';

// Safe Button component with error boundary and accessibility checks
export const SafeButton = React.forwardRef<any, ButtonProps>((props, ref) => {
  const { logAccessibilityWarning } = useGluestackErrorLogging('Button');
  useGluestackPerformanceMonitor('Button');

  React.useEffect(() => {
    // Check for accessibility issues
    if (!props.accessibilityLabel && !props.children) {
      logAccessibilityWarning('Button missing accessible label or text content', {
        hasLabel: !!props.accessibilityLabel,
        hasChildren: !!props.children,
      });
    }

    // Check for missing onPress handler
    if (!props.onPress && !props.isDisabled) {
      logAccessibilityWarning('Button missing onPress handler', {
        isDisabled: props.isDisabled,
      });
    }
  }, [props.accessibilityLabel, props.children, props.onPress, props.isDisabled]);

  return (
    <GluestackErrorBoundary componentName="Button">
      <GluestackButton {...props} ref={ref} />
    </GluestackErrorBoundary>
  );
});

SafeButton.displayName = 'SafeButton';

// Safe Input component with validation logging
export const SafeInput = React.forwardRef<any, InputProps>((props, ref) => {
  const { logAccessibilityWarning, logStyleWarning } = useGluestackErrorLogging('Input');
  useGluestackPerformanceMonitor('Input');

  React.useEffect(() => {
    // Check for accessibility issues
    if (!props.accessibilityLabel) {
      logAccessibilityWarning('Input missing accessibility label', {
        hasPlaceholder: !!props.placeholder,
      });
    }

    // Check for missing validation
    if (props.isRequired && !props.isInvalid && !props.isDisabled) {
      logStyleWarning('Required input without validation state', {
        isRequired: props.isRequired,
        isInvalid: props.isInvalid,
      });
    }
  }, [props.accessibilityLabel, props.isRequired, props.isInvalid, props.isDisabled]);

  return (
    <GluestackErrorBoundary componentName="Input">
      <GluestackInput {...props} ref={ref} />
    </GluestackErrorBoundary>
  );
});

SafeInput.displayName = 'SafeInput';

// Safe Modal component with focus management logging
export const SafeModal = React.forwardRef<any, ModalProps>((props, ref) => {
  const { logAccessibilityWarning, logger } = useGluestackErrorLogging('Modal');
  useGluestackPerformanceMonitor('Modal');

  React.useEffect(() => {
    if (props.isOpen) {
      logger.logDebug('Modal opened', {
        hasBackdrop: props.backdrop !== undefined,
        isKeyboardDismissable: props.isKeyboardDismissable,
      });

      // Check for accessibility
      if (!props.accessibilityLabel) {
        logAccessibilityWarning('Modal missing accessibility label');
      }
    }
  }, [props.isOpen]);

  return (
    <GluestackErrorBoundary componentName="Modal">
      <GluestackModal {...props} ref={ref} />
    </GluestackErrorBoundary>
  );
});

SafeModal.displayName = 'SafeModal';

// Safe Alert component with proper error state handling
export const SafeAlert = React.forwardRef<any, AlertProps>((props, ref) => {
  const { logAccessibilityWarning, logger } = useGluestackErrorLogging('Alert');
  useGluestackPerformanceMonitor('Alert');

  React.useEffect(() => {
    // Log alert actions for monitoring
    if (props.action) {
      logger.logInfo('Alert displayed', {
        action: props.action,
        variant: props.variant,
      });
    }

    // Check for accessibility
    if (!props.accessibilityLabel && props.action === 'error') {
      logAccessibilityWarning('Error alert missing accessibility label', {
        action: props.action,
      });
    }
  }, [props.action, props.accessibilityLabel]);

  return (
    <GluestackErrorBoundary componentName="Alert">
      <GluestackAlert {...props} ref={ref} />
    </GluestackErrorBoundary>
  );
});

SafeAlert.displayName = 'SafeAlert';

// Safe FormControl component with validation state logging
export const SafeFormControl = React.forwardRef<any, FormControlProps>((props, ref) => {
  const { logAccessibilityWarning, logger } = useGluestackErrorLogging('FormControl');
  useGluestackPerformanceMonitor('FormControl');

  React.useEffect(() => {
    // Log validation state changes
    if (props.isInvalid) {
      logger.logDebug('FormControl validation failed', {
        isRequired: props.isRequired,
        isDisabled: props.isDisabled,
        isReadOnly: props.isReadOnly,
      });
    }

    // Check for accessibility
    if (props.isRequired && !props.accessibilityLabel) {
      logAccessibilityWarning('Required FormControl missing accessibility label');
    }
  }, [props.isInvalid, props.isRequired, props.accessibilityLabel]);

  return (
    <GluestackErrorBoundary componentName="FormControl">
      <GluestackFormControl {...props} ref={ref} />
    </GluestackErrorBoundary>
  );
});

SafeFormControl.displayName = 'SafeFormControl';

// Export all safe components
export default {
  Card: SafeCard,
  Button: SafeButton,
  Input: SafeInput,
  Modal: SafeModal,
  Alert: SafeAlert,
  FormControl: SafeFormControl,
};

// Hook to use safe Gluestack components
export function useSafeGluestackComponents() {
  return {
    Card: SafeCard,
    Button: SafeButton,
    Input: SafeInput,
    Modal: SafeModal,
    Alert: SafeAlert,
    FormControl: SafeFormControl,
  };
}