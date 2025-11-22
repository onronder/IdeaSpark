/**
 * Centralized gradient color definitions
 * Single source of truth for all gradient colors used throughout the app
 */

export const GRADIENTS = {
  // Background gradients
  background: {
    dark: {
      primary: ['#0F172A', '#1E1B4B', '#312E81', '#4338CA'],
      secondary: ['#1E1B4B', '#312E81', '#4338CA', '#6366F1'],
      accent: ['#0F172A', '#1E293B', '#334155'],
    },
    light: {
      primary: ['#F0F9FF', '#E0F2FE', '#DBEAFE', '#FFFFFF'],
      secondary: ['#EEF2FF', '#E0E7FF', '#C7D2FE', '#FFFFFF'],
      accent: ['#F8FAFC', '#F1F5F9', '#FFFFFF'],
    },
  },

  // Orb/Icon gradients
  orb: {
    primary: ['#6366F1', '#8B5CF6', '#EC4899'],
    secondary: ['#3B82F6', '#6366F1', '#8B5CF6'],
    success: ['#10B981', '#14B8A6', '#06B6D4'],
    warning: ['#F59E0B', '#EF4444', '#EC4899'],
  },
} as const;

/**
 * Get background gradient colors based on theme and variant
 */
export function getBackgroundGradient(
  colorMode: 'dark' | 'light',
  variant: 'primary' | 'secondary' | 'accent' = 'primary'
): string[] {
  return GRADIENTS.background[colorMode][variant];
}

/**
 * Get orb gradient colors based on variant
 */
export function getOrbGradient(
  variant: 'primary' | 'secondary' | 'success' | 'warning' = 'primary'
): string[] {
  return GRADIENTS.orb[variant];
}
