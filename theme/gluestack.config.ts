/**
 * Extended Gluestack configuration for IdeaSpark 2025 UI Redesign
 * Integrates new design tokens with existing config
 */

import { gluestackUIConfig } from '../gluestack-ui.config';
import { colors, radii, space } from './tokens';

/**
 * Extend the existing gluestack config with new brand tokens
 * This maintains backward compatibility while introducing the new design system
 */
export const extendedConfig = {
  ...gluestackUIConfig,
  tokens: {
    ...gluestackUIConfig.tokens,
    colors: {
      ...gluestackUIConfig.tokens.colors,
      // Add new brand palette (primary color for 2025 redesign)
      brand50: colors.brand[50],
      brand100: colors.brand[100],
      brand200: colors.brand[200],
      brand300: colors.brand[300],
      brand400: colors.brand[400],
      brand500: colors.brand[500],
      brand600: colors.brand[600],
      brand700: colors.brand[700],
      brand800: colors.brand[800],
      brand900: colors.brand[900],

      // New semantic tokens
      surface: colors.surface,
      surfaceMuted: colors.surfaceMuted,
      textPrimary: colors.textPrimary,
      textSecondary: colors.textSecondary,
      borderMuted: colors.borderMuted,
      success: colors.success,
      successLight: colors.successLight,
      warning: colors.warning,
      warningLight: colors.warningLight,
      error: colors.error,
      errorLight: colors.errorLight,
    },
    radii: {
      ...gluestackUIConfig.tokens.radii,
      ...radii,
    },
    space: {
      ...gluestackUIConfig.tokens.space,
      ...space,
    },
  },
};

export default extendedConfig;
