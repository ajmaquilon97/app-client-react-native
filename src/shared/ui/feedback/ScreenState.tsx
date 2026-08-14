import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { makeStyles, useTheme } from '@/shared/theme';

export interface ScreenStateProps {
  variant: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Estado de pantalla (cargando / error / vacío) con el mismo aspecto en toda la
 * app. Antes cada pantalla lo repintaba a mano con su propio `ActivityIndicator`
 * y su propio botón de reintentar.
 */
export default function ScreenState({
  variant,
  title,
  message,
  actionLabel,
  onAction,
}: ScreenStateProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  if (variant === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
        {!!message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!message && <Text style={styles.message}>{message}</Text>}
      {!!onAction && (
        <TouchableOpacity activeOpacity={0.8} onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel ?? 'Reintentar'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: t.spacing.xxxl,
    paddingHorizontal: t.spacing.xl,
    gap: t.spacing.sm,
  },
  title: {
    ...t.typography.subtitle,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...t.typography.caption,
    lineHeight: 20,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: t.spacing.sm,
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
