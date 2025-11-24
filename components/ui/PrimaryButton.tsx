import React from 'react';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { colors, radii } from '@/theme/tokens';

interface PrimaryButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  [key: string]: any;
}

/**
 * PrimaryButton - Main CTA button with brand styling
 * Follows 2025 UI redesign principles with rounded corners and generous padding
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onPress,
  isDisabled = false,
  isLoading = false,
  variant = 'solid',
  size = 'lg',
  ...props
}) => {
  const sizeStyles = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 16 },
    lg: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16 },
  };

  return (
    <Button
      onPress={onPress}
      isDisabled={isDisabled || isLoading}
      bg={variant === 'solid' ? colors.brand[500] : 'transparent'}
      borderWidth={variant === 'outline' ? 1 : 0}
      borderColor={variant === 'outline' ? colors.brand[500] : undefined}
      borderRadius={radii.xl}
      opacity={isDisabled ? 0.5 : 1}
      style={{
        paddingVertical: sizeStyles[size].paddingVertical,
        paddingHorizontal: sizeStyles[size].paddingHorizontal,
      }}
      {...props}
    >
      {isLoading && <ButtonSpinner color={variant === 'solid' ? '#FFFFFF' : colors.brand[500]} />}
      <ButtonText
        color={variant === 'solid' ? '#FFFFFF' : colors.brand[700]}
        fontWeight="600"
        fontSize={sizeStyles[size].fontSize}
        textAlign="center"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {children}
      </ButtonText>
    </Button>
  );
};
