import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKioskAuth } from '@/features/recepcion';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';
import { makeStyles, spacing } from '@/shared/theme';

export default function RecepcionLoginScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginKiosk } = useKioskAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (pinValue: string) => {
      if (pinValue.length !== 6 || loading) return;
      setError('');
      setLoading(true);
      try {
        await loginKiosk(pinValue);
        router.replace('/recepcion/scan');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'PIN inválido o expirado. Solicítalo nuevamente al anfitrión.',
        );
        setPin('');
      } finally {
        setLoading(false);
      }
    },
    [loginKiosk, router, loading],
  );

  const handleChangePin = (value: string) => {
    const soloDigitos = value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(soloDigitos);
    if (soloDigitos.length === 6) {
      handleSubmit(soloDigitos);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Ingreso Recepción</Text>
          <Text style={styles.subtitle}>
            Ingresa el PIN de 6 dígitos que te entregó el anfitrión para abrir la sesión de kiosco.
          </Text>

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <AuthTextField
            label="PIN de recepción"
            placeholder="000000"
            value={pin}
            onChangeText={handleChangePin}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textAlign="center"
          />

          <AuthButton label="INGRESAR" onPress={() => handleSubmit(pin)} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  scrollContent: {
    paddingHorizontal: t.spacing.lg,
    flexGrow: 1,
  },
  title: {
    fontSize: t.fontSize.xxxl,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xxs,
  },
  subtitle: {
    fontSize: t.fontSize.base,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.xl,
  },
  errorBanner: {
    backgroundColor: t.colors.errorSoft,
    borderRadius: 12,
    padding: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  errorBannerText: {
    color: t.colors.error,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
  },
}));
