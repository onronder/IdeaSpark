import React, { useState } from 'react';
import {
  Modal,
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
} from '@gluestack-ui/themed';
import { AlertTriangle, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { radii, space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';
import { FilledInput } from './FilledInput';
import { PrimaryButton } from './PrimaryButton';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * DeleteAccountModal - Two-step account deletion confirmation
 * Requires typing "DELETE" and password for safety
 */
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const { colors } = useThemedColors();

  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setStep(1);
    setConfirmText('');
    setPassword('');
    setShowPassword(false);
    setErrors({});
    onClose();
  };

  const handleStepOne = () => {
    if (confirmText !== 'DELETE') {
      setErrors({ confirmText: 'You must type DELETE exactly to continue' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      setErrors({ password: 'Password is required' });
      return;
    }

    try {
      await onConfirm(password);
      handleClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Backdrop onPress={handleClose} />
      <Modal.Content
        bg={colors.surface}
        maxWidth={420}
        width="90%"
        borderRadius={radii.lg}
        p={space.lg}
      >
        <VStack space="lg">
          {/* Header */}
          <VStack space="xs">
            <HStack alignItems="center" space="xs">
              <AlertTriangle color={colors.error} size={24} />
              <Text
                color={colors.error}
                fontSize="$xl"
                fontWeight="$bold"
              >
                Delete Account
              </Text>
            </HStack>
            <Text color={colors.textSecondary} fontSize="$sm">
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
          </VStack>

          {step === 1 ? (
            <>
              {/* Step 1: Type DELETE to confirm */}
              <VStack space="md">
                <Box
                  bg={colors.errorLight || '#FEE2E2'}
                  borderRadius={radii.md}
                  p={space.md}
                >
                  <VStack space="sm">
                    <Text color={colors.error} fontSize="$sm" fontWeight="$semibold">
                      Warning: You will lose access to:
                    </Text>
                    <VStack space="xs" pl={space.sm}>
                      <Text color={colors.textSecondary} fontSize="$sm">
                        • All your ideas and conversations
                      </Text>
                      <Text color={colors.textSecondary} fontSize="$sm">
                        • Your subscription (if active)
                      </Text>
                      <Text color={colors.textSecondary} fontSize="$sm">
                        • All account data and settings
                      </Text>
                    </VStack>
                  </VStack>
                </Box>

                <FilledInput
                  label='Type "DELETE" to confirm'
                  value={confirmText}
                  onChangeText={(text) => {
                    setConfirmText(text);
                    if (errors.confirmText) {
                      setErrors({ ...errors, confirmText: '' });
                    }
                  }}
                  placeholder="DELETE"
                  error={errors.confirmText}
                  isRequired
                  isDisabled={isLoading}
                  autoCapitalize="characters"
                />
              </VStack>

              {/* Step 1 Actions */}
              <HStack space="md">
                <Box flex={1}>
                  <PrimaryButton
                    onPress={handleClose}
                    variant="outline"
                    isDisabled={isLoading}
                  >
                    Cancel
                  </PrimaryButton>
                </Box>
                <Box flex={1}>
                  <PrimaryButton
                    onPress={handleStepOne}
                    isDisabled={confirmText !== 'DELETE' || isLoading}
                    bg={colors.error}
                    sx={{
                      ':hover': {
                        bg: colors.error,
                        opacity: 0.9,
                      },
                    }}
                  >
                    Continue
                  </PrimaryButton>
                </Box>
              </HStack>
            </>
          ) : (
            <>
              {/* Step 2: Enter password */}
              <VStack space="md">
                <Text color={colors.textSecondary} fontSize="$sm">
                  To complete account deletion, please enter your password.
                </Text>

                <Box position="relative">
                  <FilledInput
                    label="Password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) {
                        setErrors({ ...errors, password: '' });
                      }
                    }}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    error={errors.password}
                    isRequired
                    isDisabled={isLoading}
                  />
                  <Pressable
                    position="absolute"
                    right={space.md}
                    top={42}
                    onPress={() => setShowPassword(!showPassword)}
                    p={space.xs}
                  >
                    {showPassword ? (
                      <EyeOff color={colors.textSecondary} size={20} />
                    ) : (
                      <Eye color={colors.textSecondary} size={20} />
                    )}
                  </Pressable>
                </Box>
              </VStack>

              {/* Step 2 Actions */}
              <HStack space="md">
                <Box flex={1}>
                  <PrimaryButton
                    onPress={() => setStep(1)}
                    variant="outline"
                    isDisabled={isLoading}
                  >
                    Back
                  </PrimaryButton>
                </Box>
                <Box flex={1}>
                  <PrimaryButton
                    onPress={handleSubmit}
                    isLoading={isLoading}
                    isDisabled={!password.trim() || isLoading}
                    bg={colors.error}
                    sx={{
                      ':hover': {
                        bg: colors.error,
                        opacity: 0.9,
                      },
                    }}
                  >
                    Delete Account
                  </PrimaryButton>
                </Box>
              </HStack>
            </>
          )}
        </VStack>
      </Modal.Content>
    </Modal>
  );
};
