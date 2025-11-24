import React, { useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, Animated } from "react-native";
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
  Sparkles,
  ArrowRight,
} from "lucide-react-native";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { GradientBackground, GlassCard, AnimatedOrb } from "@/components/ui";
import { SafeButton, SafeInput, SafeFormControl, SafeAlert } from "@/components/SafeGluestack";
import { LinearGradient } from 'expo-linear-gradient';

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
    <VStack space="xl" flex={1} px="$6" justifyContent="center" pt={insets.top + 40 || "$12"}>
      {/* Header */}
      <VStack space="md" mb="$4">
        <Heading size="3xl" color={isDark ? "$white" : "$textLight900"} lineHeight="$3xl">
          Reset Password
        </Heading>
        <Text size="lg" color={isDark ? "$textDark400" : "$textLight500"} lineHeight="$xl">
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

      <VStack space="lg">
        <SafeFormControl
          isInvalid={!!errors.email}
          accessibilityLabel="Email input for password reset"
        >
          <FormControlLabel mb="$2">
            <FormControlLabelText 
              color={isDark ? "$textDark200" : "$textLight800"}
              fontWeight="$semibold"
              size="md"
            >
              Email Address
            </FormControlLabelText>
          </FormControlLabel>
          <SafeInput
            variant="outline"
            size="xl"
            isDisabled={isLoading}
            isInvalid={!!errors.email}
            bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
            borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
            borderWidth={2}
            h="$16"
            focusable={true}
            sx={{
              ':focus': {
                borderColor: '$primary500',
                shadowColor: '$primary500',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }
            }}
            accessibilityLabel="Email address input"
          >
            <InputSlot pl="$4">
              <InputIcon as={Mail} size="lg" color={isDark ? "$primary400" : "$primary500"} />
            </InputSlot>
            <InputField
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              fontSize="$md"
            />
          </SafeInput>
          {errors.email && (
            <FormControlError mt="$2">
              <FormControlErrorText fontSize="$sm">{errors.email}</FormControlErrorText>
            </FormControlError>
          )}
        </SafeFormControl>
      </VStack>

      {/* Submit Button with Gradient */}
      <Box mt="$4">
        <Pressable
          onPress={handleSubmit}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Send password reset instructions button"
          accessibilityHint="Tap to send password reset email"
        >
          <Box
            bg="$primary600"
            h="$16"
            borderRadius="$2xl"
            justifyContent="center"
            alignItems="center"
            shadowColor="$primary600"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.3}
            shadowRadius={16}
            sx={{
              ':active': {
                transform: [{ scale: 0.98 }]
              }
            }}
          >
            {isLoading ? (
              <Spinner color="$white" size="large" />
            ) : (
              <HStack space="sm" alignItems="center">
                <ButtonText color="$white" fontWeight="$bold" fontSize="$lg">
                  Send Reset Instructions
                </ButtonText>
                <ArrowRight size={20} color="white" />
              </HStack>
            )}
          </Box>
        </Pressable>
      </Box>

      <Pressable
        onPress={() => setAuthMode("login")}
        mt="$6"
        alignSelf="center"
        accessibilityRole="button"
        accessibilityLabel="Back to login"
        accessibilityHint="Return to the login screen"
      >
        <Text color="$primary500" fontWeight="$bold" size="md">
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
            keyboardVerticalOffset={0}
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
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <VStack
              space="xl"
              flex={1}
              px="$6"
              justifyContent="center"
              pt={insets.top + 60 || "$16"}
              pb="$12"
            >
              {/* Welcome Header with Enhanced Orb */}
              <Center mb="$8">
                <Box mb="$8">
                  <AnimatedOrb size={140} icon="sparkles" variant="primary" />
                </Box>

                <VStack space="sm" alignItems="center">
                  <Heading 
                    size="4xl" 
                    textAlign="center" 
                    color={isDark ? "$white" : "$textLight900"}
                    lineHeight="$4xl"
                    fontWeight="$black"
                  >
                    {authMode === "login" ? "Welcome Back" : "Join IdeaSpark"}
                  </Heading>
                  <Text 
                    size="lg" 
                    textAlign="center" 
                    color={isDark ? "$textDark300" : "$textLight600"}
                    lineHeight="$xl"
                    px="$4"
                  >
                    {authMode === "login"
                      ? "Sign in to continue refining your ideas"
                      : "Start your journey to better ideas"}
                  </Text>
                </VStack>
              </Center>

              {/* Enhanced Glassmorphism Card */}
              <GlassCard p="$8" opacity={isDark ? 0.08 : 0.95}>
                {errors.general && (
                  <SafeAlert
                    action="error"
                    variant="solid"
                    mb="$6"
                    accessibilityLabel="Authentication error alert"
                  >
                    <AlertIcon as={AlertTriangle} mr="$3" />
                    <AlertText>{errors.general}</AlertText>
                  </SafeAlert>
                )}

                <VStack space="lg">
                  {authMode === "signup" && (
                    <SafeFormControl
                      isInvalid={!!errors.name}
                      isRequired={true}
                      accessibilityLabel="Full name input field"
                    >
                      <FormControlLabel mb="$2">
                        <FormControlLabelText 
                          color={isDark ? "$textDark200" : "$textLight800"}
                          fontWeight="$semibold"
                          size="md"
                        >
                          Full Name
                        </FormControlLabelText>
                      </FormControlLabel>
                      <SafeInput
                        variant="outline"
                        size="xl"
                        isDisabled={isLoading}
                        isInvalid={!!errors.name}
                        bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
                        borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
                        borderWidth={2}
                        h="$16"
                        sx={{
                          ':focus': {
                            borderColor: '$primary500',
                            shadowColor: '$primary500',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                          }
                        }}
                        accessibilityLabel="Full name input"
                      >
                        <InputSlot pl="$4">
                          <InputIcon as={User} size="lg" color={isDark ? "$primary400" : "$primary500"} />
                        </InputSlot>
                        <InputField
                          placeholder="John Doe"
                          value={formData.name}
                          onChangeText={(value) => handleInputChange("name", value)}
                          autoCapitalize="words"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                          fontSize="$md"
                        />
                      </SafeInput>
                      {errors.name && (
                        <FormControlError mt="$2">
                          <FormControlErrorText fontSize="$sm">{errors.name}</FormControlErrorText>
                        </FormControlError>
                      )}
                    </SafeFormControl>
                  )}

                  <SafeFormControl
                    isInvalid={!!errors.email}
                    isRequired={true}
                    accessibilityLabel="Email address input field"
                  >
                    <FormControlLabel mb="$2">
                      <FormControlLabelText 
                        color={isDark ? "$textDark200" : "$textLight800"}
                        fontWeight="$semibold"
                        size="md"
                      >
                        Email Address
                      </FormControlLabelText>
                    </FormControlLabel>
                    <SafeInput
                      variant="outline"
                      size="xl"
                      isDisabled={isLoading}
                      isInvalid={!!errors.email}
                      bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
                      borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
                      borderWidth={2}
                      h="$16"
                      sx={{
                        ':focus': {
                          borderColor: '$primary500',
                          shadowColor: '$primary500',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                        }
                      }}
                      accessibilityLabel="Email address input"
                    >
                      <InputSlot pl="$4">
                        <InputIcon as={Mail} size="lg" color={isDark ? "$primary400" : "$primary500"} />
                      </InputSlot>
                      <InputField
                        placeholder="you@example.com"
                        value={formData.email}
                        onChangeText={(value) => handleInputChange("email", value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        fontSize="$md"
                      />
                    </SafeInput>
                    {errors.email && (
                      <FormControlError mt="$2">
                        <FormControlErrorText fontSize="$sm">{errors.email}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </SafeFormControl>

                  <SafeFormControl
                    isInvalid={!!errors.password}
                    isRequired={true}
                    accessibilityLabel="Password input field"
                  >
                    <FormControlLabel mb="$2">
                      <FormControlLabelText 
                        color={isDark ? "$textDark200" : "$textLight800"}
                        fontWeight="$semibold"
                        size="md"
                      >
                        Password
                      </FormControlLabelText>
                    </FormControlLabel>
                    <SafeInput
                      variant="outline"
                      size="xl"
                      isDisabled={isLoading}
                      isInvalid={!!errors.password}
                      bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
                      borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
                      borderWidth={2}
                      h="$16"
                      sx={{
                        ':focus': {
                          borderColor: '$primary500',
                          shadowColor: '$primary500',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                        }
                      }}
                      accessibilityLabel="Password input"
                    >
                      <InputSlot pl="$4">
                        <InputIcon as={Lock} size="lg" color={isDark ? "$primary400" : "$primary500"} />
                      </InputSlot>
                      <InputField
                        placeholder="Enter your password"
                        value={formData.password}
                        onChangeText={(value) => handleInputChange("password", value)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        fontSize="$md"
                      />
                      <InputSlot pr="$4">
                        <Pressable
                          onPress={() => setShowPassword(!showPassword)}
                          accessibilityRole="button"
                          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                          accessibilityHint="Toggles password visibility"
                        >
                          <InputIcon
                            as={showPassword ? EyeOff : Eye}
                            size="lg"
                            color={isDark ? "$primary400" : "$primary500"}
                          />
                        </Pressable>
                      </InputSlot>
                    </SafeInput>
                    {errors.password && (
                      <FormControlError mt="$2">
                        <FormControlErrorText fontSize="$sm">{errors.password}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </SafeFormControl>

                  {authMode === "signup" && (
                    <SafeFormControl
                      isInvalid={!!errors.confirmPassword}
                      isRequired={true}
                      accessibilityLabel="Confirm password input field"
                    >
                      <FormControlLabel mb="$2">
                        <FormControlLabelText 
                          color={isDark ? "$textDark200" : "$textLight800"}
                          fontWeight="$semibold"
                          size="md"
                        >
                          Confirm Password
                        </FormControlLabelText>
                      </FormControlLabel>
                      <SafeInput
                        variant="outline"
                        size="xl"
                        isDisabled={isLoading}
                        isInvalid={!!errors.confirmPassword}
                        bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
                        borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
                        borderWidth={2}
                        h="$16"
                        sx={{
                          ':focus': {
                            borderColor: '$primary500',
                            shadowColor: '$primary500',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                          }
                        }}
                        accessibilityLabel="Confirm password input"
                      >
                        <InputSlot pl="$4">
                          <InputIcon as={Lock} size="lg" color={isDark ? "$primary400" : "$primary500"} />
                        </InputSlot>
                        <InputField
                          placeholder="Re-enter your password"
                          value={formData.confirmPassword}
                          onChangeText={(value) => handleInputChange("confirmPassword", value)}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                          fontSize="$md"
                        />
                        <InputSlot pr="$4">
                          <Pressable
                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            accessibilityRole="button"
                            accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            accessibilityHint="Toggles confirm password visibility"
                          >
                            <InputIcon
                              as={showConfirmPassword ? EyeOff : Eye}
                              size="lg"
                              color={isDark ? "$primary400" : "$primary500"}
                            />
                          </Pressable>
                        </InputSlot>
                      </SafeInput>
                      {errors.confirmPassword && (
                        <FormControlError mt="$2">
                          <FormControlErrorText fontSize="$sm">{errors.confirmPassword}</FormControlErrorText>
                        </FormControlError>
                      )}
                    </SafeFormControl>
                  )}

                  {authMode === "login" && (
                    <Pressable
                      onPress={() => setAuthMode("forgot")}
                      alignSelf="flex-end"
                      mt="$-2"
                      accessibilityRole="button"
                      accessibilityLabel="Forgot password"
                      accessibilityHint="Navigate to password reset screen"
                    >
                      <Text color="$primary500" fontWeight="$bold" size="sm">
                        Forgot Password?
                      </Text>
                    </Pressable>
                  )}

                  {/* Enhanced Submit Button */}
                  <Box mt="$4">
                    <Pressable
                      onPress={handleSubmit}
                      disabled={isLoading}
                      accessibilityRole="button"
                      accessibilityLabel={authMode === "login" ? "Sign in button" : "Create account button"}
                      accessibilityHint={authMode === "login" ? "Tap to sign in" : "Tap to create a new account"}
                    >
                      <Box
                        bg="$primary600"
                        h="$16"
                        borderRadius="$2xl"
                        justifyContent="center"
                        alignItems="center"
                        shadowColor="$primary600"
                        shadowOffset={{ width: 0, height: 8 }}
                        shadowOpacity={0.4}
                        shadowRadius={16}
                        sx={{
                          ':active': {
                            transform: [{ scale: 0.98 }]
                          }
                        }}
                      >
                        {isLoading ? (
                          <Spinner color="$white" size="large" />
                        ) : (
                          <HStack space="sm" alignItems="center">
                            <ButtonText color="$white" fontWeight="$bold" fontSize="$lg">
                              {authMode === "login" ? "Sign In" : "Create Account"}
                            </ButtonText>
                            <ArrowRight size={20} color="white" />
                          </HStack>
                        )}
                      </Box>
                    </Pressable>
                  </Box>
                </VStack>
              </GlassCard>

              {/* Switch Mode */}
              <Center mt="$8">
                <HStack space="xs" alignItems="center">
                  <Text 
                    color={isDark ? "$textDark300" : "$textLight600"}
                    fontSize="$md"
                  >
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
                    <Text color="$primary500" fontWeight="$bold" fontSize="$md">
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
