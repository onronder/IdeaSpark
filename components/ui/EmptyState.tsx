import React from 'react';
import { VStack, Heading, Text, Button, ButtonText } from '@gluestack-ui/themed';
import { useTheme } from '@/contexts/ThemeContext';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const { colorMode } = useTheme();
  const isDark = colorMode === 'dark';

  return (
    <VStack space="md" alignItems="center" py="$12" px="$6">
      {icon}
      <Heading size="md" textAlign="center" color={isDark ? "$textDark50" : "$textLight900"}>
        {title}
      </Heading>
      {description && (
        <Text
          size="md"
          textAlign="center"
          color={isDark ? "$textDark300" : "$textLight600"}
        >
          {description}
        </Text>
      )}
      {action && (
        <Button onPress={action.onPress} mt="$4">
          <ButtonText>{action.label}</ButtonText>
        </Button>
      )}
    </VStack>
  );
};
