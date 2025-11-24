import { Stack, Redirect } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // No loading state needed - handled by root layout
  // Redirect to app if already authenticated
  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
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
