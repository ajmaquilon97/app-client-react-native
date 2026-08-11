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
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';
import GoogleButton from '@/components/auth/GoogleButton';
import { makeStyles, spacing, useTheme } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  aceptaTerminos?: string;
}

export default function RegistroScreen() {
  const styles = useStyles();
  const { colors, statusBarStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { registro } = useAuth();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const nextErrors: FormErrors = {};

    if (!nombre.trim()) nextErrors.nombre = 'Ingresa tus nombres.';
    if (!apellido.trim()) nextErrors.apellido = 'Ingresa tus apellidos.';
    if (!EMAIL_REGEX.test(trimmedEmail)) nextErrors.email = 'Ingresa un correo válido.';
    if (password.length < 6) nextErrors.password = 'Mínimo 6 caracteres.';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    if (!aceptaTerminos) {
      nextErrors.aceptaTerminos =
        'Debes aceptar los Términos y Condiciones y la Política de Privacidad.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setGeneralError('');
    setLoading(true);
    try {
      await registro({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: trimmedEmail,
        password,
      });
      router.replace('/verificar-telefono');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la cuenta.';
      if (message.toLowerCase().includes('correo')) {
        setErrors(prev => ({ ...prev, email: message }));
      } else {
        setGeneralError(message);
      }
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}>
            <ArrowLeftIcon size={20} color={colors.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>

          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>
            Regístrate para reservar canchas, piscinas y salones en minutos.
          </Text>

          {!!generalError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{generalError}</Text>
            </View>
          )}

          <View style={styles.form}>
            <AuthTextField
              label="Nombres"
              placeholder="Ej. María José"
              value={nombre}
              onChangeText={setNombre}
              error={errors.nombre}
              autoCapitalize="words"
              autoComplete="given-name"
              returnKeyType="next"
            />
            <AuthTextField
              label="Apellidos"
              placeholder="Ej. Pérez Aguilar"
              value={apellido}
              onChangeText={setApellido}
              error={errors.apellido}
              autoCapitalize="words"
              autoComplete="family-name"
              returnKeyType="next"
            />
            <AuthTextField
              label="Correo electrónico"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
            <AuthTextField
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              isPassword
              autoCapitalize="none"
              autoComplete="password-new"
              returnKeyType="next"
            />
            <AuthTextField
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              isPassword
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <TouchableOpacity
              style={styles.termsRow}
              activeOpacity={0.7}
              onPress={() => {
                setAceptaTerminos(prev => !prev);
                setErrors(prev => ({ ...prev, aceptaTerminos: undefined }));
              }}>
              <View style={[styles.checkbox, aceptaTerminos && styles.checkboxChecked]}>
                {aceptaTerminos && <CheckIcon size={14} color={colors.onAccent} strokeWidth={3} />}
              </View>
              <Text style={styles.termsText}>
                He leído y acepto los{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => router.push('/terminos-condiciones')}>
                  Términos y Condiciones
                </Text>{' '}
                y la{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/politica-privacidad')}>
                  Política de Privacidad
                </Text>{' '}
                de AGORA.
              </Text>
            </TouchableOpacity>
            {!!errors.aceptaTerminos && (
              <Text style={styles.termsError}>{errors.aceptaTerminos}</Text>
            )}

            <AuthButton label="CREAR CUENTA" onPress={handleSubmit} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o regístrate con</Text>
              <View style={styles.dividerLine} />
            </View>

            <View>
              <GoogleButton label="Registrarme con Google" />
              {!aceptaTerminos && (
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() =>
                    setErrors(prev => ({
                      ...prev,
                      aceptaTerminos:
                        'Debes aceptar los Términos y Condiciones y la Política de Privacidad.',
                    }))
                  }
                />
              )}
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: t.radius.sm,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  termsText: {
    flex: 1,
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
    lineHeight: t.fontSize.sm * 1.4,
  },
  termsLink: {
    color: t.colors.accent,
    fontWeight: t.fontWeight.semiBold,
  },
  termsError: {
    color: t.colors.error,
    fontSize: t.fontSize.sm,
    marginBottom: t.spacing.md,
    marginTop: -t.spacing.xs,
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
}));
