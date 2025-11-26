import React from 'react';
import { HStack, Text } from '@gluestack-ui/themed';
import { radii, space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

interface UsagePillProps {
  text: string;
  variant?: 'default' | 'warning' | 'pro';
}

/**
 * UsagePill - Display usage limits and plan info
 * Compact pill showing quota information
 */
export const UsagePill: React.FC<UsagePillProps> = ({
  text,
  variant = 'default',
}) => {
  const { colors } = useThemedColors();
  const config = {
    default: {
      bg: colors.surfaceMuted,
      textColor: colors.textSecondary,
    },
    warning: {
      bg: colors.warningLight,
      textColor: colors.warning,
    },
    pro: {
      bg: colors.brand[50],
      textColor: colors.brand[700],
    },
  };

  const { bg, textColor } = config[variant];

  return (
    <HStack
      bg={bg}
      borderRadius={radii['2xl']}
      px={space.sm}
      py={space.xxs}
      alignItems="center"
    >
      <Text
        color={textColor}
        fontSize={12}
        fontWeight="500"
      >
        {text}
      </Text>
    </HStack>
  );
};
