import { Stack } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { COLORS } from '../theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup  = segments[0] === '(auth)';
    const isOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated) {
      const { hasCompletedOnboarding } = useAuthStore.getState();
      if (!hasCompletedOnboarding && !isOnboarding) {
        router.replace('/onboarding');
      } else if (hasCompletedOnboarding && (inAuthGroup || isOnboarding)) {
        router.replace('/(app)/(tabs)/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bgPage, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />
        <ActivityIndicator size="large" color={COLORS.lime} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bgPage } }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(app)"  options={{ animation: 'fade' }} />
      </Stack>
    </QueryClientProvider>
  );
}
