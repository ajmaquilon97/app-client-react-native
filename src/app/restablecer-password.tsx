import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ArrowLeftIcon } from '@/components/icons';
import { resetPassword } from '@/services/auth.service';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';

export default function RestablecerPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const tokenValido = typeof token === 'string' && token.length > 0;
  const emailValido = typeof email === 'string' && email.length > 0;
  const enlaceValido = tokenValido && emailValido;

  const handleSubmit = async () => {
    if (typeof token !== 'string' || !token || typeof email !== 'string' || !email) return;

    let hasError = false;

    if (newPassword.length < 6) {
      setNewPasswordError('La contraseña debe tener al menos 6 caracteres.');
      hasError = true;
    } else {
      setNewPasswordError('');
    }

    if (confirmPassword !== newPassword) {
      setConfirmPasswordError('Las contraseñas no coinciden.');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }

    if (hasError) return;

    setGeneralError('');
    setLoading(true);
    try {
      await resetPassword(email, token, newPassword);
      router.replace('/login?reset=success');
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'El enlace no es válido o expiró.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backButton}
            onPress={() => router.canGoBack() && router.back()}>
            <ArrowLeftIcon size={20} color={Colors.primaryDark} strokeWidth={2.5} />
          </TouchableOpacity>

          {!enlaceValido ? (
            <>
              <Text style={styles.title}>Enlace inválido</Text>
              <Text style={styles.subtitle}>
                Este enlace de recuperación no es válido o está incompleto. Solicita uno nuevo.
              </Text>

              <AuthButton
                label="SOLICITAR NUEVO ENLACE"
                onPress={() => router.replace('/olvide-password')}
              />
            </>
          ) : (
            <>
              <Text style={styles.title}>Nueva contraseña</Text>
              <Text style={styles.subtitle}>Crea una nueva contraseña para tu cuenta.</Text>

              {!!generalError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{generalError}</Text>
                  <TouchableOpacity onPress={() => router.replace('/olvide-password')}>
                    <Text style={styles.errorBannerLink}>Solicitar un enlace nuevo</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.form}>
                <AuthTextField
                  label="Nueva contraseña"
                  placeholder="••••••••"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  error={newPasswordError}
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="next"
                />
                <AuthTextField
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={confirmPasswordError}
                  isPassword
                  autoCapitalize="none"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <AuthButton
                  label="GUARDAR CONTRASEÑA"
                  onPress={handleSubmit}
                  loading={loading}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xxs,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.gray500,
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  errorBannerLink: {
    color: Colors.error,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textDecorationLine: 'underline',
    marginTop: Spacing.xxs,
  },
  form: {
    marginBottom: Spacing.xl,
  },
});
