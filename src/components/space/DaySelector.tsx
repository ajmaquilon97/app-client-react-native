import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_A_MOSTRAR = 14;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface DaySelectorProps {
  hoy: Date;
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

export default function DaySelector({ hoy, selectedDate, onSelect }: DaySelectorProps) {
  const dias = useMemo(
    () =>
      Array.from({ length: DIAS_A_MOSTRAR }, (_, i) => {
        const dia = new Date(hoy);
        dia.setDate(dia.getDate() + i);
        return dia;
      }),
    [hoy],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {dias.map((dia, index) => {
        const isActive = !!selectedDate && isSameDay(dia, selectedDate);
        return (
          <TouchableOpacity
            key={dia.toISOString()}
            activeOpacity={0.8}
            onPress={() => onSelect(dia)}
            style={[styles.chip, isActive && styles.chipActive]}>
            <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
              {index === 0 ? 'Hoy' : DIAS_SEMANA[dia.getDay()]}
            </Text>
            <Text style={[styles.dayNumber, isActive && styles.dayNumberActive]}>
              {dia.getDate()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    gap: 2,
  },
  chipActive: {
    backgroundColor: Colors.accentTeal,
    borderColor: Colors.accentTeal,
  },
  dayLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray500,
    textTransform: 'uppercase',
  },
  dayLabelActive: {
    color: Colors.white,
  },
  dayNumber: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  dayNumberActive: {
    color: Colors.white,
  },
});
