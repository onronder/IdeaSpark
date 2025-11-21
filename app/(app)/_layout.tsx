import { Stack, Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Center, Spinner, Box } from '@gluestack-ui/themed';
import { Home, MessageSquare, User, Sparkles } from 'lucide-react-native';
import { GradientBackground, AnimatedOrb } from '@/components/ui';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colorMode } = useTheme();

  const isDark = colorMode === 'dark';

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

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#6B7280',
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upgrade"
        options={{
          title: 'Upgrade',
          tabBarIcon: ({ color, size }) => (
            <Sparkles size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}