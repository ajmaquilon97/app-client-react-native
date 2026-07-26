import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

const queryClient = new QueryClient();

function SplashLoading() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <ActivityIndicator color={Colors.accentTeal} size="large" />
    </View>
  );
}

function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SplashLoading />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="verificar-telefono" options={{ presentation: 'card' }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" options={{ presentation: 'card' }} />
        <Stack.Screen name="registro" options={{ presentation: 'card' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <RootNavigator />
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
