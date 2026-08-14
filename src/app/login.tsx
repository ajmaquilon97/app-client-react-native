import React, { useState } from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from '@/shared/ui/icons';
import { useAuth , AuthTextField , AuthButton , GoogleButton } from '@/features/auth';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const styles = useStyles();
  const { colors, statusBarStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { reset } = useLocalSearchParams<{ reset?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    let hasError = false;

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Ingresa un correo válido.');
      hasError = true;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Ingresa tu contraseña.');
      hasError = true;
    } else {
      setPasswordError('');
    }

    if (hasError) return;

    setGeneralError('');
    setLoading(true);
    try {
      await login(trimmedEmail, password);
      router.replace('/');
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backButton}
            onPress={() => router.canGoBack() && router.back()}>
            <ArrowLeftIcon size={20} color={colors.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>Inicia sesión para seguir reservando espacios.</Text>

          {reset === 'success' && (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>Contraseña actualizada correctamente.</Text>
            </View>
          )}

          {!!generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <AuthTextField
              label="Correo electrónico"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
            <AuthTextField
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              error={passwordError}
              isPassword
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => router.push('/olvide-password')}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <AuthButton label="INICIAR SESIÓN" onPress={handleSubmit} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton label="Continuar con Google" />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/registro')}>
              <Text style={styles.footerLink}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.recepcionButton}
            onPress={() => router.push('/recepcion/login')}>
            <Text style={styles.recepcionButtonText}>Ingreso Recepción</Text>
          </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
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
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  errorBannerText: {
    color: t.colors.error,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
  },
  successBanner: {
    backgroundColor: t.colors.accentSoft,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  successBannerText: {
    color: t.colors.success,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
  },
  form: {
    marginBottom: t.spacing.xl,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: t.spacing.md,
  },
  forgotPasswordText: {
    fontSize: t.fontSize.sm,
    color: t.colors.accent,
    fontWeight: t.fontWeight.semiBold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: t.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: t.colors.border,
  },
  dividerText: {
    marginHorizontal: t.spacing.sm,
    fontSize: t.fontSize.sm,
    color: t.colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: t.spacing.lg,
  },
  footerText: {
    fontSize: t.fontSize.base,
    color: t.colors.textSecondary,
  },
  footerLink: {
    fontSize: t.fontSize.base,
    color: t.colors.accent,
    fontWeight: t.fontWeight.bold,
  },
  recepcionButton: {
    alignItems: 'center',
    marginTop: t.spacing.lg,
    paddingVertical: t.spacing.xs,
  },
  recepcionButtonText: {
    fontSize: t.fontSize.sm,
    color: t.colors.textMuted,
    fontWeight: t.fontWeight.semiBold,
    textDecorationLine: 'underline',
  },
}));
