import React from 'react';
import { HStack, VStack, Text, Box, Pressable } from '@gluestack-ui/themed';
import { Info, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react-native';
import { colors, radii, space } from '@/theme/tokens';

interface InlineNoticeProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  onDismiss?: () => void;
}

/**
 * InlineNotice - Inline feedback component for success, warnings, errors, and info
 * Displays contextual messages with optional actions
 */
export const InlineNotice: React.FC<InlineNoticeProps> = ({
  type,
  title,
  message,
  action,
  onDismiss,
}) => {
  const config = {
    info: {
      bg: colors.brand[50],
      borderColor: colors.brand[200],
      iconColor: colors.brand[600],
      textColor: colors.brand[900],
      Icon: Info,
    },
    success: {
      bg: colors.successLight,
      borderColor: colors.success,
      iconColor: colors.success,
      textColor: colors.textPrimary,
      Icon: CheckCircle,
    },
    warning: {
      bg: colors.warningLight,
      borderColor: colors.warning,
      iconColor: colors.warning,
      textColor: colors.textPrimary,
      Icon: AlertTriangle,
    },
    error: {
      bg: colors.errorLight,
      borderColor: colors.error,
      iconColor: colors.error,
      textColor: colors.textPrimary,
      Icon: XCircle,
    },
  };

  const { bg, borderColor, iconColor, textColor, Icon } = config[type];

  return (
    <Box
      bg={bg}
      borderWidth={1}
      borderColor={borderColor}
      borderRadius={radii.md}
      p={space.md}
    >
      <HStack space="sm" alignItems="flex-start">
        <Icon color={iconColor} size={20} style={{ marginTop: 2 }} />
        <VStack flex={1} space="xxs">
          {title && (
            <Text
              color={textColor}
              fontSize="$sm"
              fontWeight="$semibold"
              flexShrink={1}
            >
              {title}
            </Text>
          )}
          <Text
            color={textColor}
            fontSize="$sm"
            flexShrink={1}
          >
            {message}
          </Text>
          {action && (
            <Pressable onPress={action.onPress} mt="$2">
              <Text
                color={iconColor}
                fontSize="$sm"
                fontWeight="$semibold"
                textDecorationLine="underline"
              >
                {action.label}
              </Text>
            </Pressable>
          )}
        </VStack>
        {onDismiss && (
          <Pressable onPress={onDismiss} flexShrink={0}>
            <X color={textColor} size={18} />
          </Pressable>
        )}
      </HStack>
    </Box>
  );
};
