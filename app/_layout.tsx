import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import "@/global.css";
import * as Sentry from '@sentry/react-native';
import { initSentry, SentryErrorBoundary, captureException, setUser } from "@/sentry.config";
import { SupabaseAuthProvider as AuthProvider, useAuth } from "@/contexts/SupabaseAuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { useLogger } from "@/hooks/useLogger";
import { GluestackUIProvider, Box, Center, VStack, Text } from "@gluestack-ui/themed";
import { View, Text as RNText, TouchableOpacity } from "react-native";
import { gluestackUIConfig } from "@/gluestack-ui.config";
import { notificationService } from "@/services/notificationService";
import { useRouter } from "expo-router";

// Initialize Sentry as early as possible
initSentry();

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
});

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  const logger = useLogger('ErrorBoundary');

  useEffect(() => {
    // Log error details
    logger.error('Application error caught by boundary', error, {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }, [error]);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: '#fee2e2',
            padding: 24,
            borderRadius: 16,
            alignItems: 'center',
            maxWidth: 400,
          }}
        >
          <RNText style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16 }}>
            Something went wrong
          </RNText>
          <RNText style={{ fontSize: 16, color: '#4b5563', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
            {__DEV__ ? error.message : 'An unexpected error occurred. Please try again.'}
          </RNText>
          <TouchableOpacity
            onPress={resetError}
            style={{
              backgroundColor: '#6366F1',
              borderRadius: 999,
              paddingHorizontal: 24,
              paddingVertical: 10,
            }}
          >
            <RNText style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
              Try Again
            </RNText>
          </TouchableOpacity>
        </View>
        {__DEV__ && error.stack && (
          <View style={{ marginTop: 24, paddingHorizontal: 16, maxWidth: 600 }}>
            <RNText style={{ fontSize: 12, color: '#6b7280', fontFamily: 'System' }}>
              {error.stack}
            </RNText>
          </View>
        )}
      </View>
    </View>
  );
}

// Splash screen component
function SplashScreen() {
  const { GradientBackground, AnimatedOrb } = require('@/components/ui');
  const { useTheme } = require('@/contexts/ThemeContext');
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <Box flex={1}>
      <GradientBackground variant="primary">
        <Center flex={1}>
          <VStack space="lg" alignItems="center">
            <AnimatedOrb size={100} icon="sparkles" variant="primary" />
            <Text size="2xl" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
              IdeaSpark
            </Text>
            <Text color={isDark ? "$textDark400" : "$textLight500"} mt="$2">
              Loading...
            </Text>
          </VStack>
        </Center>
      </GradientBackground>
    </Box>
  );
}

// Component that wraps the app with theme-aware Gluestack provider
function ThemedGluestackProvider({ children }: { children: React.ReactNode }) {
  const { colorMode } = useTheme();

  return (
    <GluestackUIProvider config={gluestackUIConfig} colorMode={colorMode}>
      {children}
    </GluestackUIProvider>
  );
}

// Main app component that uses auth
function AppNavigator() {
  const { isLoading, user } = useAuth();
  const logger = useLogger('AppNavigator');
  const router = useRouter();

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (user) {
      // Initialize notification service
      notificationService.initialize({
        onNotificationResponse: (response) => {
          // Handle notification tap - navigate to appropriate screen
          const data = response.notification.request.content.data;

          if (data?.ideaId) {
            // Navigate to idea detail screen
            router.push(`/(app)/ideas/${data.ideaId}`);
          } else if (data?.type === 'subscription_update') {
            // Navigate to subscription screen
            router.push('/(app)/settings/subscription');
          }

          logger.info('Notification tapped', { data });
        },
      }).catch((error) => {
        logger.error('Failed to initialize notifications', error);
      });
    }

    return () => {
      // Cleanup on unmount
      if (user) {
        notificationService.cleanup();
      }
    };
  }, [user]);

  useEffect(() => {
    // Set user context for Sentry when user changes
    if (user) {
      setUser({
        id: user.id,
        username: user.email.split('@')[0], // Use email prefix as username
      });
      logger.info('User authenticated', { userId: user.id, plan: user.subscriptionPlan });
    } else {
      setUser(null);
      logger.info('User signed out');
    }
  }, [user]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayout() {
  return (
    <SentryErrorBoundary fallback={ErrorFallback} showDialog={false}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <ThemedGluestackProvider>
                <AppNavigator />
              </ThemedGluestackProvider>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </SentryErrorBoundary>
  );
}

// Wrap the root component with Sentry for proper error tracking
export default Sentry.wrap(RootLayout);
