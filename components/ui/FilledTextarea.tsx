import React from 'react';
import { Textarea, TextareaInput, VStack, Text, HStack } from '@gluestack-ui/themed';
import { radii } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';

interface FilledTextareaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  maxLength?: number;
  numberOfLines?: number;
  [key: string]: any;
}

/**
 * FilledTextarea - Multi-line input with filled style
 * For longer form inputs like descriptions and notes
 */
export const FilledTextarea: React.FC<FilledTextareaProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  isDisabled = false,
  isRequired = false,
  maxLength,
  numberOfLines = 4,
  ...props
}) => {
  const { colors } = useThemedColors();
  return (
    <VStack space="xs">
      {label && (
        <HStack justifyContent="space-between" alignItems="center">
          <Text
            color={colors.textPrimary}
            fontSize="$sm"
            fontWeight="$medium"
          >
            {label}
            {isRequired && (
              <Text color={colors.error} ml="$1">
                *
              </Text>
            )}
          </Text>
          {maxLength && (
            <Text
              color={colors.textSecondary}
              fontSize="$xs"
            >
              {value.length}/{maxLength}
            </Text>
          )}
        </HStack>
      )}
      <Textarea
        bg={colors.surfaceMuted}
        borderWidth={1}
        borderColor={error ? colors.error : colors.borderMuted}
        borderRadius={radii.md}
        isDisabled={isDisabled}
        h={numberOfLines * 24}
        sx={{
          ':focus': {
            borderColor: error ? colors.error : colors.brand[500],
            bg: colors.surface,
          },
        }}
        {...props}
      >
        <TextareaInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          color={colors.textPrimary}
          fontSize="$md"
          px="$4"
          py="$3"
          maxLength={maxLength}
          numberOfLines={numberOfLines}
          height={numberOfLines * 24}
          scrollEnabled={true}
        />
      </Textarea>
      {error && (
        <Text
          color={colors.error}
          fontSize="$sm"
          mt="$1"
        >
          {error}
        </Text>
      )}
    </VStack>
  );
};
