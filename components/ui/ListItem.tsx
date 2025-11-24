import React from 'react';
import { Pressable, HStack, VStack, Text, Box } from '@gluestack-ui/themed';
import { colors, radii, space } from '@/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';

interface ListItemProps {
  icon?: LucideIcon;
  title: string;
  caption?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  isDisabled?: boolean;
}

/**
 * ListItem - Reusable list item with icon, title, caption, and right element
 * Foundation for conversation lists, settings rows, etc.
 */
export const ListItem: React.FC<ListItemProps> = ({
  icon: Icon,
  title,
  caption,
  rightElement,
  onPress,
  isDisabled = false,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled || !onPress}
      bg={colors.surface}
      borderRadius={radii.md}
      p={space.md}
      opacity={isDisabled ? 0.5 : 1}
      sx={{
        ':active': {
          bg: colors.surfaceMuted,
        },
      }}
    >
      <HStack space={space.md} alignItems="center">
        {Icon && (
          <Box
            bg={colors.surfaceMuted}
            borderRadius={radii.sm}
            p={space.xs}
          >
            <Icon color={colors.brand[600]} size={20} />
          </Box>
        )}
        <VStack flex={1} space={space.xxs}>
          <Text
            color={colors.textPrimary}
            fontSize="$md"
            fontWeight="$medium"
          >
            {title}
          </Text>
          {caption && (
            <Text
              color={colors.textSecondary}
              fontSize="$sm"
            >
              {caption}
            </Text>
          )}
        </VStack>
        {rightElement}
      </HStack>
    </Pressable>
  );
};
