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
  TrendingUp,
  Target,
  Rocket,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { useTheme } from '@/contexts/ThemeContext';
import { useCreateIdea, useUsageSummary } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GlassCard, AnimatedOrb } from '@/components/ui';

// Enhanced Categories with colors
const CATEGORIES = [
  { value: 'BUSINESS', label: 'Business', icon: '💼', color: '#8B5CF6' },
  { value: 'TECHNOLOGY', label: 'Technology', icon: '💻', color: '#3B82F6' },
  { value: 'HEALTH', label: 'Health', icon: '🏥', color: '#10B981' },
  { value: 'EDUCATION', label: 'Education', icon: '📚', color: '#F59E0B' },
  { value: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎮', color: '#EC4899' },
  { value: 'OTHER', label: 'Other', icon: '🔮', color: '#6366F1' },
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
          {/* Enhanced Header with Orb */}
          <Box pt={insets.top + 24} pb="$8" px="$5">
            <HStack justifyContent="space-between" alignItems="flex-start" mb="$8">
              <VStack flex={1} space="xs">
                <Text size="md" color={isDark ? "$textDark400" : "$textLight500"} fontWeight="$medium">
                  {getGreeting()},
                </Text>
                <Heading size="3xl" color={isDark ? "$white" : "$textLight900"} lineHeight="$3xl">
                  {user?.name || 'Innovator'}
                </Heading>
              </VStack>

              <HStack space="md" alignItems="center">
                <AnimatedOrb size={70} icon="lightbulb" />
                {user?.subscriptionPlan === 'PRO' ? (
                  <Pressable
                    onPress={() => router.push('/(app)/profile')}
                    accessibilityRole="button"
                    accessibilityLabel="Pro member - Go to profile"
                  >
                    <Box
                      bg="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                      px="$4"
                      py="$2"
                      borderRadius="$full"
                      shadowColor="$success600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.3}
                      shadowRadius={8}
                    >
                      <HStack space="xs" alignItems="center">
                        <Icon as={Crown} size="sm" color="$white" />
                        <Text color="$white" fontWeight="$bold" fontSize="$sm">Pro</Text>
                      </HStack>
                    </Box>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => router.push('/(app)/upgrade')}
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade to Pro"
                  >
                    <Box
                      bg="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                      px="$4"
                      py="$2"
                      borderRadius="$full"
                      shadowColor="$warning600"
                      shadowOffset={{ width: 0, height: 4 }}
                      shadowOpacity={0.3}
                      shadowRadius={8}
                    >
                      <HStack space="xs" alignItems="center">
                        <Icon as={Sparkles} size="sm" color="$white" />
                        <Text color="$white" fontWeight="$bold" fontSize="$sm">Upgrade</Text>
                      </HStack>
                    </Box>
                  </Pressable>
                )}
              </HStack>
            </HStack>

            {/* Enhanced Usage Stats */}
            {user?.subscriptionPlan === 'FREE' && usage && (
              <GlassCard p="$5" mb="$6" opacity={0.1}>
                <HStack space="md" alignItems="center">
                  <Box
                    bg="rgba(245, 158, 11, 0.2)"
                    p="$3"
                    borderRadius="$full"
                  >
                    <Icon as={Zap} size="xl" color="$warning500" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
                      Free Plan Usage
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark300" : "$textLight600"} lineHeight="$sm">
                      {usage.remainingSessions !== null && usage.remainingSessions !== undefined
                        ? `${usage.remainingSessions} idea session${usage.remainingSessions !== 1 ? 's' : ''} left`
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
              <GlassCard p="$5" mb="$6" opacity={0.1}>
                <HStack space="md" alignItems="center">
                  <Box
                    bg="rgba(16, 185, 129, 0.2)"
                    p="$3"
                    borderRadius="$full"
                  >
                    <Icon as={Crown} size="xl" color="$success500" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text size="lg" fontWeight="$bold" color={isDark ? "$white" : "$textLight900"}>
                      ✨ Pro Member Benefits
                    </Text>
                    <Text size="sm" color={isDark ? "$textDark300" : "$textLight600"}>
                      Unlimited Ideas & AI Replies
                    </Text>
                    {usage.monthlyTokenUsage > 0 && (
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight500"}>
                        This month: {usage.monthlyTokenUsage.toLocaleString()} tokens used
                        {usage.dailyTokenUsage > 0 && ` (${usage.dailyTokenUsage.toLocaleString()} today)`}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              </GlassCard>
            )}
          </Box>

          <VStack space="xl" px="$5" pb="$8">
            {/* Enhanced Idea Creation Card */}
            <GlassCard p="$8" opacity={isDark ? 0.08 : 0.95}>
              <VStack space="xl">
                <Center mb="$2">
                  <Heading size="2xl" textAlign="center" color={isDark ? "$white" : "$textLight900"} lineHeight="$2xl">
                    Spark Your Next Big Idea
                  </Heading>
                  <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} textAlign="center" mt="$3" lineHeight="$md" px="$2">
                    Describe your concept and let AI help you refine it into something amazing
                  </Text>
                </Center>

                {errors.general && (
                  <Alert action="error" variant="solid">
                    <AlertIcon as={AlertCircle} mr="$3" />
                    <AlertText>{errors.general}</AlertText>
                  </Alert>
                )}

                {/* Enhanced Title Input */}
                <FormControl isInvalid={!!errors.title}>
                  <FormControlLabel mb="$2">
                    <FormControlLabelText 
                      color={isDark ? "$textDark200" : "$textLight800"}
                      fontWeight="$semibold"
                      size="md"
                    >
                      Idea Title
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    variant="outline"
                    size="xl"
                    isDisabled={createIdea.isPending}
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
                  >
                    <InputField
                      placeholder="Give your idea a catchy title..."
                      value={formData.title}
                      onChangeText={(text) => handleInputChange('title', text)}
                      placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                      fontSize="$md"
                      fontWeight="$medium"
                    />
                  </Input>
                  {errors.title && (
                    <FormControlError mt="$2">
                      <FormControlErrorText fontSize="$sm">{errors.title}</FormControlErrorText>
                    </FormControlError>
                  )}
                </FormControl>

                {/* Enhanced Category Selection */}
                <FormControl>
                  <FormControlLabel mb="$3">
                    <FormControlLabelText 
                      color={isDark ? "$textDark200" : "$textLight800"}
                      fontWeight="$semibold"
                      size="md"
                    >
                      Category
                    </FormControlLabelText>
                  </FormControlLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <HStack space="md">
                      {CATEGORIES.map((cat) => {
                        const isSelected = formData.category === cat.value;
                        return (
                          <Pressable
                            key={cat.value}
                            onPress={() => setFormData({ ...formData, category: cat.value })}
                            disabled={createIdea.isPending}
                          >
                            <Box
                              bg={isSelected 
                                ? (isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.15)")
                                : (isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)")
                              }
                              borderWidth={2}
                              borderColor={isSelected ? "$primary500" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")}
                              px="$5"
                              py="$3"
                              borderRadius="$full"
                              shadowColor={isSelected ? "$primary500" : "$black"}
                              shadowOffset={{ width: 0, height: isSelected ? 4 : 2 }}
                              shadowOpacity={isSelected ? 0.3 : 0.1}
                              shadowRadius={isSelected ? 8 : 4}
                              sx={{
                                ':active': {
                                  transform: [{ scale: 0.95 }]
                                }
                              }}
                            >
                              <HStack space="xs" alignItems="center">
                                <Text fontSize="$xl">{cat.icon}</Text>
                                <Text 
                                  color={isSelected ? "$primary600" : (isDark ? "$textDark200" : "$textLight800")}
                                  fontWeight={isSelected ? "$bold" : "$semibold"}
                                  fontSize="$md"
                                >
                                  {cat.label}
                                </Text>
                              </HStack>
                            </Box>
                          </Pressable>
                        );
                      })}
                    </HStack>
                  </ScrollView>
                </FormControl>

                {/* Enhanced Description Textarea */}
                <FormControl isInvalid={!!errors.description}>
                  <FormControlLabel mb="$2">
                    <FormControlLabelText 
                      color={isDark ? "$textDark200" : "$textLight800"}
                      fontWeight="$semibold"
                      size="md"
                    >
                      Description
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Textarea
                    h="$40"
                    size="lg"
                    isDisabled={createIdea.isPending}
                    isInvalid={!!errors.description}
                    bg={isDark ? "rgba(255,255,255,0.08)" : "$white"}
                    borderColor={isDark ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.2)"}
                    borderWidth={2}
                    sx={{
                      ':focus': {
                        borderColor: '$primary500',
                        shadowColor: '$primary500',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                      }
                    }}
                  >
                    <TextareaInput
                      placeholder="Describe your idea in detail... What problem does it solve? Who is it for? What makes it unique?"
                      value={formData.description}
                      onChangeText={(text) => handleInputChange('description', text)}
                      placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                      fontSize="$md"
                      lineHeight="$lg"
                    />
                  </Textarea>
                  <HStack justifyContent="space-between" mt="$2">
                    {errors.description ? (
                      <FormControlError flex={1}>
                        <FormControlErrorText fontSize="$sm">{errors.description}</FormControlErrorText>
                      </FormControlError>
                    ) : (
                      <Text size="xs" color={isDark ? "$textDark400" : "$textLight500"}>
                        {formData.description.length} characters (min 10)
                      </Text>
                    )}
                  </HStack>
                </FormControl>

                {/* Enhanced CTA Button */}
                <Box mt="$2">
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!formData.title.trim() || !formData.description.trim() || createIdea.isPending}
                    accessibilityRole="button"
                    accessibilityLabel="Refine my idea with AI"
                  >
                    <Box
                      bg={(!formData.title.trim() || !formData.description.trim() || createIdea.isPending) 
                        ? "$coolGray400" 
                        : "$primary600"
                      }
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
                      {createIdea.isPending ? (
                        <Spinner color="$white" size="large" />
                      ) : (
                        <HStack space="sm" alignItems="center">
                          <Icon as={Sparkles} size="lg" color="$white" />
                          <ButtonText color="$white" fontWeight="$bold" fontSize="$lg">
                            Refine My Idea with AI
                          </ButtonText>
                          <Icon as={ArrowRight} size="lg" color="$white" />
                        </HStack>
                      )}
                    </Box>
                  </Pressable>
                </Box>
              </VStack>
            </GlassCard>

            {/* Enhanced Features Grid */}
            <VStack space="lg">
              <Heading size="xl" color={isDark ? "$white" : "$textLight900"} px="$1">
                How IdeaSpark Helps You
              </Heading>

              <GlassCard p="$5" opacity={0.08}>
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="rgba(59, 130, 246, 0.2)"
                    p="$4"
                    borderRadius="$2xl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={MessageCircle} size="xl" color="$info600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                      Interactive AI Chat
                    </Text>
                    <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} lineHeight="$md">
                      Have a conversation with AI to explore and refine your ideas
                    </Text>
                  </VStack>
                </HStack>
              </GlassCard>

              <GlassCard p="$5" opacity={0.08}>
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="rgba(16, 185, 129, 0.2)"
                    p="$4"
                    borderRadius="$2xl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={Target} size="xl" color="$success600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                      Smart Suggestions
                    </Text>
                    <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} lineHeight="$md">
                      Get personalized recommendations based on your idea category
                    </Text>
                  </VStack>
                </HStack>
              </GlassCard>

              <GlassCard p="$5" opacity={0.08}>
                <HStack space="md" alignItems="flex-start">
                  <Box
                    bg="rgba(245, 158, 11, 0.2)"
                    p="$4"
                    borderRadius="$2xl"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon as={Rocket} size="xl" color="$warning600" />
                  </Box>
                  <VStack flex={1} space="xs">
                    <Text fontWeight="$bold" size="lg" color={isDark ? "$white" : "$textLight900"}>
                      Unlimited with Pro
                    </Text>
                    <Text size="md" color={isDark ? "$textDark300" : "$textLight600"} lineHeight="$md">
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
