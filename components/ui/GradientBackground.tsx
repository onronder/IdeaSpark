import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { getBackgroundGradient } from '@/constants/gradients';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'primary'
}) => {
  const { colorMode } = useTheme();

  return (
    <LinearGradient
      colors={getBackgroundGradient(colorMode, variant)}
      style={{ flex: 1 }}
    >
      {children}
    </LinearGradient>
  );
};
