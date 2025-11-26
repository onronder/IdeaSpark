import React, { useState, useEffect } from "react";
import { Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Box,
  VStack,
  Text,
  Pressable,
} from "@gluestack-ui/themed";
import {
  Lock,
  CheckCircle2,
} from "lucide-react-native";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  FilledInput,
  PrimaryButton,
  InlineNotice,
  SectionCard,
} from "@/components/ui";
import { space } from "@/theme/tokens";
import { useThemedColors } from "@/hooks/useThemedColors";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resetPasswordWithToken } = useAuth();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler("ResetPasswordScreen");
  const insets = useSafeAreaInsets();
  const { colors } = useThemedColors();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Extract token from URL params
  useEffect(() => {
    // Handle both access_token (from Supabase deep link) and token (from custom backend)
    const token = params.access_token || params.token;

    if (token) {
      setAccessToken(Array.isArray(token) ? token[0] : token);
      logger.logUserAction('reset_password_screen_opened', { hasToken: true });
    } else {
      logger.warn('No token found in reset password URL');
      setErrors({ general: 'Invalid or missing reset token. Please request a new password reset.' });
    }
  }, [params]);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const getPasswordStrength = (password: string): { text: string; color: string } => {
    if (password.length === 0) return { text: '', color: '' };
    if (password.length < 8) return { text: 'Weak', color: colors.error };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { text: 'Medium', color: colors.warning };
    }
    return { text: 'Strong', color: colors.success };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!accessToken) {
      setErrors({ general: 'Invalid reset token. Please request a new password reset.' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    logger.logUserAction('reset_password_attempt');

    try {
      await resetPasswordWithToken(accessToken, formData.password);

      setIsSuccess(true);
      toast.success("Password reset successful!", "You can now sign in with your new password");
      logger.logUserAction('reset_password_success');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.replace("/(auth)");
      }, 2000);
    } catch (error: any) {
      handleError(error, error.message || "Failed to reset password");
      setErrors({
        general: error.message || "Failed to reset password. The link may have expired."
      });
      logger.logUserAction('reset_password_error', { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(formData.password);

  // Success state
  if (isSuccess) {
    return (
      <Box flex={1} bg={colors.surfaceMuted}>
        <VStack
          flex={1}
          justifyContent="center"
          px={space.xl}
          py={insets.top + space.xl}
          space="xl"
        >
          {/* Header */}
          <VStack space="md" alignItems="center">
            <CheckCircle2 color={colors.success} size={64} />
            <Text fontSize="$4xl" fontWeight="$bold" color={colors.textPrimary}>
              All Set!
            </Text>
            <Text fontSize="$lg" color={colors.textSecondary} textAlign="center">
              Your password has been reset successfully
            </Text>
          </VStack>

          {/* Success Card */}
          <SectionCard>
            <VStack space="md" alignItems="center" py={space.md}>
              <Text fontSize="$md" color={colors.textPrimary} textAlign="center">
                Redirecting you to sign in...
              </Text>
            </VStack>
          </SectionCard>

          <Pressable onPress={() => router.replace("/(auth)")}>
            <Text color={colors.brand[600]} fontSize="$sm" fontWeight="$medium" textAlign="center">
              Sign in now
            </Text>
          </Pressable>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.surfaceMuted}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <VStack
            flex={1}
            justifyContent="center"
            px={space.xl}
            py={insets.top + space.xl}
            space="xl"
          >
            {/* Header */}
            <VStack space="md" alignItems="center">
              <Text fontSize="$4xl" fontWeight="$bold" color={colors.textPrimary}>
                IdeaSpark
              </Text>
              <Text fontSize="$lg" color={colors.textSecondary} textAlign="center">
                Create a new password
              </Text>
            </VStack>

            {/* Form Card */}
            <SectionCard>
              <VStack space="lg">
                {errors.general && (
                  <InlineNotice
                    type="error"
                    message={errors.general}
                    onDismiss={() => setErrors({ ...errors, general: "" })}
                  />
                )}

                <FilledInput
                  label="New Password"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange("password", text)}
                  placeholder="Enter new password"
                  icon={Lock}
                  error={errors.password}
                  isRequired
                  isDisabled={isLoading || !accessToken}
                  secureTextEntry
                />

                {formData.password.length > 0 && (
                  <VStack space="xs">
                    <Text fontSize="$xs" color={colors.textSecondary}>
                      Password strength: <Text color={strength.color} fontWeight="$semibold">{strength.text}</Text>
                    </Text>
                  </VStack>
                )}

                <FilledInput
                  label="Confirm New Password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange("confirmPassword", text)}
                  placeholder="Confirm new password"
                  icon={Lock}
                  error={errors.confirmPassword}
                  isRequired
                  isDisabled={isLoading || !accessToken}
                  secureTextEntry
                />

                <PrimaryButton
                  onPress={handleSubmit}
                  isLoading={isLoading}
                  isDisabled={isLoading || !accessToken}
                >
                  Reset Password
                </PrimaryButton>

                {/* Back to Sign In */}
                <VStack space="sm" alignItems="center">
                  <Pressable onPress={() => router.replace("/(auth)")}>
                    <Text color={colors.textSecondary} fontSize="$sm">
                      Back to sign in
                    </Text>
                  </Pressable>
                </VStack>
              </VStack>
            </SectionCard>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
