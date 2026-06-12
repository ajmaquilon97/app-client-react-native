import CustomTabBar from '@/components/navigation/CustomTabBar';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ReservationsProvider } from '@/context/ReservationsContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Tabs } from 'expo-router';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
    <FavoritesProvider>
      <ReservationsProvider>
        <Tabs
          tabBar={props => <CustomTabBar {...(props as any)} />}
          screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="calendario" />
          <Tabs.Screen name="nueva" />
          <Tabs.Screen name="favoritos" />
          <Tabs.Screen name="ajustes" />
        </Tabs>
      </ReservationsProvider>
    </FavoritesProvider>
    </QueryClientProvider>
  );
}
