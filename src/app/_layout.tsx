import { AuthProvider } from '@/context/AuthContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ReservationsProvider } from '@/context/ReservationsContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <ReservationsProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" options={{ presentation: 'card' }} />
              <Stack.Screen name="registro" options={{ presentation: 'card' }} />
            </Stack>
          </ReservationsProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
