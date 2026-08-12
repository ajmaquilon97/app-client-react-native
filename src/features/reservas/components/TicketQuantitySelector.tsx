import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AforoDia } from '../types';
import { makeStyles, useTheme } from '@/shared/theme';

interface TicketQuantitySelectorProps {
  cantidad: number;
  onChange: (cantidad: number) => void;
  aforo: AforoDia | null;
  loading: boolean;
  error: string | null;
}

export default function TicketQuantitySelector({
  cantidad,
  onChange,
  aforo,
  loading,
  error,
}: TicketQuantitySelectorProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const disponible = aforo?.disponible ?? null;
  const sinCupo = disponible != null && disponible <= 0;
  const puedeRestar = cantidad > 1;
  const puedeSumar = disponible == null || cantidad < disponible;

  return (
    <View>
      {loading && (
        <View style={styles.infoBanner}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.infoBannerText}>Consultando cupo disponible…</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerText}>⚠️ {error}</Text>
        </View>
      )}

      {!loading && !error && aforo && (
        <View style={styles.aforoRow}>
          <Text style={styles.aforoText}>
            {sinCupo ? (
              'Sin cupo disponible para este día'
            ) : (
              <>
                <Text style={styles.aforoDisponible}>{disponible}</Text> de {aforo.capacidadTotal}{' '}
                entradas disponibles
              </>
            )}
          </Text>
        </View>
      )}

      {!loading && !error && !sinCupo && (
        <View style={styles.stepperRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!puedeRestar}
            onPress={() => onChange(cantidad - 1)}
            style={[styles.stepperBtn, !puedeRestar && styles.stepperBtnDisabled]}>
            <Text style={[styles.stepperBtnText, !puedeRestar && styles.stepperBtnTextDisabled]}>−</Text>
          </TouchableOpacity>
          <View style={styles.stepperValue}>
            <Text style={styles.stepperValueText}>{cantidad}</Text>
            <Text style={styles.stepperValueLabel}>entrada{cantidad !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!puedeSumar}
            onPress={() => onChange(cantidad + 1)}
            style={[styles.stepperBtn, !puedeSumar && styles.stepperBtnDisabled]}>
            <Text style={[styles.stepperBtnText, !puedeSumar && styles.stepperBtnTextDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
  },
  infoBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
  warningBanner: {
    backgroundColor: t.colors.errorSoft,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
  },
  warningBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    fontWeight: t.fontWeight.medium,
  },
  aforoRow: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
  },
  aforoText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
  aforoDisponible: {
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.accent,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: t.colors.surfaceMuted,
    borderColor: t.colors.surfaceMuted,
  },
  stepperBtnText: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  stepperBtnTextDisabled: {
    color: t.colors.borderStrong,
  },
  stepperValue: {
    alignItems: 'center',
    minWidth: 72,
  },
  stepperValueText: {
    fontSize: t.fontSize.xl,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  stepperValueLabel: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
}));
