import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { GoogleIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { GOOGLE_WEB_CLIENT_ID } from '@/config/googleAuthConfig';

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

interface GoogleButtonProps {
  label: string;
}

export default function GoogleButton({ label }: GoogleButtonProps) {
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) {
        return;
      }
      const { idToken } = response.data;
      if (!idToken) {
        throw new Error('Google no devolvió un token válido.');
      }
      await loginWithGoogle(idToken);
      router.replace('/');
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
        return;
      }
      Alert.alert(
        'No se pudo iniciar sesión',
        err instanceof Error ? err.message : 'Ocurrió un error con el inicio de sesión de Google.',
      );
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
        <ActivityIndicator color={Colors.textPrimary} />
      ) : (
        <>
          <GoogleIcon size={20} />
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  label: {
    color: Colors.textPrimary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
  },
});
