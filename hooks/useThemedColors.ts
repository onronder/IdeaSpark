import { useTheme } from '@/contexts/ThemeContext';
import { colors as lightColors, darkColors } from '@/theme/tokens';

/**
 * useThemedColors
 * Returns the design-token color palette adjusted for the current color mode.
 * Light mode uses `colors`, dark mode overrides surface/text/border keys
 * with `darkColors` while keeping brand/semantic colors the same.
 */
export const useThemedColors = () => {
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  const colors = isDark
    ? {
        ...lightColors,
        surface: darkColors.surface,
        surfaceMuted: darkColors.surfaceMuted,
        textPrimary: darkColors.textPrimary,
        textSecondary: darkColors.textSecondary,
        borderMuted: darkColors.borderMuted,
      }
    : lightColors;

  return { colors, isDark };
};

