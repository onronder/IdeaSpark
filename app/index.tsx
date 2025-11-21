import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Center, Spinner } from '@gluestack-ui/themed';
import { GradientBackground, AnimatedOrb } from '@/components/ui';

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth();

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

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(app)/" />;
  } else {
    return <Redirect href="/(auth)/" />;
  }
}