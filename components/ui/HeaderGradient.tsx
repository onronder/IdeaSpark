import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, HStack, VStack, Text } from '@gluestack-ui/themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, gradients, type as typography } from '@/theme/tokens';
import { GhostPillButton } from './GhostPillButton';

interface HeaderGradientProps {
  greeting?: string;
  name: string;
  usageText?: string;
  onUpgrade?: () => void;
  showUpgradeButton?: boolean;
}

/**
 * HeaderGradient - Branded header with gradient background
 * Displays greeting, user name, usage info, and optional upgrade CTA
 */
export const HeaderGradient: React.FC<HeaderGradientProps> = ({
  greeting = 'Good evening',
  name,
  usageText,
  onUpgrade,
  showUpgradeButton = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Box>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: space.lg,
          paddingHorizontal: space.lg,
        }}
      >
        <HStack alignItems="center" justifyContent="space-between">
          <VStack flex={1} space="sm">
            <Text
              color={colors.textSecondary}
              fontSize="$sm"
              lineHeight={20}
            >
              {greeting},
            </Text>
            <Text
              color={colors.textPrimary}
              fontSize="$3xl"
              fontWeight="700"
              numberOfLines={1}
              ellipsizeMode="tail"
              lineHeight={36}
            >
              {name}
            </Text>
            {usageText && (
              <Text
                color={colors.textSecondary}
                fontSize="$sm"
                mt="$2"
                numberOfLines={1}
                ellipsizeMode="tail"
                lineHeight={20}
              >
                {usageText}
              </Text>
            )}
          </VStack>
          {showUpgradeButton && onUpgrade && (
            <GhostPillButton
              onPress={onUpgrade}
              variant="outline"
              size="sm"
            >
              UPGRADE
            </GhostPillButton>
          )}
        </HStack>
      </LinearGradient>
    </Box>
  );
};
