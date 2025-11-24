import React from 'react';
import { Pressable, HStack, Text } from '@gluestack-ui/themed';
import { ChevronRight } from 'lucide-react-native';
import { colors, space } from '@/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';

interface SettingsRowProps {
  icon?: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  isDisabled?: boolean;
}

/**
 * SettingsRow - Navigation row for settings screens
 * Includes optional icon, label, value, and chevron
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  label,
  value,
  onPress,
  destructive = false,
  isDisabled = false,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled || !onPress}
      py="$4"
      opacity={isDisabled ? 0.5 : 1}
      sx={{
        ':active': {
          opacity: 0.6,
        },
      }}
    >
      <HStack space="$4" alignItems="center" justifyContent="space-between">
        <HStack space="$4" alignItems="center" flex={1}>
          {Icon && <Icon color={destructive ? colors.error : colors.textSecondary} size={20} />}
          <Text
            color={destructive ? colors.error : colors.textPrimary}
            fontSize="$md"
            fontWeight="$medium"
            flex={1}
          >
            {label}
          </Text>
        </HStack>
        <HStack space="$2" alignItems="center">
          {value && (
            <Text
              color={colors.textSecondary}
              fontSize="$sm"
            >
              {value}
            </Text>
          )}
          {onPress && <ChevronRight color={colors.textSecondary} size={20} />}
        </HStack>
      </HStack>
    </Pressable>
  );
};
