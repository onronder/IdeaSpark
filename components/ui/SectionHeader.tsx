import React from 'react';
import { HStack, Heading, Button, ButtonText } from '@gluestack-ui/themed';

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => {
  return (
    <HStack justifyContent="space-between" alignItems="center" mb="$4">
      <Heading size="lg">{title}</Heading>
      {action && (
        <Button variant="link" onPress={action.onPress} size="sm">
          <ButtonText>{action.label}</ButtonText>
        </Button>
      )}
    </HStack>
  );
};
