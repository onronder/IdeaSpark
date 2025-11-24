import React from 'react';
import { Pressable, HStack, Text, Box } from '@gluestack-ui/themed';
import { ChevronRight } from 'lucide-react-native';
import { colors, space, radii } from '@/theme/tokens';
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
 * Production-grade with icon containers, proper touch targets, and spacing
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
      py={space.md}
      px={space.sm}
      minHeight={48}
      opacity={isDisabled ? 0.5 : 1}
      sx={{
        ':active': {
          opacity: 0.6,
        },
      }}
    >
      <HStack space="md" alignItems="center" justifyContent="space-between">
        <HStack space="md" alignItems="center" flex={1}>
          {Icon && (
            <Box
              width={40}
              height={40}
              borderRadius={radii.full}
              bg={destructive ? colors.errorLight : colors.surfaceMuted}
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Icon color={destructive ? colors.error : colors.textSecondary} size={22} />
            </Box>
          )}
          <Text
            color={destructive ? colors.error : colors.textPrimary}
            fontSize="$md"
            fontWeight="$medium"
            flex={1}
          >
            {label}
          </Text>
        </HStack>
        <HStack space="xs" alignItems="center">
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
