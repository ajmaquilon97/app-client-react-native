import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { FiltroRapido } from '@/types';

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

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  pillActive: {
    backgroundColor: Colors.accentTeal,
    borderColor: Colors.accentTeal,
  },
  emoji: {
    fontSize: FontSize.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray500,
  },
  labelActive: {
    color: Colors.white,
  },
});
