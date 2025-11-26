import React, { useState } from 'react';
import {
  Modal,
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
} from '@gluestack-ui/themed';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { radii, space } from '@/theme/tokens';
import { useThemedColors } from '@/hooks/useThemedColors';
import { FilledInput } from './FilledInput';
import { PrimaryButton } from './PrimaryButton';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * ChangePasswordModal - Secure password change flow
 * Validates password strength and confirms new password
 */
export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
  isLoading = false,
}) => {
  const { colors } = useThemedColors();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmit(currentPassword, newPassword);
      handleClose();
      onSuccess();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const getPasswordStrength = (password: string): { text: string; color: string } => {
    if (password.length === 0) return { text: '', color: '' };
    if (password.length < 8) return { text: 'Weak', color: colors.error };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { text: 'Medium', color: colors.warning };
    }
    return { text: 'Strong', color: colors.success };
  };

  const strength = getPasswordStrength(newPassword);

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
              <Lock color={colors.brand[500]} size={24} />
              <Text
                color={colors.textPrimary}
                fontSize="$xl"
                fontWeight="$bold"
              >
                Change Password
              </Text>
            </HStack>
            <Text color={colors.textSecondary} fontSize="$sm">
              Enter your current password and choose a new secure password
            </Text>
          </VStack>

          {/* Form */}
          <VStack space="md">
            {/* Current Password */}
            <Box position="relative">
              <FilledInput
                label="Current Password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (errors.currentPassword) {
                    setErrors({ ...errors, currentPassword: '' });
                  }
                }}
                placeholder="Enter current password"
                secureTextEntry={!showCurrentPassword}
                error={errors.currentPassword}
                isRequired
                isDisabled={isLoading}
              />
              <Pressable
                position="absolute"
                right={space.md}
                top={label => 42} // Account for label height
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                p={space.xs}
              >
                {showCurrentPassword ? (
                  <EyeOff color={colors.textSecondary} size={20} />
                ) : (
                  <Eye color={colors.textSecondary} size={20} />
                )}
              </Pressable>
            </Box>

            {/* New Password */}
            <Box position="relative">
              <FilledInput
                label="New Password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) {
                    setErrors({ ...errors, newPassword: '' });
                  }
                }}
                placeholder="Enter new password"
                secureTextEntry={!showNewPassword}
                error={errors.newPassword}
                isRequired
                isDisabled={isLoading}
              />
              <Pressable
                position="absolute"
                right={space.md}
                top={42}
                onPress={() => setShowNewPassword(!showNewPassword)}
                p={space.xs}
              >
                {showNewPassword ? (
                  <EyeOff color={colors.textSecondary} size={20} />
                ) : (
                  <Eye color={colors.textSecondary} size={20} />
                )}
              </Pressable>
              {strength.text && (
                <Text
                  color={strength.color}
                  fontSize="$xs"
                  fontWeight="$medium"
                  mt={space.xs}
                >
                  Password strength: {strength.text}
                </Text>
              )}
            </Box>

            {/* Confirm Password */}
            <Box position="relative">
              <FilledInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: '' });
                  }
                }}
                placeholder="Re-enter new password"
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword}
                isRequired
                isDisabled={isLoading}
              />
              <Pressable
                position="absolute"
                right={space.md}
                top={42}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                p={space.xs}
              >
                {showConfirmPassword ? (
                  <EyeOff color={colors.textSecondary} size={20} />
                ) : (
                  <Eye color={colors.textSecondary} size={20} />
                )}
              </Pressable>
            </Box>
          </VStack>

          {/* Actions */}
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
                onPress={handleSubmit}
                isLoading={isLoading}
                isDisabled={isLoading}
              >
                Change Password
              </PrimaryButton>
            </Box>
          </HStack>
        </VStack>
      </Modal.Content>
    </Modal>
  );
};
