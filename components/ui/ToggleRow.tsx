import React from 'react';
import { HStack, VStack, Text, Switch } from '@gluestack-ui/themed';
import { colors, space } from '@/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';

interface ToggleRowProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDisabled?: boolean;
}

/**
 * ToggleRow - Settings row with toggle switch
 * For boolean preferences and feature toggles
 */
export const ToggleRow: React.FC<ToggleRowProps> = ({
  icon: Icon,
  label,
  description,
  value,
  onValueChange,
  isDisabled = false,
}) => {
  return (
    <HStack py={space.md} space={space.md} alignItems="center" justifyContent="space-between">
      <HStack space={space.md} alignItems="center" flex={1}>
        {Icon && <Icon color={colors.textSecondary} size={20} />}
        <VStack flex={1} space={space.xxs}>
          <Text
            color={colors.textPrimary}
            fontSize={16}
            fontWeight="500"
          >
            {label}
          </Text>
          {description && (
            <Text
              color={colors.textSecondary}
              fontSize={13}
              lineHeight={18}
            >
              {description}
            </Text>
          )}
        </VStack>
      </HStack>
      <Switch
        value={value}
        onValueChange={onValueChange}
        isDisabled={isDisabled}
        trackColor={{ false: colors.borderMuted, true: colors.brand[500] }}
        thumbColor={colors.surface}
      />
    </HStack>
  );
};
