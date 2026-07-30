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
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import AuthTextField from '@/components/auth/AuthTextField';
import AuthButton from '@/components/auth/AuthButton';
import GoogleButton from '@/components/auth/GoogleButton';

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}>
            <ArrowLeftIcon size={20} color={Colors.primaryDark} strokeWidth={2.5} />
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
                {aceptaTerminos && <CheckIcon size={14} color={Colors.white} strokeWidth={3} />}
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.accentTeal,
    borderColor: Colors.accentTeal,
  },
  termsText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: FontSize.sm * 1.4,
  },
  termsLink: {
    color: Colors.accentTeal,
    fontWeight: FontWeight.semiBold,
  },
  termsError: {
    color: Colors.error,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
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
