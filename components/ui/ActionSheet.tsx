import React from 'react';
import { Modal } from '@gluestack-ui/themed';
import { Box, VStack, Text, Pressable } from '@gluestack-ui/themed';
import { radii, space, shadows } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

/**
 * ActionSheet - Bottom sheet with action options
 * Native-feeling action picker for contextual actions
 */
export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  options,
}) => {
  const insets = useSafeAreaInsets();
   const { colors } = useThemedColors();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Backdrop onPress={onClose} />
      <Modal.Content
        bg="transparent"
        position="absolute"
        bottom={0}
        left={0}
        right={0}
      >
        <Box
          bg={colors.surface}
          borderTopLeftRadius={radii.lg}
          borderTopRightRadius={radii.lg}
          pb={insets.bottom + space.md}
          pt={space.lg}
          px={space.lg}
          {...shadows.lg}
        >
          {title && (
            <Text
              color={colors.textSecondary}
              fontSize={13}
              fontWeight="600"
              textAlign="center"
              mb={space.md}
            >
              {title}
            </Text>
          )}
          <VStack space={space.xs}>
            {options.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  option.onPress();
                  onClose();
                }}
                disabled={option.disabled}
                bg={colors.surfaceMuted}
                borderRadius={radii.md}
                py={space.md}
                px={space.lg}
                opacity={option.disabled ? 0.5 : 1}
                sx={{
                  ':active': {
                    opacity: 0.6,
                  },
                }}
              >
                <Text
                  color={option.destructive ? colors.error : colors.textPrimary}
                  fontSize={16}
                  fontWeight="500"
                  textAlign="center"
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={onClose}
              bg={colors.surface}
              borderWidth={1}
              borderColor={colors.borderMuted}
              borderRadius={radii.md}
              py={space.md}
              px={space.lg}
              mt={space.xs}
            >
              <Text
                color={colors.textPrimary}
                fontSize={16}
                fontWeight="600"
                textAlign="center"
              >
                Cancel
              </Text>
            </Pressable>
          </VStack>
        </Box>
      </Modal.Content>
    </Modal>
  );
};
