import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import "@/global.css";
import * as Sentry from '@sentry/react-native';
import { initSentry, SentryErrorBoundary, captureException, setUser } from "@/sentry.config";
import { SupabaseAuthProvider as AuthProvider, useAuth } from "@/contexts/SupabaseAuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react-native";
import { useLogger } from "@/hooks/useLogger";
import { GluestackUIProvider, Box, Center, VStack, Text, Icon, Spinner, HStack } from "@gluestack-ui/themed";
import { View, Text as RNText, TouchableOpacity } from "react-native";
import { gluestackUIConfig } from "@/gluestack-ui.config";
import { useNotifications } from "@/hooks/useNotifications";
import { useAnalytics } from "@/hooks/useAnalytics";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, space, radii, shadows } from '@/theme/tokens';

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
  const { useTheme } = require('@/contexts/ThemeContext');
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <Box flex={1} bg={isDark ? "$backgroundDark950" : "$backgroundLight50"}>
      <Center flex={1}>
        <VStack space="lg" alignItems="center">
          <Icon as={Sparkles} size="xl" color="$primary500" />
          <Text size="2xl" fontWeight="$bold" color={isDark ? "$textDark50" : "$textLight900"}>
            IdeaSpark
          </Text>
          <Spinner size="large" color="$primary500" mt="$4" />
        </VStack>
      </Center>
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
  // Global notifications initialization and handlers
  // (handled via useNotifications hook using Supabase auth state)
  useNotifications();
  // Initialize analytics and keep user identity in sync
  const { setUserConsent } = useAnalytics();

  const [showAnalyticsPrompt, setShowAnalyticsPrompt] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [updatingConsent, setUpdatingConsent] = useState(false);

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

  // First-run analytics consent prompt
  useEffect(() => {
    const checkConsent = async () => {
      try {
        // Only prompt once a user is signed in and no explicit choice was stored
        if (!user) {
          setShowAnalyticsPrompt(false);
          setCheckingConsent(false);
          return;
        }

        const stored = await AsyncStorage.getItem('analyticsConsent');
        if (stored === null) {
          setShowAnalyticsPrompt(true);
        } else {
          setShowAnalyticsPrompt(false);
        }
      } catch (err) {
        console.warn('Failed to check analytics consent', err);
      } finally {
        setCheckingConsent(false);
      }
    };

    checkConsent();
  }, [user?.id]);

  const handleConsentChoice = async (consent: boolean) => {
    try {
      setUpdatingConsent(true);
      await setUserConsent(consent);
      setShowAnalyticsPrompt(false);
    } catch (err) {
      console.warn('Failed to update analytics consent', err);
    } finally {
      setUpdatingConsent(false);
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Box flex={1}>
      <Stack screenOptions={{ headerShown: false }} />

      {user && showAnalyticsPrompt && !checkingConsent && (
        <Box
          position="absolute"
          bottom={space.lg}
          left={space.lg}
          right={space.lg}
          bg={colors.surface}
          borderRadius={radii.lg}
          p={space.lg}
          style={shadows.card}
        >
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color={colors.textPrimary}>
              Help improve IdeaSpark
            </Text>
            <Text fontSize="$sm" color={colors.textSecondary}>
              Share anonymous usage analytics so we can understand which features are most helpful.
              You can change this anytime in Profile → Usage analytics.
            </Text>
            <HStack justifyContent="flex-end" space="sm" mt={space.sm}>
              <TouchableOpacity
                onPress={() => handleConsentChoice(false)}
                disabled={updatingConsent}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: radii.sm,
                  borderWidth: 1,
                  borderColor: colors.borderMuted,
                }}
              >
                <RNText
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    fontWeight: '500',
                  }}
                >
                  Not now
                </RNText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleConsentChoice(true)}
                disabled={updatingConsent}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: radii.sm,
                  backgroundColor: colors.brand[500],
                }}
              >
                <RNText
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {updatingConsent ? 'Saving…' : 'Enable analytics'}
                </RNText>
              </TouchableOpacity>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  );
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
