import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CheckIcon, CloseCircleIcon } from '@/components/icons';

export type PaymentResultStatus = 'success' | 'error';

interface PaymentResultProps {
  status: PaymentResultStatus;
  amount: string;
  fecha: string;
  transactionId?: string;
  errorMessage?: string;
  /** Llamado al confirmar un pago exitoso (manual o auto-redirección). */
  onContinue: () => void;
  /** Llamado al reintentar tras un fallo (vuelve al formulario). */
  onRetry: () => void;
  /** Cancela y cierra todo el flujo de pago tras un fallo. */
  onCancel: () => void;
}

const AUTO_REDIRECT_MS = 2800;

const PaymentResult: React.FC<PaymentResultProps> = ({
  status,
  amount,
  fecha,
  transactionId,
  errorMessage,
  onContinue,
  onRetry,
  onCancel,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  // Auto-redirección a reservas tras un pago exitoso
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(onContinue, AUTO_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [status, onContinue]);

  if (status === 'success') {
    return (
      <Animated.View style={[styles.overlay, styles.overlaySuccess, { opacity }]}>
        <View style={styles.iconWrapSuccess}>
          <CheckIcon size={56} color={Colors.accentTeal} strokeWidth={3} />
        </View>
        <Text style={styles.titleSuccess}>¡Pago Autorizado!</Text>
        <Text style={styles.subtitleSuccess}>
          Tu transacción ha sido procesada de manera segura. Hemos enviado el comprobante a tu
          email.
        </Text>

        <View style={styles.detailsCard}>
          {transactionId && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Código de Reserva:</Text>
              <Text style={styles.detailValue}>{transactionId}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Monto Debitado:</Text>
            <Text style={styles.detailValueAccent}>${amount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fecha del Evento:</Text>
            <Text style={styles.detailValue}>{fecha}</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={onContinue} style={styles.btnContinue}>
          <Text style={styles.btnContinueTxt}>Ver mis reservas</Text>
        </TouchableOpacity>
        <Text style={styles.redirectHint}>Redirigiendo a tus reservas…</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.overlay, styles.overlayError, { opacity }]}>
      <View style={styles.iconWrapError}>
        <CloseCircleIcon size={64} color={Colors.error} />
      </View>
      <Text style={styles.titleError}>Pago Rechazado</Text>
      <Text style={styles.subtitleError}>
        {errorMessage ||
          'No pudimos procesar tu pago. Verifica los datos de tu tarjeta e intenta nuevamente.'}
      </Text>

      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.btnRetry}>
        <Text style={styles.btnRetryTxt}>Reintentar pago</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={styles.btnCancel}>
        <Text style={styles.btnCancelTxt}>Cancelar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    zIndex: 200,
  },
  overlaySuccess: {
    backgroundColor: Colors.primaryDark,
  },
  overlayError: {
    backgroundColor: Colors.background,
  },
  // ── Success ──
  iconWrapSuccess: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(20,184,166,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  titleSuccess: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.white,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitleSuccess: {
    fontSize: FontSize.sm,
    color: Colors.teal200,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.teal200,
    fontWeight: FontWeight.semiBold,
  },
  detailValue: {
    fontSize: FontSize.xs,
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  detailValueAccent: {
    fontSize: FontSize.xs,
    color: Colors.accentTeal,
    fontWeight: FontWeight.bold,
  },
  btnContinue: {
    backgroundColor: Colors.accentTeal,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    minWidth: 220,
  },
  btnContinueTxt: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  redirectHint: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.gray400,
  },
  // ── Error ──
  iconWrapError: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  titleError: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitleError: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  btnRetry: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xxl,
    alignItems: 'center',
    minWidth: 220,
  },
  btnRetryTxt: {
    color: Colors.accentTeal,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnCancel: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  btnCancelTxt: {
    color: Colors.gray500,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});

export default PaymentResult;
