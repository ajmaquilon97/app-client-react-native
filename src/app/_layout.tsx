import { AuthProvider, useAuth } from '@/context/AuthContext';
import { KioskAuthProvider, useKioskAuth } from '@/context/KioskAuthContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { LocationProvider } from '@/context/LocationContext';
import { ThemeModeProvider } from '@/context/ThemeModeContext';
import { makeStyles, useTheme } from '@/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

const queryClient = new QueryClient();

const useStyles = makeStyles((t) => ({
  splash: {
    flex: 1,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

function SplashLoading() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { isKioskAuthenticated, isBootstrapping: isKioskBootstrapping } = useKioskAuth();
  const { isDark } = useTheme();

  if (isBootstrapping || isKioskBootstrapping) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SplashLoading />
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="verificar-telefono" options={{ presentation: 'card' }} />
          <Stack.Screen name="reserva/[id]/invitados" options={{ presentation: 'card' }} />
          <Stack.Screen name="reserva/[id]/detalle" options={{ presentation: 'card' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" options={{ presentation: 'card' }} />
          <Stack.Screen name="registro" options={{ presentation: 'card' }} />
          <Stack.Screen name="olvide-password" options={{ presentation: 'card' }} />
          <Stack.Screen name="restablecer-password" options={{ presentation: 'card' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isKioskAuthenticated}>
          <Stack.Screen name="recepcion/login" options={{ presentation: 'card' }} />
        </Stack.Protected>
        <Stack.Protected guard={isKioskAuthenticated}>
          <Stack.Screen
            name="recepcion/scan"
            options={{ gestureEnabled: false, headerBackVisible: false }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <KioskAuthProvider>
            <FavoritesProvider>
              <LocationProvider>
                <RootNavigator />
              </LocationProvider>
            </FavoritesProvider>
          </KioskAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}
