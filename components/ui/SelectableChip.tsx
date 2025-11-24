import React from 'react';
import { Pressable, Text } from '@gluestack-ui/themed';
import { colors, radii, space } from '@/theme/tokens';

interface SelectableChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  isDisabled?: boolean;
}

/**
 * SelectableChip - Toggleable chip for categories, filters, and options
 * Active state uses filled brand color, inactive uses outline
 */
export const SelectableChip: React.FC<SelectableChipProps> = ({
  label,
  active,
  onPress,
  isDisabled = false,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      px={space.md}
      py={space.xs}
      mr={space.xs}
      mb={space.xs}
      borderRadius={radii['2xl']}
      borderWidth={1}
      borderColor={active ? colors.brand[300] : colors.borderMuted}
      bg={active ? colors.brand[50] : colors.surface}
      opacity={isDisabled ? 0.5 : 1}
      sx={{
        ':active': {
          transform: [{ scale: 0.96 }],
        },
      }}
    >
      <Text
        color={active ? colors.brand[700] : colors.textPrimary}
        fontWeight={active ? '600' : '500'}
        fontSize={14}
      >
        {label}
      </Text>
    </Pressable>
  );
};
