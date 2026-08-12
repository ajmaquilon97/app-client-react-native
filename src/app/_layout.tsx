import { AuthProvider, useAuth } from '@/context/AuthContext';
import { KioskAuthProvider, useKioskAuth } from '@/context/KioskAuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { ThemeModeProvider } from '@/context/ThemeModeContext';
import { queryClient } from '@/shared/api/queryClient';
import { initQueryBridge } from '@/shared/api/rn-bridge';
import { getTheme, makeStyles, useTheme } from '@/shared/theme';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

initQueryBridge();

/**
 * Se renderiza cuando falla el propio layout raíz, es decir POR ENCIMA de
 * `ThemeModeProvider`: aquí `useTheme()` lanzaría. Por eso lee los tokens con
 * `getTheme`, que no es un hook y no depende del contexto.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = getTheme('light');

  return (
    <View
      style={{
        flex: 1,
        gap: t.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        padding: t.spacing.xl,
        backgroundColor: t.colors.background,
      }}>
      <Text
        style={{
          ...t.typography.subtitle,
          fontWeight: t.fontWeight.bold,
          color: t.colors.textPrimary,
        }}>
        Algo salió mal
      </Text>
      <Text style={{ ...t.typography.caption, color: t.colors.textSecondary, textAlign: 'center' }}>
        {error.message}
      </Text>
      <TouchableOpacity
        onPress={retry}
        activeOpacity={0.8}
        style={{
          marginTop: t.spacing.sm,
          backgroundColor: t.colors.primary,
          paddingHorizontal: t.spacing.xl,
          paddingVertical: t.spacing.sm,
          borderRadius: t.radius.md,
        }}>
        <Text
          style={{
            ...t.typography.captionStrong,
            fontWeight: t.fontWeight.bold,
            color: t.colors.onPrimary,
          }}>
          Reintentar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

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
            <LocationProvider>
              <RootNavigator />
            </LocationProvider>
          </KioskAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}
