import React from 'react';
import { VStack, Text, Box } from '@gluestack-ui/themed';
import { space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';
import { PrimaryButton } from './PrimaryButton';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * EmptyState - Display when lists or sections have no content
 * Includes optional icon, descriptive text, and CTA
 */
export const EmptyStateNew: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  const { colors } = useThemedColors();
  return (
    <VStack space={space.lg} alignItems="center" py={space['2xl']} px={space.xl}>
      {Icon && (
        <Box
          bg={colors.surfaceMuted}
          borderRadius={64}
          p={space.lg}
        >
          <Icon color={colors.textSecondary} size={48} />
        </Box>
      )}
      <VStack space={space.xs} alignItems="center">
        <Text
          color={colors.textPrimary}
          fontSize="$xl"
          fontWeight="$semibold"
          textAlign="center"
        >
          {title}
        </Text>
        {description && (
          <Text
            color={colors.textSecondary}
            fontSize="$md"
            textAlign="center"
            maxWidth={280}
          >
            {description}
          </Text>
        )}
      </VStack>
      {action && (
        <PrimaryButton onPress={action.onPress}>
          {action.label}
        </PrimaryButton>
      )}
    </VStack>
  );
};
