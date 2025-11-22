import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import "@/global.css";
import { initSentry, SentryErrorBoundary, captureException, setUser } from "@/sentry.config";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { useLogger } from "@/hooks/useLogger";
import { GluestackUIProvider, Box, VStack, Center, Text, Button, ButtonText, ButtonIcon, Icon } from "@gluestack-ui/themed";
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
    <Box flex={1} bg="$white" px="$6">
      <Center flex={1}>
        <VStack space="md" bg="$error50" p="$6" borderRadius="$2xl" alignItems="center" maxWidth={400}>
          <Icon as={AlertTriangle} size="xl" color="$error600" />
          <Text size="xl" fontWeight="$bold" color="$textLight900" mt="$4">
            Something went wrong
          </Text>
          <Text size="md" color="$textLight600" textAlign="center" mt="$2" mb="$6">
            {__DEV__ ? error.message : 'An unexpected error occurred. Please try again.'}
          </Text>
          <Button
            action="primary"
            size="md"
            onPress={resetError}
          >
            <ButtonIcon as={RefreshCw} mr="$2" />
            <ButtonText>Try Again</ButtonText>
          </Button>
        </VStack>
        {__DEV__ && (
          <Box mt="$6" px="$4" maxWidth={600}>
            <Text size="xs" color="$textLight500" fontFamily="$mono">
              {error.stack}
            </Text>
          </Box>
        )}
      </Center>
    </Box>
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

export default function RootLayout() {
  return (
    <SentryErrorBoundary fallback={ErrorFallback} showDialog={__DEV__}>
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
