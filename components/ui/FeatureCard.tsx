import React from 'react';
import { HStack, VStack, Text, Box, Pressable } from '@gluestack-ui/themed';
import { radii, space, shadows } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';
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
  const { colors } = useThemedColors();
  const Component = onPress ? Pressable : Box;
  return (
    <Component
      // @ts-ignore
      onPress={onPress}
      bg={colors.surface}
      borderRadius={radii.lg}
      px={space.md}
      py={space.md}
      {...shadows.card}
    >
      <HStack space={space.sm} alignItems="center">
        <Box
          bg={colors.brand[50]}
          borderRadius={radii.md}
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon color={colors.brand[600]} size={20} strokeWidth={2} />
        </Box>
        <VStack flex={1} space={space.xxs} flexShrink={1}>
          <Text
            color={colors.textPrimary}
            fontSize="$md"
            fontWeight="$semibold"
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            color={colors.textSecondary}
            fontSize="$sm"
            numberOfLines={3}
            lineHeight="$sm"
          >
            {description}
          </Text>
        </VStack>
      </HStack>
    </Component>
  );
};
