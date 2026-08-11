import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { makeStyles } from '@/theme';

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
  const styles = useStyles();
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

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xxs,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    gap: 2,
  },
  chipActive: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  dayLabel: {
    fontSize: t.fontSize.xs - 1,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayLabelActive: {
    color: t.colors.onAccent,
  },
  dayNumber: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  dayNumberActive: {
    color: t.colors.onAccent,
  },
}));
