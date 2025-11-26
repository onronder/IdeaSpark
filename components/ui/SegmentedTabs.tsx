import React from 'react';
import { HStack, Pressable, Text } from '@gluestack-ui/themed';
import { radii, space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

interface Tab {
  key: string;
  label: string;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

/**
 * SegmentedTabs - Segmented control for switching between views
 * Modern tab switcher with pill-style active indicator
 */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const { colors } = useThemedColors();
  return (
    <HStack
      bg={colors.surfaceMuted}
      borderRadius={radii.md}
      p="$1"
      space="$1"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            flex={1}
            bg={isActive ? colors.surface : 'transparent'}
            borderRadius={radii.sm}
            py={space.xs}
            px={space.md}
            sx={{
              ':active': {
                opacity: 0.8,
              },
            }}
            {...(isActive && {
              shadowColor: colors.textPrimary,
              shadowOpacity: 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            })}
          >
            <Text
              color={isActive ? colors.textPrimary : colors.textSecondary}
              fontSize="$sm"
              fontWeight={isActive ? '$semibold' : '$medium'}
              textAlign="center"
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </HStack>
  );
};
