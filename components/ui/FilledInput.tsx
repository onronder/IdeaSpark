import React from 'react';
import { Input, InputField, InputIcon, InputSlot, VStack, Text } from '@gluestack-ui/themed';
import { colors, radii, space } from '@/theme/tokens';
import type { LucideIcon } from 'lucide-react-native';

interface FilledInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  icon?: LucideIcon;
  isDisabled?: boolean;
  isRequired?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  [key: string]: any;
}

/**
 * FilledInput - Filled style input with optional icon and label
 * Modern input design with subtle background and minimal borders
 */
export const FilledInput: React.FC<FilledInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  icon: Icon,
  isDisabled = false,
  isRequired = false,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  ...props
}) => {
  return (
    <VStack space="xs">
      {label && (
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
      )}
      <Input
        bg={colors.surfaceMuted}
        borderWidth={1}
        borderColor={error ? colors.error : colors.borderMuted}
        borderRadius={radii.md}
        isDisabled={isDisabled}
        h={48}
        sx={{
          ':focus': {
            borderColor: error ? colors.error : colors.brand[500],
            bg: colors.surface,
          },
        }}
        {...props}
      >
        {Icon && (
          <InputSlot pl="$4">
            <InputIcon as={Icon} color={colors.textSecondary} />
          </InputSlot>
        )}
        <InputField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          color={colors.textPrimary}
          fontSize="$md"
          px="$4"
          py="$3"
          height={48}
        />
      </Input>
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
