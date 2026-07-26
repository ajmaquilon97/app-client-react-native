import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { HoraEstado } from '@/types';
import { formatHora } from '@/utils/fechas';

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

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: Spacing.xxs,
  },
  labelSpaced: {
    marginTop: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontStyle: 'italic',
  },
  row: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.accentTeal,
    borderColor: Colors.accentTeal,
  },
  chipDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray100,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray600,
  },
  chipTextActive: {
    color: Colors.white,
  },
  chipTextDisabled: {
    color: Colors.gray300,
    textDecorationLine: 'line-through',
  },
});
