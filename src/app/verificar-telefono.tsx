import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from '@/components/icons';
import AuthButton from '@/components/auth/AuthButton';
import { useAuth } from '@/context/AuthContext';
import { enviarSmsOtp, verificarSmsOtp } from '@/services/auth.service';
import { makeStyles, spacing, useTheme } from '@/theme';

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;
const PHONE_REGEX = /^9\d{8}$/;

type Paso = 'telefono' | 'otp';

export default function VerificarTelefonoScreen() {
  const styles = useStyles();
  const { colors, statusBarStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fetchAuthorized } = useAuth();

  const [paso, setPaso] = useState<Paso>('telefono');
  const [telefono, setTelefono] = useState('');
  const [telefonoError, setTelefonoError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [digitos, setDigitos] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (paso !== 'otp' || resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [paso, resendSeconds]);

  const handleEnviarCodigo = async () => {
    if (!PHONE_REGEX.test(telefono)) {
      setTelefonoError('Ingresa un número celular ecuatoriano válido (9 dígitos, empieza con 9).');
      return;
    }
    setTelefonoError('');
    setEnviando(true);
    try {
      await fetchAuthorized(accessToken => enviarSmsOtp(`+593${telefono}`, accessToken));
      setDigitos(Array(OTP_LENGTH).fill(''));
      setOtpError('');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setPaso('otp');
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar el código.';
      setTelefonoError(message);
    } finally {
      setEnviando(false);
    }
  };

  const handleReenviar = async () => {
    if (resendSeconds > 0 || enviando) return;
    setEnviando(true);
    try {
      await fetchAuthorized(accessToken => enviarSmsOtp(`+593${telefono}`, accessToken));
      setDigitos(Array(OTP_LENGTH).fill(''));
      setOtpError('');
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reenviar el código.';
      setOtpError(message);
    } finally {
      setEnviando(false);
    }
  };

  const verificarCodigo = async (codigo: string) => {
    setVerificando(true);
    try {
      await fetchAuthorized(accessToken => verificarSmsOtp(codigo, accessToken));
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código incorrecto. Intenta de nuevo.';
      setOtpError(message);
      setDigitos(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerificando(false);
    }
  };

  const handleDigitChange = (text: string, index: number) => {
    const value = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digitos];
    next[index] = value;
    setDigitos(next);
    setOtpError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const codigo = next.join('');
    if (codigo.length === OTP_LENGTH) {
      verificarCodigo(codigo);
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !digitos[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
            onPress={() => (paso === 'otp' ? setPaso('telefono') : router.back())}>
            <ArrowLeftIcon size={20} color={colors.primaryText} strokeWidth={2.5} />
          </TouchableOpacity>

          {paso === 'telefono' ? (
            <>
              <Text style={styles.title}>Verifica tu teléfono</Text>
              <Text style={styles.subtitle}>
                Te enviaremos un código de 6 dígitos por SMS para confirmar tu número.
              </Text>

              <Text style={styles.label}>Número de teléfono</Text>
              <View style={[styles.phoneRow, !!telefonoError && styles.inputWrapperError]}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+593</Text>
                </View>
                <TextInput
                  value={telefono}
                  onChangeText={text => setTelefono(text.replace(/[^0-9]/g, '').slice(0, 9))}
                  placeholder="9XXXXXXXX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={9}
                  selectionColor={colors.accent}
                  style={styles.phoneInput}
                  returnKeyType="done"
                  onSubmitEditing={handleEnviarCodigo}
                />
              </View>
              {!!telefonoError && <Text style={styles.errorText}>{telefonoError}</Text>}

              <View style={styles.actions}>
                <AuthButton
                  label="ENVIAR CÓDIGO"
                  onPress={handleEnviarCodigo}
                  loading={enviando}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Ingresa el código</Text>
              <Text style={styles.subtitle}>
                Enviamos un código de 6 dígitos al +593 {telefono}.
              </Text>

              <View style={styles.otpRow}>
                {digitos.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={text => handleDigitChange(text, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectionColor={colors.accent}
                    style={[styles.otpBox, !!otpError && styles.otpBoxError]}
                    editable={!verificando}
                  />
                ))}
              </View>
              {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}

              <View style={styles.resendRow}>
                {resendSeconds > 0 ? (
                  <Text style={styles.resendText}>
                    Reenviar código en 00:{resendSeconds.toString().padStart(2, '0')}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleReenviar}>
                    <Text style={styles.resendLink}>Reenviar código</Text>
                  </TouchableOpacity>
                )}
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
  label: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: t.spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: t.colors.error,
  },
  prefixBox: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.surfaceMuted,
    borderRightWidth: 1,
    borderRightColor: t.colors.border,
  },
  prefixText: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    fontSize: t.fontSize.base,
    color: t.colors.textPrimary,
  },
  errorText: {
    fontSize: t.fontSize.sm,
    color: t.colors.error,
    marginTop: t.spacing.xxs,
  },
  actions: {
    marginTop: t.spacing.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: t.spacing.sm,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    textAlign: 'center',
    fontSize: t.fontSize.xl,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textPrimary,
  },
  otpBoxError: {
    borderColor: t.colors.error,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: t.spacing.sm,
  },
  resendText: {
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
  },
  resendLink: {
    fontSize: t.fontSize.sm,
    color: t.colors.accent,
    fontWeight: t.fontWeight.bold,
  },
}));
