import React from 'react';
import { Card, VStack, Text, Heading } from '@gluestack-ui/themed';
import { useTheme } from '@/contexts/ThemeContext';

interface StatCardProps {
  label: string;
  value: string | number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value }) => {
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <Card
      p="$4"
      variant="elevated"
      bg={isDark ? "$backgroundDark800" : "$backgroundLight100"}
    >
      <VStack space="xs">
        <Text
          size="xs"
          color={isDark ? "$textDark400" : "$textLight600"}
          textTransform="uppercase"
          letterSpacing="$md"
        >
          {label}
        </Text>
        <Heading size="2xl" color={isDark ? "$textDark50" : "$textLight900"}>
          {value}
        </Heading>
      </VStack>
    </Card>
  );
};
