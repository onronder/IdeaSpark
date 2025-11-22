import * as Sentry from '@sentry/react-native';

// Create routing instrumentation for React Navigation
export const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();
