import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Center, Spinner } from '@gluestack-ui/themed';
import { GradientBackground, AnimatedOrb } from '@/components/ui';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <Box flex={1}>
        <GradientBackground>
          <Center flex={1}>
            <AnimatedOrb size={80} icon="sparkles" />
          </Center>
        </GradientBackground>
      </Box>
    );
  }

  // Redirect to app if already authenticated
  if (isAuthenticated) {
    return <Redirect href="/(app)/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}