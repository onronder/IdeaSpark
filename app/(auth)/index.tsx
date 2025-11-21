import React, { useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Input,
  InputField,
  InputIcon,
  InputSlot,
  Button,
  ButtonText,
  Pressable,
  Alert,
  AlertIcon,
  AlertText,
  Spinner,
  Icon,
  Center,
} from "@gluestack-ui/themed";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Sparkles,
  AlertTriangle,
} from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export default function AuthScreen() {
  const router = useRouter();
  const { signIn, signUp, forgotPassword } = useAuth();
  const { colorMode } = useTheme();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler("AuthScreen");

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
    <VStack space="lg" flex={1} px="$6" justifyContent="center">
      <VStack space="sm" mb="$6">
        <Heading size="2xl" color={isDark ? "$white" : "$textLight900"}>
          Reset Password
        </Heading>
        <Text size="md" color={isDark ? "$textDark400" : "$textLight500"}>
          Enter your email to receive reset instructions
        </Text>
      </VStack>

      {errors.general && (
        <Alert action="error" variant="solid" mb="$4">
          <AlertIcon as={AlertTriangle} mr="$3" />
          <AlertText>{errors.general}</AlertText>
        </Alert>
      )}

      <VStack space="md">
        <FormControl isInvalid={!!errors.email}>
          <FormControlLabel>
            <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
              Email
            </FormControlLabelText>
          </FormControlLabel>
          <Input
            variant="outline"
            size="lg"
            isDisabled={isLoading}
            isInvalid={!!errors.email}
            bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
            borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
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
          </Input>
          {errors.email && (
            <FormControlError>
              <FormControlErrorText>{errors.email}</FormControlErrorText>
            </FormControlError>
          )}
        </FormControl>
      </VStack>

      <Button
        size="lg"
        variant="solid"
        action="primary"
        isDisabled={isLoading}
        onPress={handleSubmit}
      >
        {isLoading ? (
          <Spinner color="$white" />
        ) : (
          <ButtonText>Send Reset Instructions</ButtonText>
        )}
      </Button>

      <Pressable onPress={() => setAuthMode("login")} mt="$4" alignSelf="center">
        <Text color="$primary500" fontWeight="$semibold">
          ← Back to Login
        </Text>
      </Pressable>
    </VStack>
  );

  if (authMode === "forgot") {
    return (
      <Box flex={1}>
        <LinearGradient
          colors={
            isDark
              ? ['#0F172A', '#1E1B4B', '#312E81']
              : ['#F0F9FF', '#E0F2FE', '#FFFFFF']
          }
          style={{ flex: 1 }}
        >
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
        </LinearGradient>
      </Box>
    );
  }

  return (
    <Box flex={1}>
      <LinearGradient
        colors={
          isDark
            ? ['#0F172A', '#1E1B4B', '#312E81', '#4338CA']
            : ['#F0F9FF', '#E0F2FE', '#DBEAFE', '#FFFFFF']
        }
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <VStack space="lg" flex={1} px="$6" justifyContent="center" py="$12">
              {/* Welcome Header with Orb */}
              <Center mb="$8">
                <Box
                  w={120}
                  h={120}
                  borderRadius="$full"
                  mb="$6"
                  overflow="hidden"
                >
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon as={Sparkles} size="4xl" color="$white" />
                  </LinearGradient>
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
              <Box
                bg={isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)"}
                borderRadius="$3xl"
                p="$6"
                borderWidth={1}
                borderColor={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)"}
                shadowColor="$black"
                shadowOffset={{ width: 0, height: 10 }}
                shadowOpacity={isDark ? 0.3 : 0.1}
                shadowRadius={20}
              >
                {errors.general && (
                  <Alert action="error" variant="solid" mb="$4">
                    <AlertIcon as={AlertTriangle} mr="$3" />
                    <AlertText>{errors.general}</AlertText>
                  </Alert>
                )}

                <VStack space="md">
                  {authMode === "signup" && (
                    <FormControl isInvalid={!!errors.name}>
                      <FormControlLabel>
                        <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                          Full Name
                        </FormControlLabelText>
                      </FormControlLabel>
                      <Input
                        variant="outline"
                        size="lg"
                        isDisabled={isLoading}
                        isInvalid={!!errors.name}
                        bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                        borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
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
                      </Input>
                      {errors.name && (
                        <FormControlError>
                          <FormControlErrorText>{errors.name}</FormControlErrorText>
                        </FormControlError>
                      )}
                    </FormControl>
                  )}

                  <FormControl isInvalid={!!errors.email}>
                    <FormControlLabel>
                      <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                        Email
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input
                      variant="outline"
                      size="lg"
                      isDisabled={isLoading}
                      isInvalid={!!errors.email}
                      bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                      borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
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
                    </Input>
                    {errors.email && (
                      <FormControlError>
                        <FormControlErrorText>{errors.email}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </FormControl>

                  <FormControl isInvalid={!!errors.password}>
                    <FormControlLabel>
                      <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                        Password
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input
                      variant="outline"
                      size="lg"
                      isDisabled={isLoading}
                      isInvalid={!!errors.password}
                      bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                      borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
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
                        <Pressable onPress={() => setShowPassword(!showPassword)}>
                          <InputIcon
                            as={showPassword ? EyeOff : Eye}
                            size="sm"
                            color={isDark ? "$textDark400" : "$textLight400"}
                          />
                        </Pressable>
                      </InputSlot>
                    </Input>
                    {errors.password && (
                      <FormControlError>
                        <FormControlErrorText>{errors.password}</FormControlErrorText>
                      </FormControlError>
                    )}
                  </FormControl>

                  {authMode === "signup" && (
                    <FormControl isInvalid={!!errors.confirmPassword}>
                      <FormControlLabel>
                        <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                          Confirm Password
                        </FormControlLabelText>
                      </FormControlLabel>
                      <Input
                        variant="outline"
                        size="lg"
                        isDisabled={isLoading}
                        isInvalid={!!errors.confirmPassword}
                        bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                        borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
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
                          <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                            <InputIcon
                              as={showConfirmPassword ? EyeOff : Eye}
                              size="sm"
                              color={isDark ? "$textDark400" : "$textLight400"}
                            />
                          </Pressable>
                        </InputSlot>
                      </Input>
                      {errors.confirmPassword && (
                        <FormControlError>
                          <FormControlErrorText>{errors.confirmPassword}</FormControlErrorText>
                        </FormControlError>
                      )}
                    </FormControl>
                  )}

                  {authMode === "login" && (
                    <Pressable onPress={() => setAuthMode("forgot")} alignSelf="flex-end">
                      <Text color="$primary500" fontWeight="$semibold" size="sm">
                        Forgot Password?
                      </Text>
                    </Pressable>
                  )}

                  <Button
                    size="lg"
                    variant="solid"
                    action="primary"
                    isDisabled={isLoading}
                    onPress={handleSubmit}
                    mt="$2"
                  >
                    {isLoading ? (
                      <Spinner color="$white" />
                    ) : (
                      <ButtonText>
                        {authMode === "login" ? "Sign In" : "Create Account"}
                      </ButtonText>
                    )}
                  </Button>
                </VStack>
              </Box>

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
      </LinearGradient>
    </Box>
  );
}
