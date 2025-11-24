import { Redirect } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";

export default function RootIndex() {
  const { isAuthenticated } = useAuth();

  // No loading state needed here - handled by root layout
  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  } else {
    return <Redirect href="/(auth)" />;
  }
}
