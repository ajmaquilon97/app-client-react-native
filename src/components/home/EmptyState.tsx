import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { makeStyles, useTheme } from '@/theme';
import { SadFaceIcon } from '@/components/icons';

interface EmptyStateProps {
  onReset: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onReset }) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <SadFaceIcon size={36} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>Sin resultados</Text>
      <Text style={styles.subtitle}>
        No encontramos espacios con ese nombre o categoría. Intenta otra búsqueda.
      </Text>
      <TouchableOpacity activeOpacity={0.8} onPress={onReset} style={styles.button}>
        <Text style={styles.buttonText}>Restablecer</Text>
      </TouchableOpacity>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    paddingVertical: t.spacing.xxxl,
    paddingHorizontal: t.spacing.xl,
    alignItems: 'center',
    ...t.shadows.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.md,
  },
  title: {
    ...t.typography.subtitle,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...t.typography.caption,
    lineHeight: 20,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: t.spacing.lg,
  },
  button: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: t.spacing.xl,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
  },
  buttonText: {
    ...t.typography.captionStrong,
    fontWeight: t.fontWeight.bold,
    color: t.colors.onPrimary,
  },
}));

export default React.memo(EmptyState);
