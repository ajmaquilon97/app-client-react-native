import { Tabs } from 'expo-router';
import { FavoritesProvider } from '@/context/FavoritesContext';
import CustomTabBar from '@/components/navigation/CustomTabBar';

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <Tabs
        tabBar={props => <CustomTabBar {...(props as any)} />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="calendario" />
        <Tabs.Screen name="nueva" />
        <Tabs.Screen name="favoritos" />
        <Tabs.Screen name="ajustes" />
      </Tabs>
    </FavoritesProvider>
  );
}
