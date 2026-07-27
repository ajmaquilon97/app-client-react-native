import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ArrowLeftIcon } from '@/components/icons';
import AuthButton from '@/components/auth/AuthButton';
import { useAuth } from '@/context/AuthContext';
import { enviarSmsOtp, verificarSmsOtp } from '@/services/auth.service';

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;
const PHONE_REGEX = /^9\d{8}$/;

type Paso = 'telefono' | 'otp';

export default function VerificarTelefonoScreen() {
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
            onPress={() => (paso === 'otp' ? setPaso('telefono') : router.back())}>
            <ArrowLeftIcon size={20} color={Colors.primaryDark} strokeWidth={2.5} />
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
                  placeholderTextColor={Colors.gray400}
                  keyboardType="number-pad"
                  maxLength={9}
                  selectionColor={Colors.accentTeal}
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
                    selectionColor={Colors.accentTeal}
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
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  prefixBox: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.gray100,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  prefixText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.gray700,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.xxs,
  },
  actions: {
    marginTop: Spacing.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    textAlign: 'center',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  otpBoxError: {
    borderColor: Colors.error,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resendText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  resendLink: {
    fontSize: FontSize.sm,
    color: Colors.accentTeal,
    fontWeight: FontWeight.bold,
  },
});
