import React from 'react';
import { Box, Text } from '@gluestack-ui/themed';
import { radii, space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  timestamp?: string;
}

/**
 * MessageBubble - Chat message bubble component
 * Styled differently for user vs assistant messages
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  children,
  timestamp,
}) => {
  const { colors } = useThemedColors();
  const isUser = role === 'user';

  return (
    <Box
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxWidth="86%"
      bg={isUser ? colors.brand[600] : colors.surfaceMuted}
      borderRadius={radii.xl}
      px={space.md}
      py={space.sm}
      style={{
        borderTopRightRadius: isUser ? 4 : radii.xl,
        borderTopLeftRadius: isUser ? radii.xl : 4,
      }}
    >
      <Text
        color={isUser ? '#FFFFFF' : colors.textPrimary}
        fontSize={16}
        lineHeight={22}
      >
        {children}
      </Text>
      {timestamp && (
        <Text
          color={isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
          fontSize={11}
          mt={space.xxs}
        >
          {timestamp}
        </Text>
      )}
    </Box>
  );
};
