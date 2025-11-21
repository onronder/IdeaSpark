import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'primary'
}) => {
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  const getGradientColors = () => {
    if (variant === 'primary') {
      return isDark
        ? ['#0F172A', '#1E1B4B', '#312E81', '#4338CA']
        : ['#F0F9FF', '#E0F2FE', '#DBEAFE', '#FFFFFF'];
    } else if (variant === 'secondary') {
      return isDark
        ? ['#1E1B4B', '#312E81', '#4338CA', '#6366F1']
        : ['#EEF2FF', '#E0E7FF', '#C7D2FE', '#FFFFFF'];
    } else {
      return isDark
        ? ['#0F172A', '#1E293B', '#334155']
        : ['#F8FAFC', '#F1F5F9', '#FFFFFF'];
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
};
