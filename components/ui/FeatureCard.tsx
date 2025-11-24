import React from 'react';
import { HStack, VStack, Text, Box, Pressable } from '@gluestack-ui/themed';
import { colors, radii, space, shadows } from '@/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress?: () => void;
}

/**
 * FeatureCard - Card with icon, title, and description
 * Used to showcase features and capabilities
 */
export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  onPress,
}) => {
  const Component = onPress ? Pressable : Box;
  return (
    <Component
      // @ts-ignore
      onPress={onPress}
      bg={colors.surface}
      borderRadius={radii.lg}
      p={space.lg}
      {...shadows.card}
    >
      <HStack space={space.md} alignItems="flex-start">
        <Box
          bg={colors.brand[50]}
          borderRadius={radii.md}
          p={space.sm}
        >
          <Icon color={colors.brand[600]} size={24} />
        </Box>
        <VStack flex={1} space={space.xxs}>
          <Text
            color={colors.textPrimary}
            fontSize="$lg"
            fontWeight="$semibold"
          >
            {title}
          </Text>
          <Text
            color={colors.textSecondary}
            fontSize="$sm"
          >
            {description}
          </Text>
        </VStack>
      </HStack>
    </Component>
  );
};
