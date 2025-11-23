import { createConfig } from '@gluestack-style/react';
import { config as defaultConfig } from '@gluestack-ui/config';

// IdeaSpark brand colors - Warm Stone Palette + Orange Accent
const brandColors = {
  // Primary: Orange accent for actions and emphasis
  primary: {
    0: '#FFF7ED',
    50: '#FFEDD5',
    100: '#FED7AA',
    200: '#FDBA74',
    300: '#FB923C',
    400: '#FB923C', // Lighter for dark mode
    500: '#F97316', // Main orange
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
    950: '#431407',
  },
  // Secondary: Warm stone neutrals
  secondary: {
    0: '#FFFFFF',     // Pure white
    50: '#FAFAF9',    // Stone 50 - subtle warmth
    100: '#F5F5F4',   // Stone 100
    200: '#E7E5E4',   // Stone 200
    300: '#D6D3D1',   // Stone 300
    400: '#A8A29E',   // Stone 400
    500: '#78716C',   // Stone 500
    600: '#57534E',   // Stone 600
    700: '#44403C',   // Stone 700
    800: '#292524',   // Stone 800
    900: '#1C1917',   // Stone 900
    950: '#0C0A09',   // Stone 950 - almost black
  },
  info: {
    0: '#EFF6FF',
    50: '#DBEAFE',
    100: '#BFDBFE',
    200: '#93C5FD',
    300: '#60A5FA',
    400: '#3B82F6',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E293B',
    950: '#172554',
  },
  success: {
    0: '#F0FDF4',
    50: '#DCFCE7',
    100: '#BBF7D0',
    200: '#86EFAC',
    300: '#4ADE80',
    400: '#22C55E',
    500: '#16A34A',
    600: '#15803D',
    700: '#166534',
    800: '#14532D',
    900: '#052E16',
    950: '#022C13',
  },
  warning: {
    0: '#FEFCE8',
    50: '#FEF9C3',
    100: '#FEF08A',
    200: '#FDE047',
    300: '#FACC15',
    400: '#EAB308',
    500: '#CA8A04',
    600: '#A16207',
    700: '#854D0E',
    800: '#713F12',
    900: '#422006',
    950: '#2A1503',
  },
  error: {
    0: '#FEF2F2',
    50: '#FEE2E2',
    100: '#FECACA',
    200: '#FCA5A5',
    300: '#F87171',
    400: '#EF4444',
    500: '#DC2626',
    600: '#B91C1C',
    700: '#991B1B',
    800: '#7F1D1D',
    900: '#450A0A',
    950: '#2D0505',
  },
};

// Custom theme configuration
export const gluestackUIConfig = createConfig({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    colors: {
      ...defaultConfig.tokens.colors,
      ...brandColors,
      // Override primary colors
      primary0: brandColors.primary[0],
      primary50: brandColors.primary[50],
      primary100: brandColors.primary[100],
      primary200: brandColors.primary[200],
      primary300: brandColors.primary[300],
      primary400: brandColors.primary[400],
      primary500: brandColors.primary[500],
      primary600: brandColors.primary[600],
      primary700: brandColors.primary[700],
      primary800: brandColors.primary[800],
      primary900: brandColors.primary[900],
      primary950: brandColors.primary[950],

      // Override secondary colors
      secondary0: brandColors.secondary[0],
      secondary50: brandColors.secondary[50],
      secondary100: brandColors.secondary[100],
      secondary200: brandColors.secondary[200],
      secondary300: brandColors.secondary[300],
      secondary400: brandColors.secondary[400],
      secondary500: brandColors.secondary[500],
      secondary600: brandColors.secondary[600],
      secondary700: brandColors.secondary[700],
      secondary800: brandColors.secondary[800],
      secondary900: brandColors.secondary[900],
      secondary950: brandColors.secondary[950],

      // Override info colors
      info0: brandColors.info[0],
      info50: brandColors.info[50],
      info100: brandColors.info[100],
      info200: brandColors.info[200],
      info300: brandColors.info[300],
      info400: brandColors.info[400],
      info500: brandColors.info[500],
      info600: brandColors.info[600],
      info700: brandColors.info[700],
      info800: brandColors.info[800],
      info900: brandColors.info[900],
      info950: brandColors.info[950],

      // Override success colors
      success0: brandColors.success[0],
      success50: brandColors.success[50],
      success100: brandColors.success[100],
      success200: brandColors.success[200],
      success300: brandColors.success[300],
      success400: brandColors.success[400],
      success500: brandColors.success[500],
      success600: brandColors.success[600],
      success700: brandColors.success[700],
      success800: brandColors.success[800],
      success900: brandColors.success[900],
      success950: brandColors.success[950],

      // Override warning colors
      warning0: brandColors.warning[0],
      warning50: brandColors.warning[50],
      warning100: brandColors.warning[100],
      warning200: brandColors.warning[200],
      warning300: brandColors.warning[300],
      warning400: brandColors.warning[400],
      warning500: brandColors.warning[500],
      warning600: brandColors.warning[600],
      warning700: brandColors.warning[700],
      warning800: brandColors.warning[800],
      warning900: brandColors.warning[900],
      warning950: brandColors.warning[950],

      // Override error colors
      error0: brandColors.error[0],
      error50: brandColors.error[50],
      error100: brandColors.error[100],
      error200: brandColors.error[200],
      error300: brandColors.error[300],
      error400: brandColors.error[400],
      error500: brandColors.error[500],
      error600: brandColors.error[600],
      error700: brandColors.error[700],
      error800: brandColors.error[800],
      error900: brandColors.error[900],
      error950: brandColors.error[950],
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      mono: 'JetBrains Mono',
    },
    fontSizes: {
      ...defaultConfig.tokens.fontSizes,
      '2xs': 10,
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
      '6xl': 60,
    },
    space: {
      ...defaultConfig.tokens.space,
      'px': '1px',
      0: 0,
      0.5: 2,
      1: 4,
      1.5: 6,
      2: 8,
      2.5: 10,
      3: 12,
      3.5: 14,
      4: 16,
      5: 20,
      6: 24,
      7: 28,
      8: 32,
      9: 36,
      10: 40,
      12: 48,
      16: 64,
      20: 80,
      24: 96,
      32: 128,
      40: 160,
      48: 192,
      56: 224,
      64: 256,
    },
    radii: {
      none: 0,
      xs: 2,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
      '2xl': 16,
      '3xl': 24,
      full: 9999,
    },
  },
  themes: {
    light: {
      colors: {
        // Light theme - Warm stone backgrounds
        backgroundLight0: '#FFFFFF',      // Pure white
        backgroundLight50: '#FAFAF9',     // Stone 50 - primary background
        backgroundLight100: '#F5F5F4',    // Stone 100 - cards/sections

        // Light theme text - High contrast
        textLight900: '#1C1917',          // Stone 900 - primary text
        textLight700: '#57534E',          // Stone 600 - secondary text
        textLight600: '#78716C',          // Stone 500 - tertiary text
        textLight400: '#A8A29E',          // Stone 400 - metadata

        // Light theme borders
        borderLight100: '#F5F5F4',        // Stone 100 - subtle
        borderLight200: '#E7E5E4',        // Stone 200 - default
        borderLight300: '#D6D3D1',        // Stone 300 - strong
      },
    },
    dark: {
      colors: {
        // Dark theme - True black + warm grays
        backgroundDark950: '#0C0A09',     // Stone 950 - primary background
        backgroundDark900: '#1C1917',     // Stone 900 - elevated surfaces
        backgroundDark800: '#292524',     // Stone 800 - cards/sections

        // Dark theme text - Warm whites
        textDark50: '#FAFAF9',            // Stone 50 - primary text
        textDark300: '#D6D3D1',           // Stone 300 - secondary text
        textDark400: '#A8A29E',           // Stone 400 - tertiary text
        textDark500: '#78716C',           // Stone 500 - metadata

        // Dark theme borders
        borderDark800: '#292524',         // Stone 800 - subtle
        borderDark700: '#44403C',         // Stone 700 - default
        borderDark600: '#57534E',         // Stone 600 - strong
      },
    },
  },
});

// Export config
export default gluestackUIConfig;