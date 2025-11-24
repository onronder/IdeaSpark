/**
 * Design tokens for IdeaSpark 2025 UI Redesign
 * Modern, cohesive design system with brand-first aesthetics
 */

export const colors = {
  brand: {
    50: '#F1F1FF',
    100: '#E3E1FF',
    200: '#CAC5FF',
    300: '#A79FFF',
    400: '#7D70FF',
    500: '#6C63FF', // Primary
    600: '#5A54E6',
    700: '#4A45C7',
    800: '#3A36A8',
    900: '#2A288A',
  },
  surface: '#FFFFFF',
  surfaceMuted: '#F7F7FA',
  textPrimary: '#101114',
  textSecondary: '#555B66',
  borderMuted: '#E9EAF0',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
};

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 36,
  full: 9999,
};

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};

export const shadows = {
  card: {
    shadowColor: '#0B0E14',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  sm: {
    shadowColor: '#0B0E14',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0B0E14',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

export const type = {
  display: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    lineHeight: 16,
  },
};

export const gradients = {
  primary: ['#F6F7FF', '#FFFFFF'],
  brand: ['#7D70FF', '#6C63FF'],
  subtle: ['#F7F7FA', '#FFFFFF'],
};

/**
 * Dark mode palette
 * To be used when implementing dark theme
 */
export const darkColors = {
  surface: '#101114',
  surfaceMuted: '#1A1C20',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A4AB',
  borderMuted: '#2A2D33',
};
