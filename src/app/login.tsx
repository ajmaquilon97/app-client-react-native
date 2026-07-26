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
import { useAuth } from '@/context/AuthContext';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';
import GoogleButton from '@/components/auth/GoogleButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

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

          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>Inicia sesión para seguir reservando espacios.</Text>

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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.gray400,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.base,
    color: Colors.gray500,
  },
  footerLink: {
    fontSize: FontSize.base,
    color: Colors.accentTeal,
    fontWeight: FontWeight.bold,
  },
});
