import React from 'react';
import { HStack, VStack, Text, Switch, Box } from '@gluestack-ui/themed';
import { colors, space, radii } from '@/theme/tokens';
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
 * Production-grade with icon containers matching SettingsRow
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
    <HStack py={space.md} space="md" alignItems="center" justifyContent="space-between" minHeight={48}>
      <HStack space="md" alignItems="center" flex={1}>
        {Icon && (
          <Box
            width={40}
            height={40}
            borderRadius={radii.full}
            bg={colors.surfaceMuted}
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <Icon color={colors.textSecondary} size={22} />
          </Box>
        )}
        <VStack flex={1} space="xxs">
          <Text
            color={colors.textPrimary}
            fontSize="$md"
            fontWeight="$medium"
          >
            {label}
          </Text>
          {description && (
            <Text
              color={colors.textSecondary}
              fontSize="$sm"
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
