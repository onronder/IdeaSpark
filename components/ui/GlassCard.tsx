import React from 'react';
import { Box } from '@gluestack-ui/themed';
import { useTheme } from '@/contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  opacity?: number;
  blur?: boolean;
  [key: string]: any;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  opacity = 0.05,
  blur = true,
  ...props
}) => {
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <Box
      bg={isDark ? `rgba(255,255,255,${opacity})` : `rgba(255,255,255,${opacity + 0.85})`}
      borderRadius="$3xl"
      borderWidth={1}
      borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)"}
      shadowColor="$black"
      shadowOffset={{ width: 0, height: 10 }}
      shadowOpacity={isDark ? 0.3 : 0.1}
      shadowRadius={20}
      overflow="hidden"
      {...props}
    >
      {children}
    </Box>
  );
};
