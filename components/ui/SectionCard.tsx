import React from 'react';
import { Box } from '@gluestack-ui/themed';
import { colors, radii, space, shadows } from '@/theme/tokens';

interface SectionCardProps {
  children: React.ReactNode;
  noPadding?: boolean;
  [key: string]: any;
}

/**
 * SectionCard - Generic container with soft shadow and rounded corners
 * Base card component for grouping content
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  children,
  noPadding = false,
  ...props
}) => {
  return (
    <Box
      bg={colors.surface}
      borderRadius={radii.lg}
      p={noPadding ? 0 : space.lg}
      {...shadows.card}
      {...props}
    >
      {children}
    </Box>
  );
};
