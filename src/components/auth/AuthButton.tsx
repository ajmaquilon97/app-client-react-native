import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { makeStyles, useTheme } from '@/shared/theme';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
}: AuthButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.buttonDisabled]}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra teñida con el color de marca, no gris.
    ...Platform.select({
      android: { elevation: 4, shadowColor: t.colors.primary },
      default: {
        shadowColor: t.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: t.isDark ? 0.5 : 0.3,
        shadowRadius: 8,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    ...t.typography.button,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.accent,
    letterSpacing: 1,
  },
}));
