import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { CheckIcon, CloseCircleIcon } from '@/components/icons';
import { makeStyles, useTheme } from '@/theme';

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
  const styles = useStyles();
  const { colors } = useTheme();
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
          <CheckIcon size={56} color={colors.accent} strokeWidth={3} />
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
        <CloseCircleIcon size={64} color={colors.error} />
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

const useStyles = makeStyles((t) => ({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.spacing.xl,
    zIndex: 200,
  },
  overlaySuccess: {
    backgroundColor: t.colors.primary,
  },
  overlayError: {
    backgroundColor: t.colors.background,
  },
  // ── Success ──
  iconWrapSuccess: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: t.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
  },
  titleSuccess: {
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.headerText,
    marginBottom: t.spacing.xs,
    textAlign: 'center',
  },
  subtitleSuccess: {
    fontSize: t.fontSize.sm,
    color: t.colors.headerTextMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: t.spacing.lg,
    maxWidth: 280,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    gap: t.spacing.xs,
    marginBottom: t.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: t.fontSize.xs,
    color: t.colors.headerTextMuted,
    fontWeight: t.fontWeight.semiBold,
  },
  detailValue: {
    fontSize: t.fontSize.xs,
    color: t.colors.headerText,
    fontWeight: t.fontWeight.bold,
  },
  detailValueAccent: {
    fontSize: t.fontSize.xs,
    color: t.colors.accent,
    fontWeight: t.fontWeight.bold,
  },
  btnContinue: {
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.xxl,
    alignItems: 'center',
    minWidth: 220,
  },
  btnContinueTxt: {
    color: t.colors.onAccent,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  redirectHint: {
    marginTop: t.spacing.md,
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
  },
  // ── Error ──
  iconWrapError: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: t.colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.lg,
  },
  titleError: {
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xs,
    textAlign: 'center',
  },
  subtitleError: {
    fontSize: t.fontSize.sm,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: t.spacing.xl,
    maxWidth: 280,
  },
  btnRetry: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.xxl,
    alignItems: 'center',
    minWidth: 220,
  },
  btnRetryTxt: {
    color: t.colors.accent,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnCancel: {
    marginTop: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.xl,
    alignItems: 'center',
  },
  btnCancelTxt: {
    color: t.colors.textSecondary,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
}));

export default PaymentResult;
