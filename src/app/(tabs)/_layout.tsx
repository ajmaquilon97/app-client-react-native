import CustomTabBar from '@/shared/ui/navigation/CustomTabBar';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...(props as any)} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calendario" />
      <Tabs.Screen name="favoritos" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}
