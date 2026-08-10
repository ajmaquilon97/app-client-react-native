import { View, type ViewProps } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

export type ThemedViewProps = ViewProps & {
  /** Token de color de fondo del tema global. Por defecto `background`. */
  type?: ColorToken;
};

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const { colors } = useTheme();

  return <View style={[{ backgroundColor: colors[type ?? 'background'] }, style]} {...otherProps} />;
}
