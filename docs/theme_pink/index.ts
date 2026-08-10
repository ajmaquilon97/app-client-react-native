/**
 * ARCHIVO GLOBAL DE ESTILOS DE LA APP (el "CSS global" de Agora).
 *
 * React Native no usa CSS: el equivalente es este archivo de design tokens.
 * Todo lo visual se controla desde aquí — colores, títulos, subtítulos, tamaños
 * de letra, espaciados, radios y sombras.
 *
 * Reglas de uso:
 *   1. NUNCA escribas un color en hexadecimal ni un `fontSize` numérico dentro
 *      de una pantalla o componente. Usa un token de este archivo.
 *   2. Para estilos que dependen del tema (claro/oscuro) usa `makeStyles`:
 *
 *        const useStyles = makeStyles((t) => ({
 *          card: { backgroundColor: t.colors.surface, padding: t.spacing.md },
 *          titulo: { ...t.typography.h2, color: t.colors.textPrimary },
 *        }));
 *
 *        function MiPantalla() {
 *          const styles = useStyles();
 *          ...
 *        }
 *
 *   3. Para colores usados directamente en el JSX (iconos, `tintColor`, etc.)
 *      usa el hook `useTheme()`:
 *
 *        const { colors } = useTheme();
 *        <HeartIcon color={colors.favorite} />
 *
 * Para cambiar la plantilla de colores de toda la app basta con editar
 * `lightColors` / `darkColors`. Para cambiar la jerarquía tipográfica, `typography`.
 */

import '@/global.css';

import { useMemo } from 'react';
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

/* -------------------------------------------------------------------------- */
/*  1. ESCALAS BASE (no dependen del tema)                                     */
/* -------------------------------------------------------------------------- */

/** Escala de tamaños de letra, en puntos. */
export const fontSize = {
  xxs: 10,
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
  jumbo: 40,
} as const;

/** Pesos de fuente. Se declaran como string porque es lo que espera RN. */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * Multiplicadores de interlineado, para cuando se calcula a partir del tamaño
 * de letra: `lineHeight: t.fontSize.base * t.lineHeight.relaxed`.
 * Las variantes de `typography` ya traen su `lineHeight` en puntos.
 */
export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

/** Escala de espaciados (márgenes, paddings, gaps). */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

/** Radios de borde. */
export const radius = {
  none: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  full: 9999,
} as const;

/** Familias tipográficas por plataforma. */
export const fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'Roboto',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
  },
})!;

/* -------------------------------------------------------------------------- */
/*  2. TIPOGRAFÍA — títulos, subtítulos y textos                               */
/* -------------------------------------------------------------------------- */

export const typography = {
  jumbo: {
    fontSize: fontSize.jumbo,
    lineHeight: 46,
    fontWeight: fontWeight.extraBold,
    letterSpacing: -0.8,
  },
  display: {
    fontSize: fontSize.display,
    lineHeight: 38,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
  },
  h1: {
    fontSize: fontSize.xxxl,
    lineHeight: 34,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: fontSize.xxl,
    lineHeight: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: fontSize.xl,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: fontWeight.semiBold,
  },
  subtitleSm: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  body: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.regular,
  },
  bodyStrong: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.semiBold,
  },
  bodySm: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
  },
  bodySmStrong: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.semiBold,
  },
  label: {
    fontSize: fontSize.base,
    lineHeight: 18,
    fontWeight: fontWeight.semiBold,
  },
  caption: {
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: fontWeight.regular,
  },
  captionStrong: {
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: fontWeight.semiBold,
  },
  tiny: {
    fontSize: fontSize.xxs,
    lineHeight: 14,
    fontWeight: fontWeight.medium,
  },
  overline: {
    fontSize: fontSize.xs,
    lineHeight: 14,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  buttonSm: {
    fontSize: fontSize.base,
    lineHeight: 18,
    fontWeight: fontWeight.semiBold,
  },
  link: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.semiBold,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    lineHeight: 18,
    fontWeight: Platform.select({ android: fontWeight.bold }) ?? fontWeight.medium,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/* -------------------------------------------------------------------------- */
/*  3. PLANTILLA DE COLORES                                                    */
/* -------------------------------------------------------------------------- */

export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Tema claro — la plantilla de marca de Agora. */
const lightColors = {
  /* --- Marca --- */
  primary: '#151B2D',
  primaryStrong: '#242F4C',
  onPrimary: '#FFFFFF',
  primaryText: '#151B2D',
  primarySoft: 'rgba(21, 27, 45, 0.10)',
  primaryScrim: 'rgba(21, 27, 45, 0.90)',

  accent: '#FD548A',
  accentStrong: '#E34A7B',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(253, 84, 138, 0.12)',
  accentSoftStrong: 'rgba(253, 84, 138, 0.22)',
  accentMuted: '#FFB3CD',
  accentSurface: '#FFE0EB',

  /* --- Superficies --- */
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  surfaceMuted: '#E2E8F0',
  headerText: '#FFFFFF',
  headerTextMuted: '#FFB3CD',
  headerTextSubtle: 'rgba(255, 255, 255, 0.7)',
  tabBar: '#FFFFFF',
  tabBarActive: '#151B2D',
  tabBarInactive: '#94A3B8',

  /* --- Texto --- */
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  link: '#3B82F6',

  /* --- Bordes --- */
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  borderStrong: '#CBD5E1',

  /* --- Estados semánticos --- */
  success: '#10B981',
  successSoft: '#ECFDF5',
  onSuccessSoft: '#047857',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  onWarningSoft: '#B45309',
  error: '#EF4444',
  errorSoft: '#FEE2E2',
  onErrorSoft: '#B91C1C',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',
  onInfoSoft: '#1D4ED8',

  /* --- Elementos concretos --- */
  star: '#F59E0B',
  favorite: '#FD548A',
  favoriteSoft: '#FFE0EB',
  skeleton: '#E2E8F0',
  disabled: '#E2E8F0',
  onDisabled: '#94A3B8',
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputBorderFocused: '#FD548A',
  inputPlaceholder: '#94A3B8',

  /* --- Capas y sombras --- */
  overlay: 'rgba(15, 23, 42, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.8)',
  overlayWhite: 'rgba(255, 255, 255, 0.1)',
  overlayWhiteSubtle: 'rgba(255, 255, 255, 0.08)',
  textOnMedia: 'rgba(255, 255, 255, 0.95)',
  shadow: '#0F172A', // Sombra tintada con Slate para máxima armonía
} as const;

export type ColorScheme = 'light' | 'dark';
export type ColorToken = keyof typeof lightColors;
export type ThemeColors = Record<ColorToken, string>;

/** Tema oscuro — mismos tokens, valores adaptados. */
const darkColors: ThemeColors = {
  /* --- Marca --- */
  primary: '#242F4C',
  primaryStrong: '#3B4A6B',
  onPrimary: '#FFFFFF',
  primaryText: '#8AB4E8',
  primarySoft: 'rgba(36, 47, 76, 0.40)',
  primaryScrim: 'rgba(11, 15, 25, 0.90)',

  accent: '#FD548A',
  accentStrong: '#FF85AE',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(253, 84, 138, 0.16)',
  accentSoftStrong: 'rgba(253, 84, 138, 0.28)',
  accentMuted: '#FF85AE',
  accentSurface: 'rgba(253, 84, 138, 0.20)',

  /* --- Superficies --- */
  background: '#0B0F19', // Slate muy oscuro
  surface: '#151B2D', // El primario se convierte en la superficie oscura
  surfaceAlt: '#1E293B',
  surfaceMuted: '#334155',
  headerText: '#F8FAFC',
  headerTextMuted: '#FF85AE',
  headerTextSubtle: 'rgba(203, 213, 225, 0.75)',
  tabBar: '#151B2D',
  tabBarActive: '#FD548A',
  tabBarInactive: '#64748B',

  /* --- Texto --- */
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0F19',
  link: '#60A5FA',

  /* --- Bordes --- */
  border: '#334155',
  borderSubtle: '#1E293B',
  borderStrong: '#475569',

  /* --- Estados semánticos --- */
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.15)',
  onSuccessSoft: '#6EE7B7',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  onWarningSoft: '#FCD34D',
  error: '#F87171',
  errorSoft: 'rgba(248, 113, 113, 0.16)',
  onErrorSoft: '#FCA5A5',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.15)',
  onInfoSoft: '#93C5FD',

  /* --- Elementos concretos --- */
  star: '#FBBF24',
  favorite: '#FF85AE',
  favoriteSoft: 'rgba(253, 84, 138, 0.18)',
  skeleton: '#334155',
  disabled: '#1E293B',
  onDisabled: '#64748B',
  inputBackground: '#151B2D',
  inputBorder: '#334155',
  inputBorderFocused: '#FD548A',
  inputPlaceholder: '#64748B',

  /* --- Capas y sombras --- */
  overlay: 'rgba(0, 0, 0, 0.75)',
  overlayLight: 'rgba(11, 15, 25, 0.85)',
  overlayWhite: 'rgba(255, 255, 255, 0.12)',
  overlayWhiteSubtle: 'rgba(255, 255, 255, 0.10)',
  textOnMedia: 'rgba(255, 255, 255, 0.90)',
  shadow: '#000000',
};

const colorSchemes: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/* -------------------------------------------------------------------------- */
/*  4. SOMBRAS / ELEVACIÓN                                                     */
/* -------------------------------------------------------------------------- */

export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl';

function buildShadows(colors: ThemeColors, isDark: boolean): Record<ShadowLevel, ViewStyle> {
  const opacityFactor = isDark ? 2.2 : 1;

  const shadow = (height: number, blur: number, opacity: number, elevation: number): ViewStyle =>
    Platform.select<ViewStyle>({
      android: { elevation, shadowColor: colors.shadow },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height },
        shadowOpacity: Math.min(opacity * opacityFactor, 0.6),
        shadowRadius: blur,
      },
    })!;

  return {
    none: {},
    sm: shadow(1, 3, 0.06, 2),
    md: shadow(2, 8, 0.08, 4),
    lg: shadow(4, 12, 0.12, 8),
    xl: shadow(8, 20, 0.16, 12),
  };
}

/* -------------------------------------------------------------------------- */
/*  5. MEDIDAS DE LAYOUT                                                       */
/* -------------------------------------------------------------------------- */

export const layout = {
  tabBarHeight: Platform.select({ ios: 50, android: 64 }) ?? 56,
  maxContentWidth: 800,
  minTouchTarget: 44,
  hairline: StyleSheet.hairlineWidth,
} as const;

/* -------------------------------------------------------------------------- */
/*  6. EL TEMA Y SUS HOOKS                                                     */
/* -------------------------------------------------------------------------- */

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  statusBarStyle: 'light-content' | 'dark-content';
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fonts: typeof fonts;
  layout: typeof layout;
  palette: typeof palette;
  shadows: Record<ShadowLevel, ViewStyle>;
}

const themes: Record<ColorScheme, Theme> = {
  light: buildTheme('light'),
  dark: buildTheme('dark'),
};

function buildTheme(scheme: ColorScheme): Theme {
  const colors = colorSchemes[scheme];
  const isDark = scheme === 'dark';

  return {
    scheme,
    isDark,
    colors,
    statusBarStyle: isDark ? 'light-content' : 'dark-content',
    typography,
    spacing,
    radius,
    fontSize,
    fontWeight,
    lineHeight,
    fonts,
    layout,
    palette,
    shadows: buildShadows(colors, isDark),
  };
}

export function getTheme(scheme: ColorScheme): Theme {
  return themes[scheme];
}

export function useAppColorScheme(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme(): Theme {
  return themes[useAppColorScheme()];
}

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T & StyleSheet.NamedStyles<T>,
): () => T {
  const cache = new Map<ColorScheme, T>();

  return function useStyles(): T {
    const scheme = useAppColorScheme();

    return useMemo(() => {
      let styles = cache.get(scheme);
      if (!styles) {
        styles = StyleSheet.create(factory(themes[scheme]));
        cache.set(scheme, styles);
      }
      return styles;
    }, [scheme]);
  };
}