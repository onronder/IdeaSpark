import React, { useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Box,
  VStack,
  HStack,
  Text,
  Pressable,
} from "@gluestack-ui/themed";
import {
  Mail,
  Lock,
  User,
} from "lucide-react-native";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  FilledInput,
  PrimaryButton,
  GhostPillButton,
  InlineNotice,
  SectionCard,
} from "@/components/ui";
import { colors, space } from "@/theme/tokens";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, forgotPassword } = useAuth();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler("AuthScreen");
  const insets = useSafeAreaInsets();

  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (authMode === "signup" && !formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (authMode !== "forgot") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }

      if (authMode === "signup") {
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords don't match";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    logger.logUserAction(`auth_${authMode}_attempt`);

    try {
      if (authMode === "login") {
        await signIn(formData.email, formData.password);
        toast.success("Welcome back!", "You're signed in");
        router.replace("/(app)");
      } else if (authMode === "signup") {
        await signUp(formData.email, formData.password, formData.name);
        toast.success("Account created!", "Welcome to IdeaSpark");
        router.replace("/(app)");
      } else if (authMode === "forgot") {
        await forgotPassword(formData.email);
        toast.success("Email sent", "Check your inbox for reset instructions");
        setAuthMode("login");
      }
    } catch (error: any) {
      handleError(error, error.message || "Authentication failed");
      setErrors({ general: error.message || "Authentication failed" });
    } finally {
      setIsLoading(false);
    }
  };

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
                {authMode === "login" && "Welcome back! Sign in to continue"}
                {authMode === "signup" && "Create your account to get started"}
                {authMode === "forgot" && "Reset your password"}
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

                {authMode === "signup" && (
                  <FilledInput
                    label="Name"
                    value={formData.name}
                    onChangeText={(text) => handleInputChange("name", text)}
                    placeholder="Your name"
                    icon={User}
                    error={errors.name}
                    isRequired
                    isDisabled={isLoading}
                    autoCapitalize="words"
                  />
                )}

                <FilledInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange("email", text)}
                  placeholder="your@email.com"
                  icon={Mail}
                  error={errors.email}
                  isRequired
                  isDisabled={isLoading}
                  keyboardType="email-address"
                />

                {authMode !== "forgot" && (
                  <FilledInput
                    label="Password"
                    value={formData.password}
                    onChangeText={(text) => handleInputChange("password", text)}
                    placeholder="Enter your password"
                    icon={Lock}
                    error={errors.password}
                    isRequired
                    isDisabled={isLoading}
                    secureTextEntry
                  />
                )}

                {authMode === "signup" && (
                  <FilledInput
                    label="Confirm Password"
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange("confirmPassword", text)}
                    placeholder="Confirm your password"
                    icon={Lock}
                    error={errors.confirmPassword}
                    isRequired
                    isDisabled={isLoading}
                    secureTextEntry
                  />
                )}

                <PrimaryButton
                  onPress={handleSubmit}
                  isLoading={isLoading}
                  isDisabled={isLoading}
                >
                  {authMode === "login" && "Sign In"}
                  {authMode === "signup" && "Create Account"}
                  {authMode === "forgot" && "Send Reset Link"}
                </PrimaryButton>

                {/* Mode Switching */}
                <VStack space="sm" alignItems="center">
                  {authMode === "login" && (
                    <>
                      <Pressable onPress={() => setAuthMode("signup")}>
                        <Text color={colors.brand[600]} fontSize="$sm" fontWeight="$medium">
                          Don't have an account? Sign up
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => setAuthMode("forgot")}>
                        <Text color={colors.textSecondary} fontSize="$sm">
                          Forgot password?
                        </Text>
                      </Pressable>
                    </>
                  )}

                  {authMode === "signup" && (
                    <Pressable onPress={() => setAuthMode("login")}>
                      <Text color={colors.brand[600]} fontSize="$sm" fontWeight="$medium">
                        Already have an account? Sign in
                      </Text>
                    </Pressable>
                  )}

                  {authMode === "forgot" && (
                    <Pressable onPress={() => setAuthMode("login")}>
                      <Text color={colors.brand[600]} fontSize="$sm" fontWeight="$medium">
                        Back to sign in
                      </Text>
                    </Pressable>
                  )}
                </VStack>
              </VStack>
            </SectionCard>

            {/* Footer */}
            <Text color={colors.textSecondary} fontSize="$xs" textAlign="center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </Box>
  );
}
