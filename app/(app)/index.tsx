import React, { useState, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  BadgeText,
  BadgeIcon,
  Button,
  ButtonText,
  ButtonIcon,
  Input,
  InputField,
  Textarea,
  TextareaInput,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
  Alert,
  AlertIcon,
  AlertText,
  Pressable,
  Spinner,
  Icon,
  Center,
} from "@gluestack-ui/themed";
import {
  ArrowRight,
  Lightbulb,
  Sparkles,
  MessageCircle,
  Crown,
  AlertCircle,
  Zap,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useCreateIdea, useUsageSummary } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';

// Categories to choose from
const CATEGORIES = [
  { value: 'BUSINESS', label: 'Business', icon: '💼' },
  { value: 'TECHNOLOGY', label: 'Technology', icon: '💻' },
  { value: 'HEALTH', label: 'Health', icon: '🏥' },
  { value: 'EDUCATION', label: 'Education', icon: '📚' },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎮' },
  { value: 'OTHER', label: 'Other', icon: '🔮' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorMode } = useTheme();
  const createIdea = useCreateIdea();
  const { data: usage, refetch: refetchUsage, isRefetching } = useUsageSummary();
  const toast = useToast();
  const { handleError, logger } = useErrorHandler('HomeScreen');
  const insets = useSafeAreaInsets();

  const isDark = colorMode === 'dark';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'BUSINESS' as any,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    refetchUsage();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a title for your idea';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe your idea';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Please provide more detail about your idea (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setErrors({});
    logger.logUserAction('create_idea_attempt', { category: formData.category });

    try {
      const result = await createIdea.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
      });

      if (result) {
        toast.success('Idea created!', 'Start chatting to refine it');
        router.push(`/(app)/chats/${result.id}`);
        // Clear form
        setFormData({ title: '', description: '', category: 'BUSINESS' });
      }
    } catch (err: any) {
      if (err.message?.includes('quota')) {
        toast.showToast({
          type: 'warning',
          title: 'Quota Exceeded',
          message: "You've reached your free plan limit. Upgrade to Pro for unlimited ideas!",
          action: {
            label: 'Upgrade Now',
            onPress: () => router.push('/(app)/upgrade'),
          },
          duration: 7000,
        });
      } else {
        handleError(err, err.message);
        setErrors({ general: err.message || 'Failed to create idea. Please try again.' });
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Box flex={1}>
      <GradientBackground>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetchUsage} />
          }
        >
          {/* Header with Orb */}
          <Box pt={insets.top + 20} pb="$6" px="$4">
            <HStack justifyContent="space-between" alignItems="center" mb="$6">
              <VStack flex={1}>
                <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"}>
                  {getGreeting()},
                </Text>
                <Heading size="2xl" color={isDark ? "$white" : "$textLight900"}>
                  {user?.name || 'Innovator'}
                </Heading>
              </VStack>

              <HStack space="sm" alignItems="center">
                <AnimatedOrb size={60} icon="lightbulb" />
                {user?.subscriptionPlan === 'PRO' ? (
                  <Pressable
                    onPress={() => router.push('/(app)/profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Pro member - Go to profile"
                  >
                    <Badge action="success" variant="solid" size="md">
                      <BadgeIcon as={Crown} mr="$1" />
                      <BadgeText>Pro</BadgeText>
                    </Badge>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => router.push('/(app)/upgrade')}
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade to Pro"
                  >
                    <Badge action="warning" variant="solid" size="md">
                      <BadgeIcon as={Sparkles} mr="$1" />
                      <BadgeText>Upgrade</BadgeText>
                    </Badge>
                  </Pressable>
                )}
              </HStack>
            </HStack>

            {/* Usage Stats */}
            {user?.subscriptionPlan === 'FREE' && usage && (
              <GlassCard p="$4" mb="$4">
                <HStack space="md" alignItems="center">
                  <Icon as={Zap} size="md" color="$warning500" />
                  <VStack flex={1}>
                    <Text size="sm" fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>
                      Free Plan Usage
                    </Text>
                    <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>
                      {usage.remainingSessions !== null && usage.remainingSessions !== undefined
                        ? `${usage.remainingSessions} idea session${usage.remainingSessions !== 1 ? 's' : ''} remaining`
                        : 'Unlimited sessions'} •
                      {usage.remainingMessages !== null && usage.remainingMessages !== undefined
                        ? ` ${usage.remainingMessages} AI repl${usage.remainingMessages !== 1 ? 'ies' : 'y'} per session`
                        : ' Unlimited replies'}
                    </Text>
                  </VStack>
                </HStack>
              </GlassCard>
            )}

            {user?.subscriptionPlan === 'PRO' && usage && (
              <GlassCard p="$4" mb="$4">
                <HStack space="md" alignItems="center">
                  <Icon as={Crown} size="md" color="$success500" />
                  <VStack flex={1}>
                    <Text size="sm" fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>
                      ✨ Pro Member - Unlimited Ideas & AI Replies
                    </Text>
                    {usage.monthlyTokenUsage > 0 && (
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight600"}>
                        This month: {usage.monthlyTokenUsage.toLocaleString()} tokens used
                        {usage.dailyTokenUsage > 0 && ` (${usage.dailyTokenUsage.toLocaleString()} today)`}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              </GlassCard>
            )}
          </Box>

          <VStack space="lg" px="$4" pb="$6">
            {/* Idea Creation Card */}
            <GlassCard p="$6">
              <VStack space="md">
                <Center mb="$2">
                  <Heading size="xl" textAlign="center" color={isDark ? "$white" : "$textLight900"}>
                    Start Your Idea Journey
                  </Heading>
                  <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"} textAlign="center" mt="$2">
                    Tell us about your concept and get AI-powered suggestions
                  </Text>
                </Center>

                {errors.general && (
                  <Alert action="error" variant="solid">
                    <AlertIcon as={AlertCircle} mr="$3" />
                    <AlertText>{errors.general}</AlertText>
                  </Alert>
                )}

                {/* Title Input */}
                <FormControl isInvalid={!!errors.title}>
                  <FormControlLabel>
                    <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                      Idea Title
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="lg"
                    isDisabled={createIdea.isPending}
                    bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                    borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                  >
                    <InputField
                      placeholder="Give your idea a catchy title..."
                      value={formData.title}
                      onChangeText={(text) => handleInputChange('title', text)}
                      placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                  </Input>
                  {errors.title && (
                    <FormControlError>
                      <FormControlErrorText>{errors.title}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                {/* Category Selection */}
                <FormControl>
                  <FormControlLabel>
                    <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                      Category
                    </FormControlLabelText>
                  </FormControlLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack space="sm">
                      {CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat.value}
                          onPress={() => setFormData({ ...formData, category: cat.value })}
                          disabled={createIdea.isPending}
                        >
                          <Badge
                            variant={formData.category === cat.value ? "solid" : "outline"}
                            action={formData.category === cat.value ? "primary" : "secondary"}
                            size="lg"
                          >
                            <BadgeText>{cat.icon} {cat.label}</BadgeText>
                          </Badge>
                        </Pressable>
                      ))}
                    </HStack>
                  </ScrollView>
                </FormControl>

                {/* Description Textarea */}
                <FormControl isInvalid={!!errors.description}>
                  <FormControlLabel>
                    <FormControlLabelText color={isDark ? "$textDark300" : "$textLight700"}>
                      Description
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Textarea
                    h="$32"
                    size="lg"
                    isDisabled={createIdea.isPending}
                    isInvalid={!!errors.description}
                    bg={isDark ? "rgba(255,255,255,0.05)" : "$white"}
                    borderColor={isDark ? "rgba(255,255,255,0.1)" : "$borderLight300"}
                  >
                    <TextareaInput
                      placeholder="Describe your idea in detail... What problem does it solve? Who is it for?"
                      value={formData.description}
                      onChangeText={(text) => handleInputChange('description', text)}
                      placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                    />
                  </Textarea>
                  {errors.description && (
                    <FormControlError>
                      <FormControlErrorText>{errors.description}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                <Button
                  size="lg"
                  variant="solid"
                  action="primary"
                  isDisabled={!formData.title.trim() || !formData.description.trim() || createIdea.isPending}
                  onPress={handleSubmit}
                  accessibilityRole="button"
                  accessibilityLabel="Refine my idea with AI"
                >
                  {createIdea.isPending ? (
                    <Spinner color="$white" />
                  ) : (
                    <HStack space="sm" alignItems="center">
                      <ButtonIcon as={Sparkles} />
                      <ButtonText>Refine My Idea with AI</ButtonText>
                      <ButtonIcon as={ArrowRight} />
                    </HStack>
                  )}
                </Button>
              </VStack>
            </GlassCard>

            {/* Features Grid */}
            <VStack space="md">
              <Heading size="lg" color={isDark ? "$white" : "$textLight900"}>
                How IdeaSpark Helps You
              </Heading>

              <GlassCard p="$4">
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="$info100"
                    p="$3"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={MessageCircle} size="md" color="$info600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>
                      Interactive AI Chat
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"}>
                      Have a conversation with AI to explore and refine your ideas
                    </Text>
                  </VStack>
                </HStack>
              </GlassCard>

              <GlassCard p="$4">
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="$success100"
                    p="$3"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={Lightbulb} size="md" color="$success600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>
                      Smart Suggestions
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"}>
                      Get personalized recommendations based on your idea category
                    </Text>
                  </VStack>
                </HStack>
              </GlassCard>

              <GlassCard p="$4">
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="$secondary100"
                    p="$3"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={Crown} size="md" color="$secondary600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$semibold" color={isDark ? "$white" : "$textLight900"}>
                      Unlimited with Pro
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark400" : "$textLight500"}>
                      Upgrade to Pro for unlimited ideas and AI conversations
                    </Text>
                  </VStack>
                </HStack>
              </GlassCard>
            </VStack>
          </VStack>
        </ScrollView>
      </GradientBackground>
    </Box>
  );
}
