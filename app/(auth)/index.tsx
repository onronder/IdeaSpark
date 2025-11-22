import React, { useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  InputField,
  InputIcon,
  InputSlot,
  ButtonText,
  Pressable,
  AlertIcon,
  AlertText,
  Spinner,
  Center,
} from "@gluestack-ui/themed";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertTriangle,
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { GradientBackground, GlassCard, AnimatedOrb } from "@/components/ui";
import { SafeButton, SafeInput, SafeFormControl, SafeAlert } from "@/components/SafeGluestack";
import * as Sentry from "@sentry/react-native";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, forgotPassword } = useAuth();
  const { colorMode } = useTheme();
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDark = colorMode === 'dark';

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
    logger.logUserAction(`${authMode}_attempt`, { email: formData.email });

    try {
      if (authMode === "login") {
        await signIn(formData.email, formData.password);
        toast.success("Welcome back!", "Successfully signed in");
      } else if (authMode === "signup") {
        await signUp(formData.email, formData.password, formData.name);
        toast.success("Account created!", "Welcome to IdeaSpark");
      } else {
        await forgotPassword(formData.email);
        toast.success("Email sent!", "Check your inbox for reset instructions");
        setAuthMode("login");
      }
    } catch (err: any) {
      handleError(err, err.message);
      setErrors({ general: err.message || `${authMode} failed` });
    } finally {
      setIsLoading(false);
    }
  };

  const renderForgotPasswordScreen = () => (
    <VStack space="lg" flex={1} px="$6" justifyContent="center" pt={insets.top || "$6"}>
      <VStack space="sm" mb="$6">
        <Heading size="2xl" color={isDark ? "$white" : "$textLight900"}>
          Reset Password
        </Heading>
        <Text size="md" color={isDark ? "$textDark400" : "$textLight500"}>
          Enter your email to receive reset instructions
        </Text>
      </VStack>

      {errors.general && (
        <SafeAlert
          action="error"
          variant="solid"
          mb="$4"
          accessibilityLabel="Password reset error alert"
        >
          <AlertIcon as={AlertTriangle} mr="$3" />
          <AlertText>{errors.general}</AlertText>
        </SafeAlert>
      )}

      <VStack space="md">
        <SafeFormControl
          isInvalid={!!errors.email}
          accessibilityLabel="Email input for password reset"
        >
          <FormControlLabel>
            <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
              Email
            </FormControlLabelText>
          </FormControlLabel>
          <SafeInput
            variant="outline"
            size="lg"
            isDisabled={isLoading}
            isInvalid={!!errors.email}
            bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
            borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
            accessibilityLabel="Email address input"
          >
            <InputSlot pl="$3">
              <InputIcon as={Mail} size="sm" color={isDark ? "$textDark400" : "$textLight400"} />
            </InputSlot>
            <InputField
              placeholder="Email address"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            />
          </SafeInput>
          {errors.email && (
            <FormControlError>
              <FormControlErrorText>{errors.email}</FormControlErrorText>
            </FormControlError>
          )}
        </SafeFormControl>
      </VStack>

      <SafeButton
        size="lg"
        variant="solid"
        action="primary"
        isDisabled={isLoading}
        onPress={handleSubmit}
        accessibilityLabel="Send password reset instructions button"
        accessibilityHint="Tap to send password reset email"
      >
        {isLoading ? (
          <Spinner color="$white" />
        ) : (
          <ButtonText>Send Reset Instructions</ButtonText>
        )}
      </SafeButton>

      <Pressable
        onPress={() => setAuthMode("login")}
        mt="$4"
        alignSelf="center"
        accessibilityRole="button"
        accessibilityLabel="Back to login"
        accessibilityHint="Return to the login screen"
      >
        <Text color="$primary500" fontWeight="$semibold">
          ← Back to Login
        </Text>
      </Pressable>
    </VStack>
  );

  if (authMode === "forgot") {
    return (
      <Box flex={1}>
        <GradientBackground variant="primary">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {renderForgotPasswordScreen()}
            </ScrollView>
          </KeyboardAvoidingView>
        </GradientBackground>
      </Box>
    );
  }

  return (
    <Box flex={1}>
      <GradientBackground variant="primary">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <VStack
              space="lg"
              flex={1}
              px="$6"
              justifyContent="center"
              pt={insets.top + 48 || "$12"}
              pb="$12"
            >
              {/* Welcome Header with Orb */}
              <Center mb="$8">
                <Box mb="$6">
                  <AnimatedOrb size={120} icon="sparkles" variant="primary" />
                </Box>

                <Heading size="3xl" textAlign="center" color={isDark ? "$white" : "$textLight900"} mb="$2">
                  {authMode === "login" ? "Welcome Back" : "Join IdeaSpark"}
                </Heading>
                <Text size="md" textAlign="center" color={isDark ? "$textDark400" : "$textLight500"}>
                  {authMode === "login"
                    ? "Sign in to continue refining your ideas"
                    : "Start your journey to better ideas"}
                </Text>
              </Center>

              {/* Glassmorphism Card */}
              <GlassCard p="$6" opacity={isDark ? 0.05 : 0.9}>
                {errors.general && (
                  <SafeAlert
                    action="error"
                    variant="solid"
                    mb="$4"
                    accessibilityLabel="Authentication error alert"
                  >
                    <AlertIcon as={AlertTriangle} mr="$3" />
                    <AlertText>{errors.general}</AlertText>
                  </SafeAlert>
                )}

                <VStack space="md">
                  {authMode === "signup" && (
                    <SafeFormControl
                      isInvalid={!!errors.name}
                      isRequired={true}
                      accessibilityLabel="Full name input field"
                    >
                      <FormControlLabel>
                        <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                          Full Name
                        </FormControlLabelText>
                      </FormControlLabel>
                      <SafeInput
                        variant="outline"
                        size="lg"
                        isDisabled={isLoading}
                        isInvalid={!!errors.name}
                        bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                        borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                        accessibilityLabel="Full name input"
                      >
                        <InputSlot pl="$3">
                          <InputIcon as={User} size="sm" color={isDark ? "$textDark400" : "$textLight400"} />
                        </InputSlot>
                        <InputField
                          placeholder="John Doe"
                          value={formData.name}
                          onChangeText={(value) => handleInputChange("name", value)}
                          autoCapitalize="words"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        />
                      </SafeInput>
                      {errors.name && (
                        <FormControlError>
                          <FormControlErrorText>{errors.name}</FormControlErrorText>
                        </FormControlError>
                      )}
                    </SafeFormControl>
                  )}

                  <SafeFormControl
                    isInvalid={!!errors.email}
                    isRequired={true}
                    accessibilityLabel="Email address input field"
                  >
                    <FormControlLabel>
                      <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                        Email
                      </FormControlLabelText>
                    </FormControlLabel>
                    <SafeInput
                      variant="outline"
                      size="lg"
                      isDisabled={isLoading}
                      isInvalid={!!errors.email}
                      bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                      borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                      accessibilityLabel="Email address input"
                    >
                      <InputSlot pl="$3">
                        <InputIcon as={Mail} size="sm" color={isDark ? "$textDark400" : "$textLight400"} />
                      </InputSlot>
                      <InputField
                        placeholder="you@example.com"
                        value={formData.email}
                        onChangeText={(value) => handleInputChange("email", value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                      />
                    </SafeInput>
                    {errors.email && (
                      <FormControlError>
                        <FormControlErrorText>{errors.email}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </SafeFormControl>

                  <SafeFormControl
                    isInvalid={!!errors.password}
                    isRequired={true}
                    accessibilityLabel="Password input field"
                  >
                    <FormControlLabel>
                      <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                        Password
                      </FormControlLabelText>
                    </FormControlLabel>
                    <SafeInput
                      variant="outline"
                      size="lg"
                      isDisabled={isLoading}
                      isInvalid={!!errors.password}
                      bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                      borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                      accessibilityLabel="Password input"
                    >
                      <InputSlot pl="$3">
                        <InputIcon as={Lock} size="sm" color={isDark ? "$textDark400" : "$textLight400"} />
                      </InputSlot>
                      <InputField
                        placeholder="Enter your password"
                        value={formData.password}
                        onChangeText={(value) => handleInputChange("password", value)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                      />
                      <InputSlot pr="$3">
                        <Pressable
                          onPress={() => setShowPassword(!showPassword)}
                          accessibilityRole="button"
                          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                          accessibilityHint="Toggles password visibility"
                        >
                          <InputIcon
                            as={showPassword ? EyeOff : Eye}
                            size="sm"
                            color={isDark ? "$textDark400" : "$textLight400"}
                          />
                        </Pressable>
                      </InputSlot>
                    </SafeInput>
                    {errors.password && (
                      <FormControlError>
                        <FormControlErrorText>{errors.password}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </SafeFormControl>

                  {authMode === "signup" && (
                    <SafeFormControl
                      isInvalid={!!errors.confirmPassword}
                      isRequired={true}
                      accessibilityLabel="Confirm password input field"
                    >
                      <FormControlLabel>
                        <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                          Confirm Password
                        </FormControlLabelText>
                      </FormControlLabel>
                      <SafeInput
                        variant="outline"
                        size="lg"
                        isDisabled={isLoading}
                        isInvalid={!!errors.confirmPassword}
                        bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                        borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                        accessibilityLabel="Confirm password input"
                      >
                        <InputSlot pl="$3">
                          <InputIcon as={Lock} size="sm" color={isDark ? "$textDark400" : "$textLight400"} />
                        </InputSlot>
                        <InputField
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChangeText={(value) => handleInputChange("confirmPassword", value)}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        />
                        <InputSlot pr="$3">
                          <Pressable
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            accessibilityRole="button"
                            accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            accessibilityHint="Toggles confirm password visibility"
                          >
                            <InputIcon
                              as={showConfirmPassword ? EyeOff : Eye}
                              size="sm"
                              color={isDark ? "$textDark400" : "$textLight400"}
                            />
                          </Pressable>
                        </InputSlot>
                      </SafeInput>
                      {errors.confirmPassword && (
                        <FormControlError>
                          <FormControlErrorText>{errors.confirmPassword}</FormControlErrorText>
                        </FormControlError>
                      )}
                    </SafeFormControl>
                  )}

                  {authMode === "login" && (
                    <Pressable
                      onPress={() => setAuthMode("forgot")}
                      alignSelf="flex-end"
                      accessibilityRole="button"
                      accessibilityLabel="Forgot password"
                      accessibilityHint="Navigate to password reset screen"
                    >
                      <Text color="$primary500" fontWeight="$semibold" size="sm">
                        Forgot Password?
                      </Text>
                    </Pressable>
                  )}

                  <SafeButton
                    size="lg"
                    variant="solid"
                    action="primary"
                    isDisabled={isLoading}
                    onPress={handleSubmit}
                    mt="$2"
                    accessibilityLabel={authMode === "login" ? "Sign in button" : "Create account button"}
                    accessibilityHint={authMode === "login" ? "Tap to sign in" : "Tap to create a new account"}
                  >
                    {isLoading ? (
                      <Spinner color="$white" />
                    ) : (
                      <ButtonText>
                        {authMode === "login" ? "Sign In" : "Create Account"}
                      </ButtonText>
                    )}
                  </SafeButton>
                </VStack>
              </GlassCard>

              {/* Sentry Test Button - TEMPORARY */}
              <Center mt="$4">
                <SafeButton
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    Sentry.captureException(new Error('First error'));
                    toast.success('Test Sent!', 'Check Sentry dashboard');
                  }}
                  accessibilityLabel="Test Sentry error tracking"
                >
                  <ButtonText>🧪 Test Sentry</ButtonText>
                </SafeButton>
              </Center>

              {/* Switch Mode */}
              <Center mt="$6">
                <HStack space="xs" alignItems="center">
                  <Text color={isDark ? "$textDark400" : "$textLight600"}>
                    {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setAuthMode(authMode === "login" ? "signup" : "login");
                      setErrors({});
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={authMode === "login" ? "Switch to sign up" : "Switch to sign in"}
                    accessibilityHint={authMode === "login" ? "Navigate to sign up screen" : "Navigate to sign in screen"}
                  >
                    <Text color="$primary500" fontWeight="$bold">
                      {authMode === "login" ? "Sign Up" : "Sign In"}
                    </Text>
                  </Pressable>
                </HStack>
              </Center>
            </VStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </GradientBackground>
    </Box>
  );
}
