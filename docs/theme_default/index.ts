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

/**
 * Estilos de texto listos para usar. No llevan color: el color se aplica
 * aparte con un token de `colors`, para que el mismo estilo sirva sobre
 * fondos claros y oscuros.
 *
 *   titulo: { ...t.typography.h2, color: t.colors.textPrimary }
 */
export const typography = {
  /** Cifras y números grandes destacados (precios, totales). */
  jumbo: {
    fontSize: fontSize.jumbo,
    lineHeight: 46,
    fontWeight: fontWeight.extraBold,
    letterSpacing: -0.8,
  },
  /** Título principal de una pantalla de bienvenida / hero. */
  display: {
    fontSize: fontSize.display,
    lineHeight: 38,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.6,
  },
  /** Título de pantalla (el más usado en cabeceras). */
  h1: {
    fontSize: fontSize.xxxl,
    lineHeight: 34,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  /** Título de cabecera de sección grande. */
  h2: {
    fontSize: fontSize.xxl,
    lineHeight: 30,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  /** Título de sección / tarjeta destacada. */
  h3: {
    fontSize: fontSize.xl,
    lineHeight: 26,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  /** Título de tarjeta, fila o modal. */
  title: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.2,
  },
  /** Subtítulo: acompaña a un título, un escalón por debajo. */
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: fontWeight.semiBold,
  },
  /** Subtítulo pequeño, para cabeceras con texto secundario. */
  subtitleSm: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
  },
  /** Texto de párrafo estándar. */
  body: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.regular,
  },
  /** Texto de párrafo resaltado. */
  bodyStrong: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.semiBold,
  },
  /** Texto de párrafo pequeño (el cuerpo más frecuente en listas). */
  bodySm: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
  },
  /** Texto pequeño resaltado. */
  bodySmStrong: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.semiBold,
  },
  /** Etiqueta de formulario o de campo. */
  label: {
    fontSize: fontSize.base,
    lineHeight: 18,
    fontWeight: fontWeight.semiBold,
  },
  /** Texto de ayuda, metadatos, timestamps. */
  caption: {
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: fontWeight.regular,
  },
  /** Caption resaltado (chips, badges). */
  captionStrong: {
    fontSize: fontSize.sm,
    lineHeight: 16,
    fontWeight: fontWeight.semiBold,
  },
  /** Texto mínimo (contadores, etiquetas de tab bar). */
  tiny: {
    fontSize: fontSize.xxs,
    lineHeight: 14,
    fontWeight: fontWeight.medium,
  },
  /** Encabezado de grupo en mayúsculas. */
  overline: {
    fontSize: fontSize.xs,
    lineHeight: 14,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  /** Texto de botón. */
  button: {
    fontSize: fontSize.md,
    lineHeight: 20,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.2,
  },
  /** Texto de botón pequeño. */
  buttonSm: {
    fontSize: fontSize.base,
    lineHeight: 18,
    fontWeight: fontWeight.semiBold,
  },
  /** Enlaces. */
  link: {
    fontSize: fontSize.base,
    lineHeight: 20,
    fontWeight: fontWeight.semiBold,
  },
  /** Código / monoespaciado. */
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

/**
 * Colores absolutos, iguales en ambos temas. Úsalos solo cuando el color NO
 * debe cambiar con el tema (p. ej. texto sobre una foto oscura).
 */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Tema claro — la plantilla de marca de Agora. */
const lightColors = {
  /* --- Marca --- */
  /**
   * RELLENO de marca: fondo de cabeceras y botones primarios. Siempre lleva
   * `onPrimary` encima. En tema oscuro se aclara solo lo justo para seguir
   * siendo un fondo, no un color de texto — para texto usa `primaryText`.
   */
  primary: '#1E3A5F',
  /** Variante pulsada / hover del relleno primario. */
  primaryStrong: '#16293F',
  /** Texto e iconos que van encima de `primary`. */
  onPrimary: '#FFFFFF',
  /**
   * TEXTO/ICONO en color de marca sobre un fondo normal (`background`,
   * `surface`). En tema oscuro es un azul claro, legible sobre el fondo.
   */
  primaryText: '#1E3A5F',
  /** Fondo tenue de marca: chips, iconos con fondo. */
  primarySoft: 'rgba(30, 58, 95, 0.10)',
  /** Fondo de marca semitransparente sobre imágenes. */
  primaryScrim: 'rgba(30, 58, 95, 0.90)',

  /** Verde azulado de acento: acciones destacadas, estados activos. */
  accent: '#14B8A6',
  accentStrong: '#0D9488',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(20, 184, 166, 0.12)',
  accentSoftStrong: 'rgba(20, 184, 166, 0.22)',
  /** Acento claro: texto secundario sobre la cabecera azul. */
  accentMuted: '#99F6E4',
  accentSurface: '#CCFBF1',

  /* --- Superficies --- */
  /** Fondo general de pantalla. */
  background: '#F5F7FA',
  /** Tarjetas, hojas modales, inputs. */
  surface: '#FFFFFF',
  /** Superficie ligeramente diferenciada. */
  surfaceAlt: '#F9FAFB',
  /** Relleno gris para placeholders, separadores gruesos, chips inactivos. */
  surfaceMuted: '#F3F4F6',
  // La cabecera de marca se rellena con `primary`; estos son sus textos.
  /** Título sobre la cabecera de marca. */
  headerText: '#FFFFFF',
  /** Subtítulo sobre la cabecera de marca. */
  headerTextMuted: '#99F6E4',
  /** Texto tenue sobre la cabecera (placeholders del buscador). */
  headerTextSubtle: 'rgba(203, 213, 225, 0.8)',
  /** Barra de tabs. */
  tabBar: '#FFFFFF',
  tabBarActive: '#1E3A5F',
  tabBarInactive: '#9CA3AF',

  /* --- Texto --- */
  /** Texto principal. */
  textPrimary: '#1F2937',
  /** Texto secundario / descripciones. */
  textSecondary: '#6B7280',
  /** Texto atenuado / placeholders / iconos apagados. */
  textMuted: '#9CA3AF',
  /** Texto sobre fondos oscuros o de color sólido. */
  textInverse: '#FFFFFF',
  /** Enlaces. */
  link: '#2563EB',

  /* --- Bordes --- */
  border: '#E5E7EB',
  borderSubtle: '#F1F5F9',
  borderStrong: '#D1D5DB',

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
  /** Estrellas de valoración. */
  star: '#F59E0B',
  /** Corazón de favoritos. */
  favorite: '#F43F5E',
  favoriteSoft: '#FEE2E2',
  /** Fondo de carga / esqueleto. */
  skeleton: '#E5E7EB',
  /** Controles deshabilitados. */
  disabled: '#E5E7EB',
  onDisabled: '#9CA3AF',
  /** Campos de formulario. */
  inputBackground: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputBorderFocused: '#14B8A6',
  inputPlaceholder: '#9CA3AF',

  /* --- Capas y sombras --- */
  /** Fondo oscuro detrás de un modal. */
  overlay: 'rgba(0, 0, 0, 0.5)',
  /** Velo claro sobre imágenes. */
  overlayLight: 'rgba(255, 255, 255, 0.8)',
  /** Realce translúcido sobre superficies de color. */
  overlayWhite: 'rgba(255, 255, 255, 0.1)',
  /** Borde translúcido sobre superficies de color. */
  overlayWhiteSubtle: 'rgba(255, 255, 255, 0.08)',
  /** Texto sobre una foto o el visor de la cámara (siempre fondo oscuro). */
  textOnMedia: 'rgba(255, 255, 255, 0.85)',
  /** Color de la sombra proyectada. */
  shadow: '#000000',
} as const;

export type ColorScheme = 'light' | 'dark';
/** Nombre de cada color del tema. La paleta clara es la fuente de verdad. */
export type ColorToken = keyof typeof lightColors;
/** Plantilla de colores completa: todo tema debe definir todos los tokens. */
export type ThemeColors = Record<ColorToken, string>;

/** Tema oscuro — mismos tokens, valores adaptados. */
const darkColors: ThemeColors = {
  /* --- Marca --- */
  // Relleno: navy legible en oscuro, con texto blanco encima (contraste ~7:1).
  primary: '#2F5480',
  primaryStrong: '#3D6A9E',
  onPrimary: '#FFFFFF',
  // Texto/icono de marca: azul claro, legible sobre `background`.
  primaryText: '#8AB4E8',
  primarySoft: 'rgba(138, 180, 232, 0.14)',
  primaryScrim: 'rgba(11, 18, 32, 0.90)',

  accent: '#2DD4BF',
  accentStrong: '#5EEAD4',
  onAccent: '#06251F',
  accentSoft: 'rgba(45, 212, 191, 0.16)',
  accentSoftStrong: 'rgba(45, 212, 191, 0.28)',
  accentMuted: '#5EEAD4',
  accentSurface: 'rgba(45, 212, 191, 0.20)',

  /* --- Superficies --- */
  background: '#0B1220',
  surface: '#151C2A',
  surfaceAlt: '#1B2434',
  surfaceMuted: '#222C3D',
  headerText: '#F8FAFC',
  headerTextMuted: '#5EEAD4',
  headerTextSubtle: 'rgba(203, 213, 225, 0.75)',
  tabBar: '#131A28',
  tabBarActive: '#8AB4E8',
  tabBarInactive: '#737D8C',

  /* --- Texto --- */
  textPrimary: '#F3F4F6',
  textSecondary: '#A9B1BE',
  textMuted: '#737D8C',
  textInverse: '#FFFFFF',
  link: '#60A5FA',

  /* --- Bordes --- */
  border: '#2A3446',
  borderSubtle: '#1F2836',
  borderStrong: '#3A465C',

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
  favorite: '#FB7185',
  favoriteSoft: 'rgba(251, 113, 133, 0.18)',
  skeleton: '#222C3D',
  disabled: '#2A3446',
  onDisabled: '#6B7280',
  inputBackground: '#151C2A',
  inputBorder: '#2A3446',
  inputBorderFocused: '#2DD4BF',
  inputPlaceholder: '#737D8C',

  /* --- Capas y sombras --- */
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(21, 28, 42, 0.85)',
  overlayWhite: 'rgba(255, 255, 255, 0.12)',
  overlayWhiteSubtle: 'rgba(255, 255, 255, 0.10)',
  textOnMedia: 'rgba(255, 255, 255, 0.85)',
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
  // En modo oscuro las sombras casi no se perciben, por eso se refuerza la opacidad.
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
  /** Alto de la barra de tabs sin contar el safe area. */
  tabBarHeight: Platform.select({ ios: 50, android: 64 }) ?? 56,
  /** Ancho máximo del contenido en pantallas anchas / web. */
  maxContentWidth: 800,
  /** Área táctil mínima recomendada. */
  minTouchTarget: 44,
  /** Grosor de una línea divisoria. */
  hairline: StyleSheet.hairlineWidth,
} as const;

/* -------------------------------------------------------------------------- */
/*  6. EL TEMA Y SUS HOOKS                                                     */
/* -------------------------------------------------------------------------- */

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  /**
   * `barStyle` para una `StatusBar` que va sobre `background` o `surface`.
   * Sobre la cabecera de marca (azul oscuro en ambos temas) usa siempre
   * `"light-content"` en vez de este valor.
   */
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

/** Devuelve el tema para un esquema concreto. Útil fuera de componentes. */
export function getTheme(scheme: ColorScheme): Theme {
  return themes[scheme];
}

/** Esquema de color activo del sistema ('light' | 'dark'). */
export function useAppColorScheme(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

/**
 * Hook principal: devuelve el tema activo.
 *
 *   const { colors, spacing } = useTheme();
 */
export function useTheme(): Theme {
  return themes[useAppColorScheme()];
}

/**
 * Crea un hook de estilos ligado al tema. La hoja de estilos se calcula una
 * sola vez por esquema de color y se reutiliza en todos los renders.
 *
 *   const useStyles = makeStyles((t) => ({
 *     titulo: { ...t.typography.h1, color: t.colors.textPrimary },
 *   }));
 */
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
