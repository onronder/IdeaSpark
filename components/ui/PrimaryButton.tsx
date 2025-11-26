import React from 'react';
import { Button, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { radii } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

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
 * Production-grade with proper text rendering and auto-height
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
  const { colors } = useThemedColors();

  const sizeProps = {
    sm: { py: 8, px: 16, fontSize: 14 },
    md: { py: 12, px: 20, fontSize: 16 },
    lg: { py: 14, px: 24, fontSize: 16 },
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
      w="100%"
      h="auto"
      minHeight={48}
      alignItems="center"
      justifyContent="center"
      py={sizeProps[size].py}
      px={sizeProps[size].px}
      {...props}
    >
      {isLoading && <ButtonSpinner color={variant === 'solid' ? '#FFFFFF' : colors.brand[500]} />}
      <ButtonText
        color={variant === 'solid' ? '#FFFFFF' : colors.brand[700]}
        fontWeight="600"
        fontSize={sizeProps[size].fontSize}
        textAlign="center"
      >
        {children}
      </ButtonText>
    </Button>
  );
};
