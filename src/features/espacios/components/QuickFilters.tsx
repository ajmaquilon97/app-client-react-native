import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { makeStyles } from '@/shared/theme';
import { FiltroRapido } from '../types';

interface QuickFilterOption {
  key: FiltroRapido;
  label: string;
  emoji: string;
}

const FILTROS: QuickFilterOption[] = [
  { key: 'cercanos', label: 'Más cercanos', emoji: '📍' },
  { key: 'puntuacion', label: 'Mejor puntuados', emoji: '⭐' },
  { key: 'inmediato', label: 'Disponibilidad inmediata', emoji: '⚡' },
];

interface QuickFiltersProps {
  active: FiltroRapido | null;
  onSelect: (filtro: FiltroRapido | null) => void;
}

export default function QuickFilters({ active, onSelect }: QuickFiltersProps) {
  const styles = useStyles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {FILTROS.map(({ key, label, emoji }) => {
        const isActive = active === key;
        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => onSelect(isActive ? null : key)}
            style={[styles.pill, isActive && styles.pillActive]}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  pillActive: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  emoji: {
    fontSize: t.fontSize.sm,
  },
  label: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
  },
  labelActive: {
    color: t.colors.onAccent,
  },
}));
