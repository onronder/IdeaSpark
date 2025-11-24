import React from 'react';
import { Pressable, Text } from '@gluestack-ui/themed';
import { colors, radii } from '@/theme/tokens';

interface GhostPillButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
  variant?: 'outline' | 'ghost';
  size?: 'sm' | 'md';
  [key: string]: any;
}

/**
 * GhostPillButton - Secondary action button with pill shape
 * Used for secondary CTAs, navigation, and less prominent actions
 */
export const GhostPillButton: React.FC<GhostPillButtonProps> = ({
  children,
  onPress,
  isDisabled = false,
  variant = 'outline',
  size = 'md',
  ...props
}) => {
  const sizeStyles = {
    sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 12 },
    md: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      borderWidth={variant === 'outline' ? 1 : 0}
      borderColor={variant === 'outline' ? colors.brand[500] : 'transparent'}
      bg={variant === 'ghost' ? colors.surfaceMuted : 'transparent'}
      borderRadius={radii['2xl']}
      opacity={isDisabled ? 0.5 : 1}
      style={{
        paddingVertical: sizeStyles[size].paddingVertical,
        paddingHorizontal: sizeStyles[size].paddingHorizontal,
      }}
      sx={{
        ':active': {
          transform: [{ scale: 0.98 }],
        },
      }}
      {...props}
    >
      <Text
        color={colors.brand[700]}
        fontWeight="600"
        fontSize={sizeStyles[size].fontSize}
        textAlign="center"
      >
        {children}
      </Text>
    </Pressable>
  );
};
