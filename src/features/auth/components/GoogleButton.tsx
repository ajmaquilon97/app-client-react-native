import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { makeStyles, useTheme } from '@/shared/theme';
import { GoogleIcon } from '@/shared/ui/icons';
import { useAuth } from '@/features/auth';
import { GOOGLE_WEB_CLIENT_ID } from '@/shared/config/googleAuthConfig';
import { ApiError } from '@/shared/api/errors';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

interface GoogleButtonProps {
  label: string;
}

export default function GoogleButton({ label }: GoogleButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (__DEV__) console.log('[GoogleButton] Verificando Play Services...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      if (__DEV__) console.log('[GoogleButton] Play Services OK, invocando GoogleSignin.signIn()...');
      const response = await GoogleSignin.signIn();
      if (__DEV__) console.log('[GoogleButton] Respuesta de GoogleSignin.signIn():', response);
      if (!isSuccessResponse(response)) {
        if (__DEV__) console.log('[GoogleButton] signIn() no fue exitoso (cancelado u otro tipo):', response);
        return;
      }
      const { idToken } = response.data;
      if (!idToken) {
        if (__DEV__) console.log('[GoogleButton] La respuesta no incluyó idToken:', response.data);
        throw new Error('Google no devolvió un token válido.');
      }
      if (__DEV__) console.log('[GoogleButton] idToken recibido, invocando loginWithGoogle()...');
      await loginWithGoogle(idToken);
      if (__DEV__) console.log('[GoogleButton] loginWithGoogle() exitoso, redirigiendo.');
      router.replace('/');
    } catch (err) {
      if (__DEV__) console.log('[GoogleButton] Error en el flujo de Google Sign-In:', err);
      if (isErrorWithCode(err)) {
        if (__DEV__) console.log('[GoogleButton] Código de error:', err.code);
      }
      if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
        return;
      }
      // Alert (no solo console.log) porque en un APK de testing no hay consola a la mano —
      // esto le da al tester algo que pueda leer/capturar en pantalla y reportar.
      const detalle = [
        isErrorWithCode(err) ? `Código: ${err.code}` : null,
        err instanceof ApiError ? `HTTP: ${err.status}` : null,
        err instanceof Error ? err.message : `Error desconocido: ${String(err)}`,
      ]
        .filter(Boolean)
        .join('\n');
      Alert.alert('No se pudo iniciar sesión con Google', detalle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={loading}
      style={styles.button}>
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <>
          <GoogleIcon size={20} />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingVertical: t.spacing.sm + 2,
    ...t.shadows.sm,
  },
  label: {
    ...t.typography.bodySmStrong,
    color: t.colors.textPrimary,
  },
}));
