import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import { HoraEstado } from '../types';
import { formatHora } from '@/shared/utils/fechas';
import { makeStyles } from '@/shared/theme';

const HORA_INICIO = 7;
const HORA_FIN = 22;
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);

interface HourRangeSelectorProps {
  horaDesde: number | null;
  horaHasta: number | null;
  onChangeDesde: (hora: number) => void;
  onChangeHasta: (hora: number) => void;
  horasEstado?: HoraEstado[];
}

export default function HourRangeSelector({
  horaDesde,
  horaHasta,
  onChangeDesde,
  onChangeHasta,
  horasEstado = [],
}: HourRangeSelectorProps) {
  const styles = useStyles();
  const estadoPorHora = useMemo(() => {
    const map = new Map<number, string>();
    horasEstado.forEach(h => map.set(h.hora, h.estado));
    return map;
  }, [horasEstado]);

  const esDisponible = (hora: number): boolean => {
    const estado = estadoPorHora.get(hora);
    return estado == null || estado === 'available';
  };

  // "hasta" solo puede llegar hasta el primer slot ocupado después de "desde"
  // (el slot que termina en `h` es el que empieza en `h - 1`).
  const horasHasta = useMemo(() => {
    if (horaDesde == null) return [];
    const opciones: number[] = [];
    for (let h = horaDesde + 1; h <= HORA_FIN + 1; h++) {
      if (!esDisponible(h - 1)) break;
      opciones.push(h);
    }
    return opciones;
  }, [horaDesde, estadoPorHora]);

  return (
    <View>
      <Text style={styles.label}>Desde</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {HORAS.map(hora => {
          const isActive = horaDesde === hora;
          const disabled = !esDisponible(hora);
          return (
            <TouchableOpacity
              key={`desde-${hora}`}
              testID={`hora-desde-${hora}`}
              activeOpacity={0.8}
              disabled={disabled}
              onPress={() => onChangeDesde(hora)}
              style={[styles.chip, isActive && styles.chipActive, disabled && styles.chipDisabled]}>
              <Text
                style={[
                  styles.chipText,
                  isActive && styles.chipTextActive,
                  disabled && styles.chipTextDisabled,
                ]}>
                {formatHora(hora)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.label, styles.labelSpaced]}>Hasta</Text>
      {horaDesde == null ? (
        <Text style={styles.hint}>Elige primero la hora de inicio.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}>
          {horasHasta.map(hora => {
            const isActive = horaHasta === hora;
            return (
              <TouchableOpacity
                key={`hasta-${hora}`}
                testID={`hora-hasta-${hora}`}
                activeOpacity={0.8}
                onPress={() => onChangeHasta(hora)}
                style={[styles.chip, isActive && styles.chipActive]}>
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {formatHora(hora)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  label: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: t.spacing.xxs,
  },
  labelSpaced: {
    marginTop: t.spacing.sm,
  },
  hint: {
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
    fontStyle: 'italic',
  },
  row: {
    gap: t.spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  chipActive: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  chipDisabled: {
    backgroundColor: t.colors.surfaceMuted,
    borderColor: t.colors.surfaceMuted,
  },
  chipText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
  },
  chipTextActive: {
    color: t.colors.onAccent,
  },
  chipTextDisabled: {
    color: t.colors.borderStrong,
    textDecorationLine: 'line-through',
  },
}));
