export const Colors = {
  // Brand
  primaryDark: '#1E3A5F',
  accentTeal: '#14B8A6',
  background: '#F5F7FA',
  textPrimary: '#1F2937',

  // Supporting
  white: '#FFFFFF',
  black: '#000000',

  // Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',

  // Teal shades
  teal100: '#CCFBF1',
  teal200: '#99F6E4',
  tealLight: 'rgba(20, 184, 166, 0.1)',
  tealMedium: 'rgba(20, 184, 166, 0.2)',

  // Dark shades
  primaryDarkLight: 'rgba(30, 58, 95, 0.1)',
  primaryDarkMedium: 'rgba(30, 58, 95, 0.9)',
  overlayDark: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.8)',
  overlayWhite: 'rgba(255, 255, 255, 0.1)',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  // Rating / Favorites
  amber: '#F59E0B',
  rose: '#F43F5E',
  roseLight: '#FEE2E2',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F1F5F9',
} as const;

export type ColorKey = keyof typeof Colors;
