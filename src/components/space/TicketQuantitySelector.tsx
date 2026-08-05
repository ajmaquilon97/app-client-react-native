import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { AforoDia } from '@/types';

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
  const disponible = aforo?.disponible ?? null;
  const sinCupo = disponible != null && disponible <= 0;
  const puedeRestar = cantidad > 1;
  const puedeSumar = disponible == null || cantidad < disponible;

  return (
    <View>
      {loading && (
        <View style={styles.infoBanner}>
          <ActivityIndicator size="small" color={Colors.gray500} />
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

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
  },
  warningBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  warningBannerText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  aforoRow: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  aforoText: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
    fontWeight: FontWeight.medium,
  },
  aforoDisponible: {
    fontWeight: FontWeight.extraBold,
    color: Colors.accentTeal,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray100,
  },
  stepperBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  stepperBtnTextDisabled: {
    color: Colors.gray300,
  },
  stepperValue: {
    alignItems: 'center',
    minWidth: 72,
  },
  stepperValueText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  stepperValueLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
  },
});
