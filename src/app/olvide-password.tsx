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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ArrowLeftIcon } from '@/components/icons';
import { forgotPassword } from '@/services/auth.service';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OlvidePasswordScreen() {
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
  form: {
    marginBottom: Spacing.xl,
  },
  linkText: {
    fontSize: FontSize.base,
    color: Colors.accentTeal,
    fontWeight: FontWeight.bold,
  },
  backToLogin: {
    marginTop: Spacing.lg,
  },
  backToLoginText: {
    fontSize: FontSize.base,
    color: Colors.gray500,
  },
});
