import { Text, type TextProps } from 'react-native';

import { useTheme, type ColorToken, type TypographyVariant } from '@/theme';

export type ThemedTextProps = TextProps & {
  /** Variante tipográfica del tema global (`typography` en `@/theme`). */
  type?: TypographyVariant;
  /** Token de color del tema global. Por defecto `textPrimary`. */
  themeColor?: ColorToken;
};

export function ThemedText({ style, type = 'body', themeColor, ...rest }: ThemedTextProps) {
  const { colors, typography } = useTheme();

  return (
    <Text
      style={[typography[type], { color: colors[themeColor ?? 'textPrimary'] }, style]}
      {...rest}
    />
  );
}
