import React, { useState } from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from '@/shared/ui/icons';
import { forgotPassword } from '@/services/auth.service';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OlvidePasswordScreen() {
  const styles = useStyles();
  const { colors, statusBarStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Ingresa un correo válido.');
      return;
    }
    setEmailError('');

    setGeneralError('');
    setLoading(true);
    try {
      await forgotPassword(trimmedEmail);
      setEnviado(true);
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : 'No se pudo procesar la solicitud.',
      );
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

          {enviado ? (
            <>
              <Text style={styles.title}>Revisa tu correo</Text>
              <Text style={styles.subtitle}>
                Si existe una cuenta asociada a {email.trim()}, te enviamos un enlace para
                restablecer tu contraseña. Revisa también tu carpeta de spam.
              </Text>

              <TouchableOpacity onPress={() => setEnviado(false)}>
                <Text style={styles.linkText}>¿No recibiste el correo? Intentar de nuevo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => router.replace('/login')}>
                <Text style={styles.backToLoginText}>Volver a iniciar sesión</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
              <Text style={styles.subtitle}>
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </Text>

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
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />

                <AuthButton label="ENVIAR ENLACE" onPress={handleSubmit} loading={loading} />
              </View>
            </>
          )}
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
  form: {
    marginBottom: t.spacing.xl,
  },
  linkText: {
    fontSize: t.fontSize.base,
    color: t.colors.accent,
    fontWeight: t.fontWeight.bold,
  },
  backToLogin: {
    marginTop: t.spacing.lg,
  },
  backToLoginText: {
    fontSize: t.fontSize.base,
    color: t.colors.textSecondary,
  },
}));
